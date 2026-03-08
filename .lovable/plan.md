

# Plano: 4 Melhorias PM Restantes

## #1 Onboarding de Novos Usuários

**Abordagem**: Criar componente `WelcomeTour` com tooltips posicionados que aparece na primeira visita (flag `localStorage`). Melhorar empty state do Dashboard com checklist visual.

- Criar `src/components/WelcomeTour.tsx` — overlay com 3-4 passos (tooltip sequencial): "Crie sua primeira solicitação", "Acompanhe pelo menu Solicitações", "Notificações ficam aqui"
- Integrar no `Dashboard.tsx` — mostrar tour quando `metrics.total === 0` e `!localStorage.getItem('onboarding_done')`
- Melhorar empty state existente com checklist: perfil configurado ✓, primeira solicitação pendente

## #5 Tracking de Eventos de Uso

**Abordagem**: Criar tabela `analytics_events` no banco + hook `useTrackEvent` leve e não-bloqueante.

- **Migration**: Criar tabela `analytics_events` (id, user_id, event_name, event_data jsonb, page, created_at) com RLS permitindo insert por autenticados e select por admins
- Criar `src/hooks/useTrackEvent.ts` — fire-and-forget (sem await), debounced para eventos frequentes
- Instrumentar pontos-chave: `NovaSolicitacao` (step_viewed, form_submitted, form_abandoned), `Dashboard` (kpi_clicked, view_mode_changed), `Backoffice` (action_taken)

## #9 Sparklines no Dashboard

**Abordagem**: Adicionar mini-gráfico de tendência 7 dias nos KPI cards usando recharts (já instalado).

- Criar `src/components/KpiSparkline.tsx` — componente compacto usando `<LineChart>` de recharts (40x20px, sem eixos/labels)
- Estender `useDashboardMetrics` para calcular contagem diária dos últimos 7 dias por status group
- Integrar nos KPI cards do `Dashboard.tsx` — sparkline abaixo do valor numérico

## #4 Email Digest

**Abordagem**: Edge function `notification-digest` que envia resumo de notificações não lidas. Acionada por cron diário.

- Criar `supabase/functions/notification-digest/index.ts` — busca usuários com `receber_notificacoes_email = true` e notificações não lidas nas últimas 24h, envia email via Resend (já configurado)
- Configurar cron job via `pg_cron` + `pg_net` para rodar diariamente às 8h
- Atualizar `supabase/config.toml` com a nova function

## Ordem de Implementação

1. #5 Analytics (migration + hook) — base para medir impacto
2. #9 Sparklines — visual de tendência no Dashboard
3. #1 Onboarding — tour para novos usuários
4. #4 Email Digest — edge function + cron

## Arquivos Criados
- `src/hooks/useTrackEvent.ts`
- `src/components/KpiSparkline.tsx`
- `src/components/WelcomeTour.tsx`
- `supabase/functions/notification-digest/index.ts`

## Arquivos Editados
- `src/hooks/useDashboardMetrics.ts` — dados de tendência 7 dias
- `src/pages/Dashboard.tsx` — sparklines + onboarding tour
- `src/pages/NovaSolicitacao.tsx` — tracking de steps
- `src/pages/Backoffice.tsx` — tracking de ações

