## Diagnóstico (confirmado)

A bandeira do Sodexo/Restaurante saiu **R$ 11,04** quando deveria ser **R$ 1.103,75** — exatamente 100× menor.

O que os dados mostram (competência 2026-06):
- No banco, a coluna `bandeira_valor` está **correta**: `2.5464` (R$/100 kWh), que é o que o motor de rateio espera (`(kWh + perdas) ÷ 100 × bandeira_valor`).
- Mas o campo `fatura_copel_itens.bandeira_tarifa_oficial` foi gravado na nova escala **R$/kWh**: `"0,025464"`.
- Em `src/components/admin/energia/FaturasTab.tsx`, a função `resolveBandeiraValor` prioriza `bandeira_tarifa_oficial` e entrega esse número **direto ao motor**, sem converter de R$/kWh para R$/100 kWh. Daí 43.345 ÷ 100 × 0,025464 = R$ 11,04.

Ou seja: quando a UI da Fatura Copel passou a trabalhar em R$/kWh (0,025464), a aba Faturas por Cliente continuou lendo esse valor como se fosse R$/100 kWh.

## Correção

Em `src/components/admin/energia/FaturasTab.tsx`:

1. Normalizar a escala em `resolveBandeiraValor`: ao ler `bandeira_tarifa_oficial`, converter para R$/100 kWh quando o valor estiver em R$/kWh (heurística já usada na aba Copel: valores < 0,5 são R$/kWh → multiplicar por 100; valores ≥ 0,5 já são escala antiga R$/100 kWh).
2. Manter os fallbacks (`BANDEIRA_TARIFA_OFICIAL` e `tarifas.bandeira_valor`) que já estão na escala R$/100 kWh.
3. Ajustar os rótulos do bloco de auditoria "Memória do cálculo de consumo" para exibir a tarifa nas duas escalas (R$/kWh e R$/100 kWh), evitando nova confusão.

## Validação

- Recalcular Sodexo (Restaurante) em 06/2026: bandeira deve fechar em ~R$ 1.103,75 e o Total da Fatura em ~R$ 34.948,9x, alinhado à planilha.
- Conferir que os demais clientes somam a bandeira total próxima ao lançado na Copel (R$ 977,05 ponta + R$ 9.946,31 fora).

## Detalhes técnicos

- Nenhuma migração de banco; `bandeira_valor` já está correto.
- Sem alteração em `src/lib/energia-rateio.ts` (contrato R$/100 kWh preservado).
- Sem alteração no cálculo de impostos.
