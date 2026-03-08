

# Bug: Contagem de justificativas ignora regra do dia 23

## Problema
O hook `useDashboardMetrics.ts` conta TODAS as OCs sem NF como pendentes de justificativa, mas a regra de negócio (e o próprio MonitoramentoOC.tsx) exige justificativa apenas a partir do **dia 23 do mês**. Hoje é dia 8, então nenhuma OC deveria aparecer como pendente de justificativa.

## Correção

**1 arquivo:** `src/hooks/useDashboardMetrics.ts`

Na queryFn de justificativas (linha ~101), adicionar verificação do dia do mês no início:

```typescript
const dayOfMonth = new Date().getDate();
if (dayOfMonth < 23) return { total: 0, own: 0 };
```

Isso faz a query retornar zero antes do dia 23, alinhando o Dashboard com a mesma regra do painel de Monitoramento OC x NF.

