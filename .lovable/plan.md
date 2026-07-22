## Problema

A **taxa de Bandeira** não aparece nas faturas por cliente do mês 06 porque o rateio (`src/lib/energia-rateio.ts`) lê o campo `bandeira_valor` (R$/100 kWh) de `energia_competencia_tarifas`, mas esse campo só é preenchido manualmente na aba **Memória de Cálculo**. Quando a bandeira é lançada como itens na **Fatura Copel** (fluxo atual — amarela/vermelha P1/P2 × ponta/fora), esses valores não são propagados para `bandeira_valor`, então o engine rateia com R$/100 kWh = 0.

## Objetivo

Sincronizar automaticamente `bandeira_valor` a partir dos itens de bandeira lançados na Fatura Copel, mantendo o override manual quando necessário.

## Escopo (frontend/UI apenas)

1. **`src/components/admin/energia/FaturaCopelTab.tsx`**
   - Ao salvar a Fatura Copel, calcular o `bandeira_valor` derivado:
     - Somar R$ de todos os itens de bandeira lançados (amarela + vermelha P1 + vermelha P2, ponta + fora) = `bandeiraReais`.
     - Somar kWh total faturado na Copel com perdas = `consumo_ponta + consumo_fora + perdas_ponta + perdas_fora` (mesma base que o engine aplica em `BM/BN = ((Q+AH)/100) * bandeira_valor`).
     - `bandeira_valor = (bandeiraReais / kWhBase) * 100`, com `0` se a base for `0`.
   - Persistir esse valor no mesmo update que grava os itens/tarifas de Copel, e também zerar caso todos os itens de bandeira sejam removidos.
   - Mostrar um indicador leve ("Bandeira sincronizada com Memória: R$ X/100 kWh") no bloco de bandeiras, para o admin confirmar.

2. **`src/components/admin/energia/MemoriaCalculoTab.tsx`**
   - No campo `bandeira_valor`, marcar como "derivado automaticamente da Fatura Copel"; permitir edição manual (override) mas mostrar um badge quando o valor diverge do derivado.
   - Adicionar botão pequeno "Recalcular a partir da Fatura Copel" que reexecuta a fórmula acima para a competência atual.

3. **Retroativo para 06**
   - Sem migração de dados: basta o usuário abrir a Fatura Copel do mês 06 e salvar (ou clicar em "Recalcular" na Memória), que `bandeira_valor` será populado e o rateio por cliente passará a exibir a Bandeira corretamente.

## Fora do escopo

- Nenhuma mudança no engine de cálculo (`src/lib/energia-rateio.ts`) — a fórmula BM/BN continua a mesma.
- Nenhuma migração de schema — o campo `bandeira_valor` já existe.
- Nenhuma mudança em impostos, perdas, PIS/COFINS ou ICMS.

## Verificação

- Reabrir Fatura Copel do mês 06 → salvar → abrir aba Faturas por cliente → conferir que a linha "Bandeira Tarifária" agora mostra valor > 0 e o total bate com o total de bandeira lançado na Copel (± tolerância de arredondamento).
- Conferir na Memória de Cálculo que a coluna "Bandeira" das linhas por módulo deixou de ser zero e que a soma bate com `bandeiraReais` da Copel.
