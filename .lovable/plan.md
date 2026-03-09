# ✅ Plano Concluído: Unificar métricas Dashboard Eficiência

## Problema Resolvido

O card "Backlog Crítico" e o histograma "Distribuição do Lead Time" usavam datasets diferentes:
- Card: solicitações **em aberto** >15 dias
- Histograma "15d+": solicitações **concluídas** com lead time >15 dias

Isso causava confusão: clicar na barra do histograma não atualizava o card.

## Solução Implementada

Unificamos o card para usar o mesmo dataset do histograma (solicitações finalizadas):

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useEficienciaDashboard.ts` | Adicionado `critico15Count` e `critico15Percent` calculados de `entries.filter(e => e.lead_time_dias > 15)` |
| `src/pages/DashboardEficiencia.tsx` | Card renomeado para "Crítico (>15 dias)", usa `critico15Count`, drilldown unificado, tabela simplificada |

## Resultado

- Card e histograma agora mostram o mesmo número
- Clicar no card ou na barra "15d+" filtra a mesma lista na tabela
- Linhas com >15 dias têm highlight vermelho e ícone de alerta
