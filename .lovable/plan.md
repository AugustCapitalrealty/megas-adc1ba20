

## Melhorias WhatsApp — Webhook, Multi-destinatário, Resumo 3x/dia, PDF OC, Botão Admin

### 1. Corrigir webhook — consulta não responde

O webhook funciona quando chamado diretamente (testei via curl), mas a consulta do banco usa foreign key `solicitacoes_fornecedor_id_fkey` que pode falhar com service role. Corrigir a query para usar um LEFT JOIN manual em vez de referência de FK do PostgREST:

```typescript
// Trocar de:
.select(`protocolo, status, ..., fornecedor:fornecedores!solicitacoes_fornecedor_id_fkey(...)`)
// Para:
.select(`protocolo, status, ..., fornecedor_id`)
// E buscar fornecedor separadamente se necessário
```

Também adicionar logs detalhados para debug da resposta do Whatsmiau ao enviar.

### 2. Multi-destinatário — adicionar Jonatas

Criar array de destinatários em vez de número fixo:

```typescript
const DEST_NUMBERS = [
  { number: '5541998749629', name: 'Guilherme Marques' },
  { number: '5541991684980', name: 'Jonatas Ferreira' },
]
```

Aplicar em `whatsapp-daily-digest` e `whatsapp-notify-oc`. O webhook de consulta já responde ao remetente.

### 3. Melhorar UI/UX do resumo

Reformatar a mensagem para ser mais visual e organizada:
- Seções com separadores visuais (─────)
- Agrupar por prioridade: ações pendentes primeiro, depois visão geral
- Adicionar totais ativos vs total geral
- Diferenciar resumos por horário (09h = "Bom dia", 13h = "Atualização", 18h = "Fechamento")

### 4. Alterar horários do cron — 09h, 13h e 18h

Remover o cron existente e criar 3 novos:
```sql
-- 09h BRT = 12h UTC
-- 13h BRT = 16h UTC  
-- 18h BRT = 21h UTC
SELECT cron.unschedule('whatsapp-daily-digest');
SELECT cron.schedule('whatsapp-digest-09h', '0 12 * * 1-5', ...);
SELECT cron.schedule('whatsapp-digest-13h', '0 16 * * 1-5', ...);
SELECT cron.schedule('whatsapp-digest-18h', '0 21 * * 1-5', ...);
```

### 5. Envio de PDF OC na mensagem WhatsApp

No `whatsapp-notify-oc`, após enviar o texto, enviar o PDF da OC via `sendMedia`:
- Buscar o `storage_path` do documento emitido na tabela `documentos_emitidos`
- Gerar URL pública temporária com `supabase.storage.createSignedUrl`
- Enviar via `POST /message/sendMedia/{instance}` com `mediatype: "document"`

### 6. Botão "Testar WhatsApp" no Admin

Adicionar nova tab "WhatsApp" no Admin com:
- Botão "Enviar Resumo Agora" — chama `whatsapp-daily-digest`
- Botão "Testar Consulta" — input de protocolo + chama `whatsapp-webhook` simulando mensagem
- Status da instância (conectada/desconectada)

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Corrigir query FK, melhorar logs |
| `supabase/functions/whatsapp-daily-digest/index.ts` | Multi-dest, UI melhor, saudação por horário |
| `supabase/functions/whatsapp-notify-oc/index.ts` | Multi-dest, envio PDF OC |
| `src/pages/Admin.tsx` | Nova tab WhatsApp com botões de teste |
| SQL (insert tool) | Reconfigurar cron para 3 horários |

