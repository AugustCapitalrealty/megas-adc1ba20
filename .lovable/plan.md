

## Implementar 2 melhorias: Produtividade Individual + Alerta SLA

### Melhoria 1: Dashboard de Produtividade Individual

**Novo hook** `src/hooks/useProductivityMetrics.ts`
- Consulta `historico_solicitacoes` dos últimos 7 dias filtrando por `user_id = auth.uid()`
- Agrupa por tipo de ação: assumidas (`acao = 'Assumido pelo backoffice'`), OCs emitidas (`acao = 'documento_emitido'`), concluídas (`status_novo = 'concluida'`)
- Retorna `{ assumed, ocsEmitted, completed, isLoading }`

**Novo componente** `src/components/ProductivityCard.tsx`
- Card compacto com 3 mini-métricas lado a lado (ícones + contadores)
- Título: "Sua semana" com período exibido
- Visual discreto, usando ícones `UserCheck`, `FileCheck`, `CheckCircle2`

**Dashboard.tsx**
- Importar e renderizar `ProductivityCard` entre os KPIs e a lista de recentes, apenas quando `isBackofficeOrAdmin`

### Melhoria 2: Alerta Proativo de SLA

**Nova edge function** `supabase/functions/check-sla-alerts/index.ts`
- Busca solicitações em status ativo (`recebido`, `em_analise`, `aprovado`, `em_processamento`)
- Para cada uma, chama `calcular_sla_solicitacao` RPC
- Quando `dias_uteis_backoffice >= 2.4` (80% de 3 dias) e `< 3`:
  - Verifica se já existe notificação recente (últimas 24h) com título contendo "SLA" para essa solicitação
  - Se não, insere notificação `prioridade: 'high'`, `tipo: 'action_required'` para todos os usuários backoffice/admin
- Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS

**Config** `supabase/config.toml`
- Adicionar `[functions.check-sla-alerts]` com `verify_jwt = false`

**Cron** (via insert tool, não migration)
- Agendar execução a cada 30 minutos usando `pg_cron` + `pg_net`

### Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| `src/hooks/useProductivityMetrics.ts` | Criar |
| `src/components/ProductivityCard.tsx` | Criar |
| `src/pages/Dashboard.tsx` | Editar — adicionar ProductivityCard |
| `supabase/functions/check-sla-alerts/index.ts` | Criar |
| `supabase/config.toml` | Editar — adicionar entry |
| SQL (insert tool) | Agendar cron job |

