

## Melhorias WhatsApp: Resumo, OC, Webhook + Fix Build Errors

### Problemas Identificados

1. **Webhook não responde** — Zero logs = o webhook da Whatsmiau nunca chega na edge function. Provavelmente o webhook não foi configurado na instância `WhatsmiauTest_4cca4bbe` ou foi configurado com URL errada. Precisa reconfigurar via API.

2. **OC sem descrição** — A mensagem já tem campo descrição no código mas o caller em `Backoffice.tsx` pode não estar passando. Precisa verificar e garantir.

3. **Resumo diário precisa de melhorias** — Remover números de protocolo dos destaques, agrupar por empreendimento, trocar "Pipeline" por "Ativas".

4. **Build errors** — 6 erros de `error is of type 'unknown'` em catch blocks de edge functions.

### Mudanças

#### 1. Fix Build Errors (6 arquivos)
Em todos os catch blocks com `error.message`, trocar para `(error as Error).message`:
- `check-service-execution/index.ts` linha 108
- `check-sla-alerts/index.ts` linha 112
- `whatsapp-daily-digest/index.ts` linha 221
- `whatsapp-notify-oc/index.ts` linha 162
- `whatsapp-webhook/index.ts` linha 173
- `whatsmiau-setup/index.ts` linha 94

#### 2. Configurar Webhook Whatsmiau
Adicionar ação `configure_webhook` no `whatsmiau-setup/index.ts` que chama:
```
POST /webhook/set/WhatsmiauTest_4cca4bbe
{ webhook: { enabled: true, url: "https://wcxybuietfmaaqzmcmnq.supabase.co/functions/v1/whatsapp-webhook", events: ["messages.upsert"] } }
```
E adicionar botão "Configurar Webhook" no `WhatsAppAdminTab.tsx`.

#### 3. Melhorar Resumo Diário (`whatsapp-daily-digest`)
- Trocar "Pipeline (X ativas)" por "📊 Ativas (X)"
- Remover seção "Destaques" com protocolos individuais
- Agrupar movimento do dia por empreendimento:
```
📈 Movimento Hoje
   🏢 Mega Curitiba: 4 novas, 8 atualizadas
   🏢 Mega Itajaí: 1 nova, 3 atualizadas
```

#### 4. OC — Adicionar Descrição (`whatsapp-notify-oc`)
A mensagem já inclui descrição (linha 58-59). Verificar em `Backoffice.tsx` se o campo `descricao` é passado no body da chamada. Se não, adicionar.

#### 5. OC — Melhorar envio de PDF
Adicionar delay entre texto e media (3s) e logs mais detalhados para debugar falhas de anexo.

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/check-service-execution/index.ts` | Fix `error` type |
| `supabase/functions/check-sla-alerts/index.ts` | Fix `error` type |
| `supabase/functions/whatsapp-daily-digest/index.ts` | Fix type + reformatar resumo |
| `supabase/functions/whatsapp-notify-oc/index.ts` | Fix type + delay media |
| `supabase/functions/whatsapp-webhook/index.ts` | Fix type |
| `supabase/functions/whatsmiau-setup/index.ts` | Fix type + ação configure_webhook |
| `src/components/admin/WhatsAppAdminTab.tsx` | Botão configurar webhook |
| `src/pages/Backoffice.tsx` | Garantir `descricao` no body do notify-oc |

