

## Migração Google Chat: Webhook → API Autenticada (Service Account)

### O que muda

Atualmente todas as mensagens são enviadas via webhook URL. Vamos migrar para a **Google Chat API autenticada** usando a Service Account que você já criou, permitindo envio programático para qualquer Space e futuramente interatividade (bot).

### Passo 1 — Armazenar credenciais como secrets

Dois novos secrets no projeto:
- **`GCHAT_SERVICE_ACCOUNT_JSON`** — JSON completo da chave da service account (contém `client_email`, `private_key`, `project_id`)
- **`GCHAT_SPACE_NAME`** — nome do Space (ex: `spaces/AAQAdpI7TfI`)

O `GCHAT_WEBHOOK_URL` existente será mantido temporariamente como fallback.

### Passo 2 — Criar helper de autenticação

Novo arquivo **`supabase/functions/_shared/gchat-auth.ts`**:
- Gera JWT assinado com RS256 usando a `private_key` da service account
- Scope: `https://www.googleapis.com/auth/chat.bot`
- Troca JWT por access token via `https://oauth2.googleapis.com/token`
- Função `sendAuthenticatedGChatMessage(spaceName, message)` que usa o token para `POST https://chat.googleapis.com/v1/{space}/messages`
- Cache do token em memória (válido ~1h)

### Passo 3 — Criar função de teste `gchat-send-test`

Nova edge function **`supabase/functions/gchat-send-test/index.ts`**:
- Envia mensagem simples: `"✅ Teste API autenticada — BA Chamados"`
- Depois envia um card v2 de teste
- Retorna resultado detalhado (success/error, response status)
- Botão no Admin para disparar

### Passo 4 — Migrar `gchat-daily-digest`

Alterar para usar `sendAuthenticatedGChatMessage` em vez de `sendGChatMessage` (webhook):
- Importar de `gchat-auth.ts`
- Usar `GCHAT_SPACE_NAME` + `GCHAT_SERVICE_ACCOUNT_JSON`
- Fallback para webhook se service account não configurada

### Passo 5 — Migrar `gchat-notify-oc`

Mesma migração:
- Substituir `fetch(webhookUrl, ...)` por `sendAuthenticatedGChatMessage`
- Manter fallback para webhook

### Passo 6 — Atualizar Admin UI

Em `WhatsAppAdminTab.tsx`:
- Adicionar botão "Testar API" que invoca `gchat-send-test`
- Mostrar modo atual (Webhook vs API Autenticada)
- Indicar se `GCHAT_SERVICE_ACCOUNT_JSON` está configurado

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/_shared/gchat-auth.ts` | **Novo** — JWT signing + token exchange + send |
| `supabase/functions/gchat-send-test/index.ts` | **Novo** — função de teste |
| `supabase/functions/_shared/gchat-helpers.ts` | Manter (cards builders reutilizados) |
| `supabase/functions/gchat-daily-digest/index.ts` | Migrar para API autenticada |
| `supabase/functions/gchat-notify-oc/index.ts` | Migrar para API autenticada |
| `src/components/admin/WhatsAppAdminTab.tsx` | Botão teste + status API |

### Detalhes técnicos — JWT com Service Account (Deno)

```text
1. Parse GCHAT_SERVICE_ACCOUNT_JSON
2. Criar JWT header: {"alg":"RS256","typ":"JWT"}
3. Payload: {iss: client_email, scope: "chat.bot", aud: "oauth2.googleapis.com/token", iat, exp: iat+3600}
4. Assinar com crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, data)
5. POST oauth2.googleapis.com/token → access_token
6. POST chat.googleapis.com/v1/{space}/messages com Bearer token
```

A assinatura RS256 no Deno usa `crypto.subtle` nativo (importKey PEM → sign). Não precisa de dependência externa.

