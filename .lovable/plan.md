
Objetivo: deixar novamente todos os 4 cards de KPI clicáveis (incluindo Backlog Crítico), como você pediu.

Diagnóstico atual:
- O Backlog Crítico está sem `onClick` e sem estilos de card interativo.
- Os outros cards continuam clicáveis.
- O filtro `drilldownFilter = 'backlog'` já existe e já filtra a tabela por `lead_time_dias > 15`, então a base técnica para clique já está pronta.

Plano de implementação (arquivo: `src/pages/DashboardEficiencia.tsx`):
1) Reativar clique no card “Backlog Crítico”
- Adicionar `onClick={() => setDrilldownFilter('backlog')}` no card.
- Reaplicar classes de interação visual:
  - `cursor-pointer`
  - `hover:shadow-md`
  - `transition-shadow`
  - estado ativo com `ring-2 ring-primary/30` quando `drilldownFilter === 'backlog'`.

2) Ajustar texto explicativo do tooltip do Backlog
- Remover a mensagem que diz que “não possui detalhamento”.
- Substituir por descrição neutra alinhada ao comportamento clicável (ex.: ao clicar, aplica filtro de backlog no detalhamento).

3) Garantir consistência dos 4 cards
- Lead Time Médio → `all`
- Same-Day → `same_day`
- Backlog Crítico → `backlog`
- Vazão → `all`
- Assim todos ficam clicáveis e com feedback visual uniforme.

4) Validação funcional após ajuste
- Clicar em cada card e confirmar mudança do anel ativo.
- Clicar em Backlog Crítico e confirmar filtro `>15 dias úteis` no detalhamento.
- Confirmar que tooltip e comportamento não se contradizem.
