## ⚠️ Mudança Google Chat — 29/mai/2026

A partir de 29/mai/2026, admins de espaços podem restringir a visibilidade de participantes:

- `GetMembership` pode retornar `403 PERMISSION_DENIED`.
- `ListMemberships` pode retornar `200 OK` com lista vazia (`memberships: []`).
- Eventos de membership da Events API serão suprimidos.

**Impacto neste projeto:** baixo. Usamos `spaces:setup` (não afetado) como caminho principal em `sendGChatDM`. O fallback baseado em `ListMemberships` foi endurecido em `gchat-auth.ts` para tratar respostas vazias/permission-denied silenciosamente e diferenciar 404 (usuário não instalou o bot) de erros transitórios.

**Não usamos** `accessSettings.accessPermissionSettings` nem Events API de membership — não há ação adicional necessária.

# Google Chat Integration

Este diretório contém as funções e helpers para integração com Google Chat.

## 📁 Estrutura

- `gchat-daily-digest/` - Função que envia resumo diário (09:00, 13:00, 18:00)
- `_shared/gchat-helpers.ts` - Helpers para construir mensagens
- `_shared/gchat-notifications.ts` - Exemplos de notificações em tempo real
- `_shared/types.ts` - Tipos TypeScript para Google Chat API

## 🚀 Como Usar

### 1. Enviar Resumo Diário

A função `gchat-daily-digest` é agendada automaticamente 3x ao dia via cron jobs PostgreSQL.

Para disparar manualmente:

```typescript
import { supabase } from '@/integrations/supabase/client'

const { data, error } = await supabase.functions.invoke('gchat-daily-digest', {
  body: { time: 'manual' }
})
```

### 2. Enviar Notificação Customizada

Use os helpers para criar notificações personalizadas:

```typescript
import { sendGChatMessage, buildCard, createDecoratedTextWidget } from './_shared/gchat-helpers.ts'

const webhookUrl = Deno.env.get('GCHAT_WEBHOOK_URL')

const widgets = [
  createDecoratedTextWidget({
    topLabel: 'Status',
    text: '<b>Aprovado</b>',
    icon: 'CHECK_CIRCLE'
  })
]

const message = buildCard(
  'Título da Mensagem',
  'Subtítulo',
  [{ widgets }]
)

await sendGChatMessage(webhookUrl, message)
```

### 3. Usar Notificações PRÉ-CONSTRUÍDAS

```typescript
import { 
  notifyOCIssued,
  notifyCorrectionsRequested,
  notifySLAAlert
} from './_shared/gchat-notifications.ts'

// Notificar quando OC é emitida
await notifyOCIssued({
  protocolo: 'SO-2026-001',
  cliente: 'Cliente X',
  fornecedor: 'Fornecedor Y',
  valor: 10000,
  status: 'oc_ac_emitida',
  empreendimento: 'Mega Curitiba'
}, webhookUrl)
```

## 📊 Tipos Disponíveis

Todos os tipos TypeScript para Google Chat API estão em `_shared/types.ts`:

- `GChatMessage` - Estrutura completa da mensagem
- `GChatCard` - Estrutura de card v2
- `GChatWidget` - Componentes da interface
- `GChatSection` - Seções do card
- `GChatStats` - Estatísticas
- `GChatResponse` - Respostas da API

## 🔧 Configuração

### Variáveis de Ambiente

```env
GCHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN
```

### Supabase Config

A função deve estar configurada em `supabase/config.toml`:

```toml
[functions.gchat-daily-digest]
verify_jwt = false
```

### Agendamento CRON

Os jobs estão definidos em uma migration:

```sql
-- 09:00 BRT
SELECT cron.schedule('gchat-daily-digest-morning', '0 6 * * 1-5', ...)

-- 13:00 BRT
SELECT cron.schedule('gchat-daily-digest-afternoon', '0 10 * * 1-5', ...)

-- 18:00 BRT
SELECT cron.schedule('gchat-daily-digest-evening', '0 15 * * 1-5', ...)
```

## ✅ Teste Local

### Bash
```bash
export GCHAT_WEBHOOK_URL="your_webhook_url"
./test-gchat.sh
```

### PowerShell
```powershell
$env:GCHAT_WEBHOOK_URL = "your_webhook_url"
.\test-gchat.ps1
```

