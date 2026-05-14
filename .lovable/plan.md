## Objetivo

Hoje, mesmo no modo "Por Empreendimento", apenas o dono da solicitação consegue executar ações (aceitar OC, enviar NF/boleto, corrigir, responder informações, dar ciência). Quando essa pessoa entra de férias, a solicitação trava.

A nova feature libera **qualquer usuário com acesso ao empreendimento da solicitação** para executar essas ações em nome do solicitante original — sem alterar o `user_id` (autoria) e registrando quem agiu no histórico/timeline.

## Escopo

**Ações liberadas para colegas do mesmo empreendimento:**
- Aceitar/recusar OC ou AC (`aguardando_aceite` → `liberado_fornecedor` / `recebido`)
- Enviar NF/Boleto (`aguardando_nf_boleto` → `aguardando_execucao` / próximo passo)
- Corrigir solicitação devolvida (`pendente_correcao`)
- Responder pedido de informações (`aguardando_informacoes`)
- Dar ciência em finalizadas / canceladas
- Editar Projuris (campo livre)

**Fora de escopo nesta feature:**
- Cancelar solicitação alheia (continua restrito ao dono)
- Excluir/transferir titularidade (continua admin/backoffice)
- Criar nova solicitação em nome de terceiros

## Como funciona

```text
┌─ Solicitação criada por: Amanda (Mega Itajaí) ───────┐
│  Status: Aguardando Aceite OC                         │
│  → Amanda de férias                                   │
│  → Daniel (também Mega Itajaí) abre "Por Empreend."   │
│  → Vê botão "Aceitar OC" habilitado                   │
│  → Clica, aceita; histórico registra:                 │
│    "OC aceita por Daniel em nome de Amanda"           │
└───────────────────────────────────────────────────────┘
```

O card mostrará um aviso discreto quando o usuário estiver agindo em nome de outro: "Você está agindo em nome de Amanda Alexandre".

## Mudanças técnicas

### 1. RLS no Postgres (migration)

Estender as policies de UPDATE em `public.solicitacoes` para aceitar a regra "mesmo empreendimento" nos status acionáveis. Hoje só existe para `pendente_correcao` e `aguardando_informacoes` (`Users can update solicitacoes from their empreendimento`). Adicionar policies análogas usando `user_can_access_solicitacao(id)` para:
- `aguardando_aceite` (aceitar/recusar OC)
- `aguardando_nf_boleto` (enviar NF)
- `aguardando_execucao` (confirmar execução, se aplicável)
- finalização/ciência

Manter as policies existentes de "own" intactas (não quebra nada).

Verificar/ajustar policies análogas em tabelas dependentes para que o colega consiga gravar:
- `solicitacao_anexos` (INSERT) — permitir quando `user_can_access_solicitacao(solicitacao_id)`
- `solicitacao_mensagens` / respostas de informações — mesma regra
- `solicitacao_historico` — INSERT já é feito por trigger/edge, validar

### 2. Frontend

**`SolicitanteSolicitacaoCard.tsx`**
- Remover gating `canTakeAction = isOwner`. Substituir por `canTakeAction = isOwner || (viewMode === 'empreendimento' && userHasEmpreendimento)`.
- Quando `!isOwner` e ação disponível: exibir banner discreto "Agindo em nome de {nome do solicitante}".
- Manter `Cancelar` restrito ao dono.

**`SolicitanteTable.tsx`**
- Habilitar botões de pendência (Aceitar OC, Enviar NF, Corrigir, Responder) também quando a linha pertencer a outro usuário do mesmo empreendimento. Hoje os botões já aparecem; garantir que os handlers funcionem nesse caso.

**`MinhasSolicitacoes.tsx`**
- Passar a flag de "pode agir em nome de" para os modais (`AceiteOC`, `NfBoleto`, `Edit`, `Responder`).
- Nas chamadas de update, **não** sobrescrever `user_id`. Adicionar campo `acted_by = auth.uid()` no payload do histórico.

**Modais (`SolicitanteModals.tsx`)**
- Mostrar título contextual: "Aceitar OC — em nome de Amanda" quando aplicável.
- Em uploads (NF/boleto), o storage path continua usando `sol.user_id` (dono); apenas o `uploaded_by` no metadata vira `auth.uid()`.

### 3. Auditoria

Em cada ação, gravar entrada em `solicitacao_historico` com:
- `acted_by_user_id = auth.uid()`
- `on_behalf_of_user_id = sol.user_id` quando diferente
- texto: "Aceitou OC em nome de {nome}" / "Enviou NF em nome de {nome}" etc.

Se a tabela ainda não tiver `acted_by_user_id`, adicionar coluna nullable na mesma migration.

### 4. Notificações

- Notificar **o dono** quando alguém agir em nome dele ("Daniel aceitou a OC #2026000446 em seu nome").
- Continuar notificando backoffice como hoje.

## Pontos de atenção

- A regra usa `user_can_access_solicitacao(id)`, que já considera `user_empreendimentos` e o flag `todos`. Usuários "todos" continuarão podendo agir em qualquer solicitação — comportamento desejado.
- `canViewEmpreendimentoLivre` (registros com empreendimento como string livre) não é afetado; ações são apenas em `solicitacoes` da app.
- Testes E2E novos: colega do mesmo empreendimento aceita OC; colega de outro empreendimento recebe 403/RLS deny.

## Perguntas para confirmar antes de implementar

1. Cancelar solicitação alheia — manter restrito ao dono, certo? (recomendação: sim)
2. Para Editar campos da solicitação durante `pendente_correcao`/`aguardando_informacoes`, o colega já pode (RLS existe). Confirma que mantém?
3. Quer banner visível no card "Agindo em nome de X" ou prefere apenas registrar no histórico, sem sinalização visual?
