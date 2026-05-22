Causa real do "sumiram": o hook `useFluigSnapshots` em `src/hooks/useFluigDashboard.ts` faz `supabase.from('fluig_painel_snapshot').select('*')` sem paginação, então bate no limite padrão do PostgREST de **1.000 linhas**. Hoje a tabela tem **1.136 registros**, ordenados por `data_lancamento` ascendente — ou seja, os **mais recentes (incluindo 155232 e os demais "Em Aberto" recém-importados)** são justamente os 136 que estão sendo cortados.

Por isso a UI mostra Mega Curitiba (206) em vez de 226 (DB), e Abertos = 0 nas três unidades, mesmo com 24 "Em Aberto" só em Curitiba no banco.

Plano:
1. Em `src/hooks/useFluigDashboard.ts`, no `fetchSnapshots`, paginar a leitura de `fluig_painel_snapshot` em blocos de 1000 (`.range(from, from+999)`) acumulando até a página retornar menos de 1000 — mesmo padrão `fetchAll` já usado no `useFluigImport`.
2. Manter a ordenação atual (`data_lancamento` asc, nulls por último) e todos os filtros existentes.
3. Não tocar em `isFluigFechado`, parser, schema ou UI — a regra de aprovações por valor (≤2500 → Financeiro; >2500 → Diretoria) já está correta.

Após o ajuste, 155232 (R$ 7.703,70, sem aprovação da Diretoria) e os demais "Em Aberto" recentes voltam a aparecer em Mega Curitiba > Abertos sem precisar reimportar.