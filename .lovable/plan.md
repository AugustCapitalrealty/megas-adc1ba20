

## Integração WhatsApp via Whatsmiau — Resumo Diário

### Objetivo
Criar uma edge function que envia um resumo diário das solicitações via WhatsApp usando a API Whatsmiau, para o número `5541998749629` vinculado ao usuário `guilherme.marques@capitalrealty.com.br`.

### Passo 1 — Armazenar a API Key como secret
Salvar `WHATSMIAU_API_KEY` com valor `15755252-923c-45c9-aaa7-85bb5c6af233` como secret do projeto.

### Passo 2 — Criar/Conectar instância Whatsmiau
Antes de enviar mensagens, precisamos de uma instância conectada. A edge function vai:
1. Listar instâncias existentes via `GET /evolution/instances`
2. Se não houver, criar uma via `POST /evolution/instance/create` com `instanceName: "BAChamados"` e `qrcode: true`
3. Retornar o QR code para o usuário escanear com o WhatsApp

Isso será feito numa edge function auxiliar `whatsmiau-setup` que o admin pode chamar para configurar.

### Passo 3 — Edge function `whatsapp-daily-digest`
Nova edge function que:
1. Busca o `user_id` do `guilherme.marques@capitalrealty.com.br` na tabela `profiles`
2. Consulta as solicitações do dia (novas, atualizadas, canceladas, concluídas) com contagens por status
3. Monta uma mensagem formatada com emojis e resumo
4. Envia via `POST https://api.whatsmiau.dev/message/sendText/BAChamados` para `5541998749629`

**Formato da mensagem:**
```
📋 *Resumo do Dia — BA Chamados*
📅 31/03/2026

📥 Novas: 3
🔄 Em andamento: 12
✅ Concluídas: 2
❌ Canceladas: 1
⚠️ Pendentes correção: 4
📬 Aguardando informações: 2

🔔 Destaques:
• #2026000280 — Nova solicitação (Mega Curitiba)
• #2026000275 — Concluída
• #2026000155 — Cancelada por prazo

Acesse: https://megas.lovable.app
```

### Passo 4 — Agendar via pg_cron
Configurar cron job para disparar diariamente às 18h (horário de Brasília = 21:00 UTC):
```sql
SELECT cron.schedule(
  'whatsapp-daily-digest',
  '0 21 * * 1-5',  -- seg-sex às 18h BRT
  $$ SELECT net.http_post(...) $$
);
```

### Arquivos

| Arquivo | Descrição |
|---------|-----------|
| Secret `WHATSMIAU_API_KEY` | API key do Whatsmiau |
| `supabase/functions/whatsmiau-setup/index.ts` | Listar/criar instância + QR code |
| `supabase/functions/whatsapp-daily-digest/index.ts` | Resumo diário via WhatsApp |
| SQL (via insert tool) | Cron job diário |

### Considerações
- A instância precisa ser conectada (QR code escaneado) antes de enviar mensagens
- A primeira execução será do `whatsmiau-setup` para configurar a instância
- O número de destino (`5541998749629`) e o email serão configuráveis no futuro, mas inicialmente hardcoded para este usuário

