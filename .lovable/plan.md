

## Correção — Backlog Crítico: KPI vs Tabela

### Problema (persiste desde a primeira análise)

O KPI "Backlog Crítico" e a tabela de drilldown continuam usando **datasets diferentes**:

- **Card KPI**: Query separada → solicitações **abertas sem OC**, >15 dias úteis desde criação até hoje → resultado: **1**
- **Tabela drilldown**: Filtra `entries` → solicitações **já com OC emitida** que levaram >15 dias → resultado: **vários**

O clique foi reativado mas o filtro da tabela não foi corrigido.

### Solução

Expor os itens reais do backlog crítico no hook e usá-los na tabela quando `drilldownFilter === 'backlog'`.

**Arquivo: `src/hooks/useEficienciaDashboard.ts`**
- Na query de backlog (linha 182-220), em vez de retornar apenas o `count`, retornar também os dados das solicitações (id, protocolo, created_at, empreendimento, status, dias úteis calculados)
- Exportar `backlogEntries: BacklogEntry[]` além de `backlogCritico: number`

**Arquivo: `src/pages/DashboardEficiencia.tsx`**
- Quando `drilldownFilter === 'backlog'`, renderizar uma tabela diferente usando `backlogEntries` (com colunas: Protocolo, Empreendimento, Status, Dias em aberto)
- Para os outros filtros, manter a tabela atual baseada em `entries`

### Mudanças detalhadas

| Arquivo | O quê |
|---|---|
| `src/hooks/useEficienciaDashboard.ts` | Backlog query retorna array de items + count; novo tipo `BacklogEntry`; exportar `backlogEntries` |
| `src/pages/DashboardEficiencia.tsx` | Condicional na tabela: se `backlog` → tabela com `backlogEntries`; senão → tabela existente |

