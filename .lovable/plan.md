

## Renomear aba "Não Aprovadas/Rejeitadas" para "Canceladas" + Corrigir auto-cancelamento

### Problema 1 — Nome da aba
A aba no Solicitante chama "Não Aprovadas" e no Backoffice "Rejeitadas". Ambas filtram apenas `rejeitado`. Devem se chamar **"Canceladas"** e incluir tanto `rejeitado` quanto `cancelado`.

### Problema 2 — Auto-cancelamento não funciona
A edge function `check-correction-deadline` está configurada e o cron job existe (roda diariamente às 8h). O código muda o status para `rejeitado`, mas o trigger `validate_status_transition` pode estar bloqueando se a transição não existir via service role. **Principal problema**: a function usa service role key que bypassa RLS mas NÃO bypassa triggers. A transição `pendente_correcao → rejeitado` e `aguardando_informacoes → rejeitado` existem, então deveria funcionar. Preciso testar a function manualmente e verificar logs.

**Decisão**: Trocar o status de destino de `rejeitado` para `cancelado` (faz mais sentido semânticamente — não foi "rejeitada pelo backoffice", foi "cancelada por falta de resposta").

### Problema 3 — Notificar backoffice
A edge function só notifica o solicitante. Precisa também notificar todos os usuários backoffice/admin para que cancelem processos no Fluig se necessário.

### Mudanças

#### 1. SQL — Adicionar transições para `cancelado` (se não existirem) 
As transições `pendente_correcao → cancelado` e `aguardando_informacoes → cancelado` já existem. Nenhuma migração necessária.

#### 2. Edge function `check-correction-deadline/index.ts`
- Mudar status de destino de `"rejeitado"` para `"cancelado"`
- Mudar ação no histórico para `prazo_correção_expirado` / `prazo_resposta_expirado` (manter)
- Adicionar notificação para TODOS os backoffice/admin users quando cancelar automaticamente
- Incluir na notificação do backoffice que precisa verificar se há processo no Fluig para cancelar
- Redeployar a function

#### 3. `src/pages/Backoffice.tsx`
- Renomear tab `'rejeitadas'` para `'canceladas'`
- Filtrar por `s.status === 'rejeitado' || s.status === 'cancelado'`
- Renomear label para "Canceladas"

#### 4. `src/pages/MinhasSolicitacoes.tsx`
- Renomear tab `'reprovadas'` para `'canceladas'`
- Filtrar por `s.status === 'rejeitado' || s.status === 'cancelado'`
- Renomear label de "Não Aprovadas" para "Canceladas"

#### 5. `src/components/solicitante/SolicitanteSolicitacaoCard.tsx`
- Manter o banner existente para prazo expirado (já implementado para `rejeitado`)
- Adicionar tratamento para status `cancelado` com prazo expirado

#### 6. Testar a edge function
- Invocar manualmente para verificar que funciona

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/check-correction-deadline/index.ts` | Status → `cancelado`, notificar backoffice |
| `src/pages/Backoffice.tsx` | Renomear tab, incluir `cancelado` |
| `src/pages/MinhasSolicitacoes.tsx` | Renomear tab, incluir `cancelado` |
| `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` | Tratar `cancelado` por prazo |

