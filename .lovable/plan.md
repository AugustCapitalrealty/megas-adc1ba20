## Diagnóstico

Comparando o print do app com o PDF da fatura 06/2026 (DEMERCADO INVESTIMENTOS):

**1) Diferença real é só R$ 0,22 (arredondamento Copel) — mas o "Total a pagar" foi digitado errado**

- PDF: **R$ 316.406,83**
- Você digitou no cabeçalho: **R$ 316.409,83** (3 a mais na casa dos milhares)
- Total calculado pelo app: **R$ 316.407,05**
- Diferença real vs. PDF = **R$ 0,22** → dentro da tolerância verde "Bate (arredondamento Copel)"

**2) Bug real: coluna "PIS/COFINS" por linha está exibindo só o COFINS (sem somar o PIS)**

Exemplo TE Ponta:
- App mostra: **1.226,23** ≈ `21.442,88 × 0,81 × 0,0706` (só COFINS)
- PDF mostra: **1.495,45** = `21.442,88 × 0,81 × (0,0707 + 0,0154)` (PIS+COFINS somados)

O bloco global "Tributos calculados" está correto (COFINS 18.114,06 + PIS 3.920,02 ≈ PDF). O problema é só nas linhas da tabela.

**Causa técnica** (`FaturaCopelTab.tsx`):
- O `useEffect` que recalcula `pis_cofins` por item depende apenas de `[aliquotas]` (linha 307).
- Na carga, `setAliquotas(...)` roda em `fetchBase` **antes** de `fetchComp` popular `faturaItens.itens`. Quando os itens finalmente entram no state, o efeito não dispara de novo, então os valores salvos antigos (calculados com PIS=0 ou fórmula antiga) ficam congelados.
- Edição manual dispara `recalcItem` e corrige — por isso algumas linhas parecem certas e outras não.

## Plano

**Arquivo:** `src/components/admin/energia/FaturaCopelTab.tsx`

1. Fazer o `useEffect` de recálculo por item (linhas 281–307) reagir também à chegada dos itens, para reprocessar valores salvos com fórmula antiga:
   - Alternativa A: adicionar `faturaItens.itens` às deps e usar um guard para evitar loop (só atualiza se `recalc` for diferente do `curr` — já existe).
   - Alternativa B (mais segura): rodar o `recalcItem` para cada item dentro do próprio `fetchComp`, logo depois de montar `rawItens`, usando as `aliquotas` já carregadas (aguardando o `Promise.all` de `fetchBase` terminar antes).
   - Vamos adotar **A** (menor mudança) com o guard existente, que já compara `recalc.pis_cofins !== curr.pis_cofins` e só faz `setFaturaItens` quando muda — não gera loop.

2. Não mexer em mais nada (fórmula, tributação, UI, salvamento, migração).

## Verificação

Após o fix, ao abrir a fatura 06/2026 sem editar nada:
- TE Ponta PIS/COFINS deve virar ~**1.495,4** (bate com PDF)
- USD Ponta ~4.379,7, TE F Ponta ~9.476,2, USD F Ponta ~4.449,4, Demanda USD ~1.497,0
- Total calculado permanece **R$ 316.407,05** (a coluna PIS/COFINS é informativa; não entra no total)
- Diferença vs. Total a pagar continua R$ 0,22 quando você corrigir o digitado de **316.409,83 → 316.406,83**

## Observação para você

Corrija o campo "Total a pagar (Copel)" para **316.406,83** (está com um 3 a mais). Depois do fix do bug, a diferença fica R$ 0,22 (arredondamento Copel, dentro da tolerância).