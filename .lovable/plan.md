## Contexto

O e-mail do Google avisa sobre mudanças na API do Google Chat a partir de **29/mai/2026** que afetam:

1. `GetMembership` / `ListMemberships` podem retornar **"Permission Denied"** ou **lista vazia** quando o admin do espaço restringe a visibilidade de participantes.
2. Eventos de membership da Events API serão suprimidos.
3. Novo campo `accessSettings.accessPermissionSettings` (descobrir / participar / ver participantes separados).
4. Apps instalados com escopo `chat.app` (admin-approved) **não são afetados**.

## Como o app usa o Chat hoje

Mapeei toda a integração GChat no projeto. Resumindo:

- **`spaces:setup`** (criar/achar DM) → **continua funcionando** sem mudança. É o caminho principal de `sendGChatDM`.
- **`spaces.list` + `{space}/members` (ListMemberships)** → usado **apenas como fallback** em `gchat-auth.ts` quando `spaces:setup` falha, para casar e-mail do destinatário. **Este é o único ponto sensível.**
- **Webhook inbound, envio de cards, daily digest, notificações de OC** → não dependem de listar membros.
- **Não usamos** `GetMembership` direto, nem Events API de membership, nem `accessSettings`.

## Risco real

**Baixo.** O fluxo principal (`spaces:setup` para DM com e-mail corporativo) não é afetado. O fallback de listagem pode passar a devolver lista vazia para alguns espaços — hoje ele já trata `!res.ok` retornando `null`, mas **não trata explicitamente o caso "200 OK com `memberships: []`"** que vai se tornar comum.

## Plano de ajuste (mínimo e defensivo)

### 1. `supabase/functions/_shared/gchat-auth.ts` — endurecer fallback

- Em `getSpaceMemberInfo`: tratar resposta vazia (`memberships: []` ou `permission denied`) como **"sem informação"** sem logar erro ruidoso, retornando o objeto `{ email: null, ... }` atual. Adicionar log `info` claro do tipo `"membership hidden by space settings"` para diferenciar de erro real (HTTP 403 com corpo `PERMISSION_DENIED`).
- Em `sendGChatDM`: quando o fallback `spaces.list` não conseguir casar nenhum membro **e** `spaces:setup` tiver falhado, lançar erro mais explicativo orientando a tentar reinstalar o app no DM ou conferir as novas permissões do espaço.

### 2. `supabase/functions/_shared/gchat-auth.ts` — preferir SEMPRE `spaces:setup`

Hoje o fallback `listBotDMSpaces + getSpaceMemberInfo` roda quando `spaces:setup` retorna não-OK. A partir da mudança, esse fallback fica menos confiável. Vamos:

- Diferenciar falhas de `spaces:setup`: se for `404 NOT_FOUND` (usuário não tem o app instalado), pular o fallback de listagem (não vai resolver mesmo) e retornar erro claro.
- Manter o fallback apenas para erros transitórios (5xx, rate limit).

### 3. Documentação interna

- Atualizar `supabase/functions/README_GCHAT.md` com um aviso sobre a mudança de 29/mai/2026 e a recomendação de manter o app instalado com escopo `chat.bot` (não precisa migrar para `chat.app`, mas ficar atento se algum domínio restringir).
- Atualizar memória `mem://integrations/gchat-dm` registrando que `ListMemberships` agora pode vir vazio por configuração de visibilidade do espaço.

### 4. O que NÃO precisa mudar

- Envio de cards / mensagens em espaços: inalterado.
- Webhook inbound: inalterado.
- `accessSettings.accessPermissionSettings`: **não usamos** — só seria necessário se o app criasse espaços públicos com permissões granulares, que não é nosso caso.
- Events API: **não usamos** eventos de membership.

## Detalhes técnicos

```text
sendGChatDM(email)
├─ spaces:setup (DIRECT_MESSAGE)        ← caminho principal, sem impacto
│  └─ ok? → envia mensagem
├─ se 404/403 → erro explícito "app não instalado p/ usuário"
└─ se 5xx → fallback listBotDMSpaces
   └─ getSpaceMemberInfo (ListMemberships)  ← pode vir vazio após 29/mai
      └─ tratar vazio como "não encontrado" sem erro ruidoso
```

Esforço estimado: **~20 minutos**, 1 arquivo de código + 1 doc + 1 memória.

## Estimativa de impacto se não fizermos nada

- DMs novas via `spaces:setup`: continuam funcionando.
- DMs via fallback (raro): podem falhar silenciosamente em alguns espaços com visibilidade restrita.
- Logs podem encher de "permission denied" sem contexto.

**Recomendação: aplicar os ajustes defensivos antes de 29/mai/2026.** Sem urgência imediata.