### Curl
```bash
curl -X POST http://localhost:54321/functions/v1/gchat-daily-digest \
  -H "Content-Type: application/json" \
  -d '{"time": "manual"}'
```

## Deploy e diagnostico

### 1. Ver a versao do card nos logs

Depois de disparar `gchat-daily-digest`, procure por estas entradas:

- `GCHAT_DAILY_DIGEST_PAYLOAD`
- `GCHAT_DAILY_DIGEST_SENT`

Elas incluem:

- `cardVersion`
- `triggerType`
- `header`
- `sectionHeaders`

Se os logs nao mostrarem `gchat-daily-digest-v2-compat-2026-04-04`, a funcao em producao ainda nao recebeu esta versao.

### 2. Ver logs da Edge Function

```bash
supabase functions logs gchat-daily-digest --project-ref wcxybuietfmaaqzmcmnq
```

### 3. Deploy manual das funcoes de Google Chat

O repositorio nao tem automacao visivel para `supabase functions deploy`, entao trate o deploy como manual.

```bash
supabase functions deploy gchat-daily-digest --project-ref wcxybuietfmaaqzmcmnq
supabase functions deploy gchat-notify-oc --project-ref wcxybuietfmaaqzmcmnq
```

### 4. Fluxo recomendado para validar drift

1. Fazer deploy de `gchat-daily-digest`.
2. Disparar manualmente pelo painel Admin.
3. Conferir no Google Chat se o subtitulo tem data e hora.
4. Conferir nos logs se `cardVersion` bate com a versao do repositorio.
5. Se necessario, repetir o mesmo fluxo para `gchat-notify-oc`.

## 📚 Referências

- [Google Chat Webhooks API](https://developers.google.com/chat/api/guides/webhooks)
- [Google Chat Cards v2](https://developers.google.com/chat/api/reference/rest/v1/cards)
- [PostgreSQL pg_cron](https://www.postgresql.org/docs/current/contrib-postgres-contrib.html)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## 🐛 Troubleshooting

**Mensagem não chegou?**
1. Verifique se `GCHAT_WEBHOOK_URL` está configurado
2. Confirme se o webhook é valido (testar com curl)
3. Veja logs: `supabase functions logs gchat-daily-digest --project-ref wcxybuietfmaaqzmcmnq`

**Cron job não rodou?**
1. Verifique se pg_cron está habilitado
2. Confirme o timezone configurado no database
3. Valide a expressão CRON

**Card não está bem formatado?**
1. Use o Google Chat Card Builder: https://developers.google.com/chat/api/guides/message-formats/cards
2. Valide o JSON da mensagem
3. Verifique a `cardVersion` registrada nos logs para confirmar que o deploy certo esta rodando
4. Prefira hierarquia visual em `textParagraph`, `decoratedText` e `buttonList`; nao dependa de `font size` como parte critica do layout

## ✅ Checklist de validação em produção (2026-04-04)

Use este procedimento para validar os 4 pontos do `gchat-daily-digest`:

1. **Cron aponta para a mesma função e projeto de produção**
   - Base: `supabase/migrations/20260404120000_gchat-daily-digest-schedule.sql`
   - Recriação idempotente: `supabase/migrations/20260404131500_gchat-daily-digest-reschedule-idempotent.sql`
   - Esperado:
     - URL: `https://wcxybuietfmaaqzmcmnq.supabase.co/functions/v1/gchat-daily-digest`
     - Triggers: `scheduled-morning`, `scheduled-afternoon`, `scheduled-evening`

2. **Webhook de produção (`GCHAT_WEBHOOK_URL`) usa o Space esperado**
   - Conferir no painel: **Project Settings → Edge Functions → Secrets**.
   - O formato esperado é `https://chat.googleapis.com/v1/spaces/<SPACE_ID>/messages?...`.

3. **Comparar logs por `triggerType`**
   - Validar estes caminhos:
     - `manual`
     - `scheduled-morning`
     - `scheduled-afternoon`
     - `scheduled-evening`
   - Todos devem reportar a mesma `cardVersion`.

4. **Se houver trigger em versão antiga**
   - Reaplicar/recriar os jobs com a migration idempotente acima.
   - Fazer redeploy:
     ```bash
     supabase functions deploy gchat-daily-digest --project-ref wcxybuietfmaaqzmcmnq
     ```
   - Reexecutar os 4 gatilhos e confirmar unificação da `cardVersion`.
