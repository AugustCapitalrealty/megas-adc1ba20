## Objetivo

Deixar a tela **Faturas por Cliente** (`src/components/admin/energia/FaturasTab.tsx`) mais direta: sem o toggle de Área Comum, com explicação clara dos modos de rateio de perdas e com o valor da Fatura Energy também exibido **sem a multa de ultrapassagem**.

## 1. Área Comum sempre cobrada na fatura

- Remover o grupo de botões "Ratear por m² / Separada" do cabeçalho.
- Fixar o comportamento em **rateada por m²** (o valor líquido da Área Comum é sempre distribuído nos clientes proporcional à área locada, como na planilha RESUMO). Remove-se o estado `ratearAreaComum`; a chamada a `redistribuirAreaComumPorArea` passa a ser sempre aplicada.
- A linha "Área Comum" continua visível na lista lateral, com o selo "rateada por m²" e a nota "já distribuída nos clientes acima", para conferência — sem entrar no somatório.

## 2. Modos de cálculo explicados

O toggle **Exato (por posto) × Planilha (combinado)** permanece (é o que define o rateio das perdas técnicas), mas ganha explicação visível em vez de só `title`:

- Um pequeno bloco de texto abaixo do toggle, mudando conforme o modo ativo:
  - **Exato (por posto):** perdas de Ponta rateadas só pelo consumo Ponta do cliente; perdas Fora Ponta só pelo consumo Fora Ponta. Fórmula: `perda_ponta_cliente = (consumo_ponta_cliente ÷ Σ consumo_ponta) × perdas_ponta_totais` (idem para Fora).
  - **Planilha (combinado):** um único fator `consumo_total_cliente ÷ Σ consumo_total` aplicado às perdas dos dois postos — replica exatamente a planilha Mega Curitiba.
- Ambos exibindo o fator resultante em % com os números reais da competência, para o usuário conferir.

## 3. Faixa principal reorganizada

Mantém os três blocos **Fatura Copel → Fatura Energy = Diferença**, com um acréscimo:

```text
┌ Fatura Copel ──┐   ┌ Fatura Energy ─────────┐   ┌ Diferença ─┐
│ R$ 316.407,05  │ → │ R$ 322.613,38          │ = │ R$ 6.206,33│
│ valor da conta │   │ 21 cliente(s)          │   │ a maior    │
└────────────────┘   │ ── sem multa ────────  │   └────────────┘
                     │ R$ 316.406,83          │
                     │ (multa R$ 6.206,55)    │
                     └────────────────────────┘
```

- Sob o valor da Fatura Energy, uma sub-linha discreta: **"sem multa de ultrapassagem: R$ X"** = `totalGeral − totalUltrapassagem`, com o valor da multa entre parênteses.
- A linha resumo abaixo (`bruta − multa − créd/déb = residual`) continua, com o detalhamento expansível.

## 4. Limpeza do bloco confuso

- O detalhe expansível "Passo 1 / Passo 2" é condensado: uma única equação horizontal com rótulos curtos (Faturado − Copel = Bruta; Bruta − Multa − Créd/Déb = Residual) e a nota explicativa curta, removendo a duplicação atual (grid Passo 1 + grid Passo 2 + "Conta final" repetem os mesmos números três vezes).
- O card "Multas de ultrapassagem" permanece logo abaixo, sem mudanças.

## Detalhes técnicos

- Arquivo único afetado: `src/components/admin/energia/FaturasTab.tsx`.
- Estado `ratearAreaComum` e seu `useState` removidos; `useMemo` de cálculo perde essa dependência.
- Nenhuma mudança no motor `src/lib/energia-rateio.ts` (as funções `redistribuirAreaComumPorArea` e `ModoRateioPerdas` continuam como estão).
- Sem alteração de banco de dados.
