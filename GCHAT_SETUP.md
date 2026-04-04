# Google Chat Webhook Setup

## Como configurar o webhook do Google Chat

### 1. Criar um Space no Google Chat

1. Acesse [Google Chat](https://chat.google.com)
2. Clique em "Criar um novo espaço"
3. Escolha um nome (ex: "BA Chamados - Notificações")
4. Defina como privado se necessário

### 2. Criar um Webhook

1. No Google Chat, abra o space criado
2. Clique nos 3 pontos (menu) → "Apps e integrações"
3. Procure por "Incoming Webhook" ou "Webhook de entrada"
4. Clique em "Criar novo webhook"
5. Dê um nome (ex: "BA Chamados - Daily Digest")
6. Copie a URL gerada

### 3. Configurar no projeto

A URL seguirá este padrão:
```
https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN
```

#### Localmente (.env local)
```env
GCHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/YOUR_SPACE_ID/messages?key=YOUR_KEY&token=YOUR_TOKEN
```

#### Em produção (Supabase Secrets)
```bash
supabase secrets set GCHAT_WEBHOOK_URL "https://chat.googleapis.com/v1/spaces/YOUR_SPACE_ID/messages?key=YOUR_KEY&token=YOUR_TOKEN"
```

### 4. Testar

#### Via admin panel
1. Vá para a aba "Admin" → "Canais"
2. Clique em "Enviar Resumo Agora"
3. Verifique o space no Google Chat

#### Via terminal
```bash
supabase functions serve gchat-daily-digest
# Em outro terminal:
curl -X POST http://localhost:54321/functions/v1/gchat-daily-digest \
  -H "Content-Type: application/json" \
  -d '{"time": "manual"}'
```

## Agendamento Automático

O agendamento é feito via PostgreSQL CRON jobs (pg_cron):

- **09:00 BRT** - Bom dia (estatísticas da manhã)
- **13:00 BRT** - Atualização da tarde
- **18:00 BRT** - Fechamento do dia

Todos em dias úteis (segunda a sexta).

Para gerenciar os jobs:
```sql
-- Ver jobs agendados
SELECT * FROM cron.job;

-- Remover um job se necessário
SELECT cron.unschedule('gchat-daily-digest-morning');
```

## Troubleshooting

### Webhook retorna 404
- Verifique se a URL está correta
- Confirme se o SPACE_ID é válido

### Webhook retorna 401/403
- Token pode ter expirado
- Recrie o webhook e atualize a URL

### Cron job não está funcionando
- Verifique se pg_cron está habilitado: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- Verifique os logs da função: `supabase functions logs gchat-daily-digest`
- Confirme que GCHAT_WEBHOOK_URL está configurado nos secrets

## Referências

- [Google Chat Webhooks API](https://developers.google.com/chat/api/guides/webhooks)
- [Google Chat Card Format v2](https://developers.google.com/chat/api/reference/rest/v1/cards)
- [PostgreSQL pg_cron](https://www.postgresql.org/docs/current/contrib-postgres-contrib.html#id1.11.53.41)
