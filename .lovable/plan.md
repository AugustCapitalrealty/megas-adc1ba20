## Bug

Na fatura Copel a "DEMANDA USD ISENTA ICMS" tem preço unitário (ex.: R$ 22,903134), mas no rateio por cliente a tarifa aparece como **R$ 0,000000**. Resultado: clientes com demanda isenta não recebem o valor correto.

## Causa

`FaturaCopelTab.handleSave` propaga os preços unitários dos itens core (`demanda_usd`, `te_ponta`, `tusd_ponta`, `te_fora`, `tusd_fora`, `ultrapassagem`) para as colunas da tarifa usadas pelo engine (`energia_competencia_tarifas.demanda_usd/te_*/tusd_*/ultrapassagem`), mas **esquece de propagar** o preço do item `demanda_isenta_icms` para a coluna `demanda_isenta`. Como o engine (`energia-rateio.ts`) calcula `K = H * tarifas.demanda_isenta`, e essa coluna fica em 0, a parcela isenta zera.

## Correção

Em `src/components/admin/energia/FaturaCopelTab.tsx`, no objeto `mirror` do `handleSave`, adicionar:

```ts
demanda_isenta: preco('demanda_isenta_icms'),
```

junto com as outras tarifas que já são espelhadas. Após salvar a fatura, a memória de cálculo passa a usar a tarifa correta para clientes com demanda isenta.

## Verificação

1. Abrir competência atual, na aba "Fatura Copel" garantir que o item DEMANDA USD ISENTA ICMS está preenchido (3,51 kW × R$ 22,903134).
2. Clicar Salvar.
3. Ir na aba "Memória de Cálculo" → Grandezas Contratadas do cliente que tem demanda isenta: a linha "Demanda USD Isenta ICMS" deve mostrar tarifa R$ 22,903134 e valor > 0.
