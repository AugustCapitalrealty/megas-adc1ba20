## Problema

Hoje a competência `2026-06` é usada como se o consumo fosse de junho. Como a fatura de junho cobre o consumo de maio, os contratos avaliados são os do mês errado — por isso o aviso de "troca de cliente no meio do mês" aparece indevidamente.

## O que muda

### 1. Mês de consumo = competência − 1

Novo helper em `src/lib/energia-vigencias.ts`:
- `mesConsumo(anoMes)` → `'2026-06'` retorna `'2026-05'`.
- `limitesCompetencia` continua igual (recebe já o mês de consumo).

Passa a ser usado onde se resolve contrato/vigência:
- `MemoriaCalculoTab.tsx` (`fetchCompData`): `refInicio`/`refFim` e `resolverPeriodosPorModulo` usam `mesConsumo(anoMes)`.
- `FaturasTab.tsx`: `refFim` do fetch de vínculos e `resolverPeriodosPorModulo` usam `mesConsumo(currentComp.ano_mes)`.

Não muda: chave da competência no banco, tarifas, lançamentos, fatura Copel — tudo continua gravado sob `ano_mes` da competência.

### 2. Rótulos

- `periodoCompetencia()` na fatura do cliente passa a exibir o período de consumo real (ex.: `01/05/2026 → 31/05/2026`) com o texto "Período de consumo".
- Onde a competência é exibida, acrescentar sufixo discreto "(consumo de mai/2026)" na barra de competência e no card de fatura Copel da Memória de Cálculo.

### 3. Aviso de troca — selo discreto

- Remover o card amarelo "Troca de cliente no meio do mês" da Memória de Cálculo (o estado `trocasNoMes` vira um mapa `moduloId → períodos`).
- Na linha do módulo (matriz de lançamentos e listas por contrato), quando houver mais de um período, mostrar um selo pequeno em texto secundário, ex.:
  `VALIDAR02 até 25/05 · TORNADO a partir de 26/05`
  com tooltip mostrando dias e percentual pro-rata de cada período.
- O módulo aparece nos dois clientes normalmente na aba Faturas (comportamento pro-rata atual mantido).

## Detalhes técnicos

- `mesConsumo` faz aritmética de ano/mês pura em string, sem `Date`, evitando fuso.
- Nenhuma migração de banco: a mudança é só de interpretação/apresentação no frontend.
- Os cálculos de rateio pro-rata já existentes continuam intactos; apenas a janela de datas de entrada muda.
