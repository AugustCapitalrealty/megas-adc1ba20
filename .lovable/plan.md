## Diagnóstico da diferença R$ 2,77 (fatura 06/2026 — Mega Curitiba)

Comparei a **Fatura Copel** enviada (PDF) com o print da aba "Fatura Copel" (image-288). A divergência **não é da engine de rateio** — é do lançamento da fatura em si.

### 1) Bandeira Amarela lançada em uma linha só (principal causa)

Na fatura da Copel a Bandeira Amarela vem em **DUAS linhas**:

| Linha | kWh | Preço unit. | Valor |
|---|---|---|---|
| ADICIONAL BAND. AMARELA (PONTA) | 38.370 | 0,025464 | **977,05** |
| ADICIONAL BAND. AMARELA (F PONTA) | 390.603 | 0,025464 | **9.946,33** |
| **Soma** | 428.973 | | **10.923,38** |

Na tela foi lançada **uma única linha "FORA PONTA"** com **428.973 kWh** (Ponta + Fora somados). Isso ocorreu porque essa fatura foi salva antes da separação Ponta/Fora existir, e o compat legado mapeia `bandeira_amarela` → `bandeira_amarela_fora` (linhas 199 de `FaturaCopelTab.tsx`). O total em R$ fica correto, mas:

- Os tributos ficam distorcidos (PIS/COFINS/ICMS de bandeira Ponta usam base Ponta, não Fora).
- O rateio por posto tarifário rateia todo o adicional como Fora Ponta.

**Ação:** ao abrir a fatura, se `bandeira_amarela_fora.quant` = (consumo Ponta + Fora) e não houver linha Ponta, oferecer botão "Separar em Ponta/Fora automaticamente" que divide pelos kWh de cada posto. Também alertar no salvamento quando `quant fora` == `consumo total`.

### 2) Diferença residual de R$ 0,23 = arredondamento Copel

Somando item a item, o app calcula **R$ 316.407,06** e a Copel imprime **R$ 316.406,83** (Total a Pagar). Diferença **+R$ 0,23**, distribuída assim (Copel arredonda cada linha antes de somar; o app soma em precisão total):

| Item | Copel | App | Δ |
|---|---|---|---|
| TE PONTA | 21.442,87 | 21.442,88 | +0,01 |
| TE F PONTA | 135.877,00 | 135.877,11 | +0,11 |
| USD F PONTA | 63.799,02 | 63.799,14 | +0,12 |
| BAND AMARELA | 10.923,38 | 10.923,37 | -0,01 |
| **Total** | **316.406,83** | **316.407,06** | **+0,23** |

Isto é comportamento esperado (arredondamento bancário linha-a-linha do faturador). Uma diferença ≤ R$ 1,00 não indica erro.

### 3) De onde vem o "-R$ 2,77" que a tela mostra

O badge compara `Total dos itens` × `Total a Pagar` (campo digitado). Como o total real da Copel é **R$ 316.406,83** e o app soma **R$ 316.407,06**, o "-2,77" só aparece se o Total a Pagar foi digitado como **R$ 316.404,29** (ou similar). **Confirmar com o usuário o valor do campo "Total a Pagar" digitado.**

---

## Plano de correção

### A. `src/components/admin/energia/FaturaCopelTab.tsx`
1. Ao carregar uma fatura, se existir `bandeira_amarela_fora` com `quant` igual à soma `consumo_ponta + consumo_fora` e **sem** `bandeira_amarela_ponta`, exibir banner amarelo: *"Bandeira Amarela parece estar somada em uma linha só. [Separar em Ponta/Fora]"*. O botão preenche as duas linhas usando o consumo de cada posto e o mesmo preço unitário. Mesma lógica para vermelha 1 e 2.
2. Validação no salvar: se qualquer `bandeira_*_fora.quant` ≥ 1,5× `consumo_fora`, bloquear com toast pedindo revisão.
3. Ajustar a badge de diferença para:
   - **Verde** se `|diff| ≤ R$ 1,00` (ruído de arredondamento da Copel).
   - **Amarelo** se `|diff| ≤ R$ 10,00`.
   - **Vermelho** acima disso.
   Tooltip: "A Copel arredonda cada linha antes de somar; diferenças de centavos são normais."

### B. Migração (opcional, one-shot)
Script SQL de normalização: para faturas onde `itens.bandeira_amarela_fora.quant = consumo_total` e não há `bandeira_amarela_ponta`, dividir automaticamente. Só aplicar após confirmação do usuário.

### C. Sem alteração na engine
`src/lib/energia-rateio.ts` está correto — a diferença não é da distribuição de perdas nem dos tributos.

---

## Ação imediata sugerida ao usuário

Enquanto o item A não sai, corrigir esta fatura manualmente:

1. Remover a linha atual "ADICIONAL BAND. AMARELA — FORA PONTA" (428.973 kWh).
2. Adicionar duas linhas:
   - `ADICIONAL BAND. AMARELA — PONTA`: **38.370** kWh × 0,025464
   - `ADICIONAL BAND. AMARELA — FORA PONTA`: **390.603** kWh × 0,025464
3. Confirmar o campo **Total a Pagar** = **R$ 316.406,83** (o app deve ficar com diferença ≤ R$ 0,25).
