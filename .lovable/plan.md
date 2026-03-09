
## Problema

Há inconsistência entre o card **Backlog Crítico** e o histograma **Distribuição do Lead Time**:

- **Card Backlog Crítico**: Conta solicitações **abertas** sem OC há >15 dias úteis → mostra **1**
- **Histograma barra "15d+"**: Conta solicitações **concluídas** que levaram >15 dias úteis → mostra **8** (ou mais)

Quando o usuário clica na barra do histograma, espera que o card mostre o mesmo número. São datasets diferentes, causando confusão.

---

## Solução

Unificar o conceito: o card "Backlog Crítico" passa a contar **solicitações concluídas com lead time >15 dias** (mesmo dataset do histograma), não mais "em aberto".

### Mudanças em `src/pages/DashboardEficiencia.tsx`

| Item | Antes | Depois |
|------|-------|--------|
| Card título | "Backlog Crítico (Em aberto)" | "Crítico (>15 dias)" |
| Valor | `backlogCritico` (query separada de abertos) | Contagem de `entries` com `lead_time_dias > 15` |
| Tooltip | "Solicitações em aberto..." | "Solicitações finalizadas que levaram mais de 15 dias úteis" |
| Drilldown | `'backlog'` → `backlogEntries` | `'backlog'` → `entries` filtradas por `lead_time > 15` |
| Cor | Sempre vermelho se > 0 | Vermelho apenas se % alto (ex: >20% do total) |

### Mudanças em `src/hooks/useEficienciaDashboard.ts`

- Manter a query de `backlogEntries` (itens em aberto) para uso futuro se necessário
- Adicionar novo campo `critico15Count` calculado de `entries.filter(e => e.lead_time_dias > 15).length`
- Exportar `critico15Count` para o dashboard

### Resultado esperado

- Card mostra **8** (mesmo número da barra "15d+" do histograma)
- Clicar no card ou na barra do histograma filtra a mesma lista de itens na tabela
- Linguagem consistente em todo o painel
