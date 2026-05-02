## Objetivo

Quando o usuário marcar **"Contrato Mensal"** na nova solicitação (AC), exibir um auxiliar de **valor mensal**:

- Sugestão padrão = `valor total ÷ nº de meses` (calculado do período Início→Fim, ou 12 como fallback).
- Campo editável: usuário pode digitar o valor mensal desejado.
- Quando o usuário edita o mensal, o sistema indica **quantos meses** isso corresponderia em relação ao valor total (`valor total ÷ valor mensal`, arredondado).
- Tudo é **assistente visual**: o `valor` salvo no banco continua sendo o total. Nenhuma alteração de schema.

## Comportamento detalhado

Mostrar o bloco **somente quando**:
- Tipo = AC (já é o contexto do checkbox)
- `contratoMensal === true`
- `valorNumerico > 0`

Cálculo de meses do período:
- Se `dataInicio` e `dataFim` estão preenchidas: `meses = max(1, differenceInCalendarMonths(fim, inicio) + 1)`.
- Caso contrário: assume 12 meses (texto: "estimativa de 12 meses — defina datas para refinar").

Sugestão de mensal:
- `mensalSugerido = valor / meses` (arredondado para 2 casas).
- Quando usuário ainda não tocou no campo, `valorMensalEditado = mensalSugerido` (auto-sincronizado se valor/datas mudarem).

Indicador inverso:
- `mesesInferidos = valor / valorMensalEditado` (com 1 casa decimal).
- Aviso amarelo se `mesesInferidos` diverge de `meses` em ≥ 0,5: "Esse valor mensal corresponde a ≈ X,X meses, mas o período definido tem N meses."

UI (dentro do card do contrato mensal):

```text
┌───────────────────────────────────────────────────┐
│ Valor mensal do contrato                          │
│ ┌─────────────────┐                               │
│ │ R$ 1.250,00     │  Sugerido: R$ 1.250,00 [aplicar]
│ └─────────────────┘                               │
│ Equivale a ≈ 12 meses · Total R$ 15.000,00        │
│ [⚠ se divergir do período]                        │
└───────────────────────────────────────────────────┘
```

## Detalhes técnicos

**Arquivo único alterado:** `src/components/nova-solicitacao/steps/DetalhesStep.tsx`

1. Importar `useState`, `useEffect`, `useMemo` e `differenceInCalendarMonths` de `date-fns`.
2. Criar componente local `ValorMensalHelper({ valorTotal, dataInicio, dataFim })`:
   - Estado `valorMensalStr` (string formatada igual aos outros inputs de moeda).
   - Estado `tocado: boolean` — se falso, sincroniza com sugerido sempre que `valorTotal`/`meses` mudarem.
   - Usa o mesmo padrão de máscara dos outros campos: `formatCurrency` injetado por prop.
   - Botão "Aplicar sugestão" reseta `tocado=false` e re-sincroniza.
3. Renderizar o helper logo abaixo do checkbox "Contrato Mensal", apenas quando `contratoMensal && valorNumerico > 0`.
4. Passar `formatCurrency` que já está disponível na assinatura do `DetalhesStep`.

## Fora de escopo

- Persistir `valor_mensal` no banco — não há coluna e o usuário não pediu.
- Mudar lógica de `parcelas` (continua existindo separadamente para parcelamento financeiro).
- Alterar exibição em telas de detalhes/calendário.