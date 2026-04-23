

## Auditoria de Notificações — Bugs Confirmados e Correções

Inspecionei o banco e identifiquei **4 bugs reais** afetando a entrega de notificações.

### Bugs encontrados

| # | Bug | Evidência no banco |
|---|---|---|
| 1 | **Notificações multiplicadas 2-4x** para usuários com múltiplas roles | 5 usuários têm 2-4 entradas em `user_roles` (`solicitante`+`backoffice`+`admin`+`super_admin`). Edge functions buscam `user_id` da `user_roles` filtrando por `role IN (...)` e o mesmo user_id retorna N vezes. Confirmado: notificação "OC Liberada" gerou 15 inserts para 7 destinatários únicos no protocolo 2026000391. |
| 2 | **"Solicitar NF" duplicada por execução** do cron diário | Edge `check-service-execution` cria 1 notificação por user × N roles a cada chamada. Cron rodou 6× para o mesmo protocolo gerando 6 cópias. O dedup por `ilike "%Solicitar NF%"` funciona apenas para 24h, mas o `array.map` sem dedup multiplica por roles. |
| 3 | **529 notificações `action_required` não lidas** presas em solicitações terminais | 486 em `concluida`, 40 em `cancelado`, 3 em `rejeitado`. Poluem o sino e o badge. |
| 4 | **80 notificações órfãs** com `user_id` que não existe mais em `profiles` | Inseridas no passado, hoje pertencem a "fantasmas". |

### Correções

**1. Deduplicar `user_id` em todas as queries de roles (corrige bugs #1 e #2)**

Usar `Set` no JS **após** SELECT, OU `SELECT DISTINCT`. Arquivos:
- `supabase/functions/check-service-execution/index.ts` — já tem `[...new Set(...)]` na linha 57, então o bug está em outras funções:
- `supabase/functions/check-sla-alerts/index.ts` — verificar e adicionar `Set`
- `supabase/functions/check-correction-deadline/index.ts` — verificar
- `src/lib/message-notifications.ts` — já usa `Set`, OK
- `notify_backoffice_liberado_fornecedor()` (função SQL) — já usa `SELECT DISTINCT`, OK

Investigar por que mesmo com `Set` o protocolo 2026000391 recebeu 15 inserts: provavelmente o trigger SQL `notify_backoffice_liberado_fornecedor` foi chamado mais de uma vez (status mudou várias vezes). Adicionar guarda anti-duplicidade idempotente nas edge functions críticas (último 5min para o mesmo título+solicitacao_id+user_id).

**2. Migration: limpar notificações órfãs e marcar como lidas as terminais (corrige #3 e #4)**

```sql
-- Marcar como lidas notificações action_required de solicitações já finalizadas
UPDATE notifications n
SET lida = true
FROM solicitacoes s
WHERE n.solicitacao_id = s.id
  AND n.tipo = 'action_required'
  AND n.lida = false
  AND s.status IN ('concluida','cancelado','rejeitado','enviado_pagamento');

-- Deletar notificações de usuários inexistentes
DELETE FROM notifications n
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = n.user_id);

-- Deduplicar inserts duplicados antigos (mesmo titulo+user+solicitacao em < 1min)
DELETE FROM notifications a USING notifications b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.solicitacao_id = b.solicitacao_id
  AND a.titulo = b.titulo
  AND ABS(EXTRACT(EPOCH FROM (a.created_at - b.created_at))) < 60;
```

**3. Auto-marcar como lidas quando solicitação muda para status terminal (preventivo para #3)**

Novo trigger `auto_read_notifications_on_terminal`:
- ANTES: status muda para `concluida`/`cancelado`/`rejeitado`/`enviado_pagamento`
- AÇÃO: `UPDATE notifications SET lida = true WHERE solicitacao_id = NEW.id AND tipo = 'action_required' AND lida = false`

**4. Filtro defensivo no `NotificationBell` (UX)**

Em `src/components/NotificationBell.tsx`: ao buscar notificações, ocultar `action_required` se a solicitação relacionada estiver em status terminal. Pode ser feito via JOIN no SELECT (PostgREST `solicitacoes!inner(status)`) ou filtro client-side se já carregado.

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/<novo>.sql` | Limpeza de órfãs + auto-mark de terminais + trigger preventivo |
| `supabase/functions/check-sla-alerts/index.ts` | Adicionar `[...new Set(...)]` no array de user_ids |
| `supabase/functions/check-correction-deadline/index.ts` | Idem |
| `supabase/functions/check-service-execution/index.ts` | Adicionar guarda anti-duplicidade últimos 5min para o título exato |
| `src/components/NotificationBell.tsx` | Filtrar action_required de solicitações em status terminal |

### Resultado esperado

- Sino mostrará contagem correta (badge atual de `20` provavelmente cairá ~50%)
- Sem duplicação de "Solicitar NF" e "OC Liberada" para admins
- Notificações de solicitações fechadas saem automaticamente da fila

