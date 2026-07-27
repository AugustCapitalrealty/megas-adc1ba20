## Objetivo

Digitar e visualizar a tarifa de bandeira no mesmo formato da fatura da Copel — **R$/kWh** (ex.: `0,018850` sem tributos e `0,025511` com tributos) — em vez de R$/100 kWh (`1,8850` / `2,5511`).

## O que muda

Em `src/components/admin/energia/FaturaCopelTab.tsx`:

1. **Entrada e exibição em R$/kWh, com 6 casas decimais**
   - Campo "Tarifa ANEEL — sem tributos" → label `R$/kWh`, valor exibido `0,018850`.
   - Campo "Tarifa COM tributos — usada na cobrança" → label `R$/kWh`, valor `0,025511`.
   - Cards comparativos ("Tarifa oficial (planilha)" e "Rateio fechado"), o aviso de divergência vs. fatura e o bloco "Como é calculado" passam a mostrar R$/kWh com 6 casas.

2. **Conversão nas bordas, cálculo intacto**
   - A tabela ANEEL (`BANDEIRA_TABELA`, `BANDEIRA_TABELA_LIQUIDA`) passa a ser expressa em R$/kWh (0,025464 / 0,044630 / 0,078770 e 0,018850 / 0,033010 / 0,058270).
   - `bandeiraInfo` (tarifa líquida, bruta, derivada da fatura e oficial) passa a trabalhar em R$/kWh: a tarifa derivada deixa de ter o `×100`.
   - Na hora de alimentar o motor de rateio (`bandeira_valor`, que em `src/lib/energia-rateio.ts` é R$/100 kWh), multiplica-se por 100. O engine e as faturas dos clientes não mudam de resultado.

3. **Compatibilidade com o que já foi salvo**
   - Ao carregar uma competência antiga, valores de `bandeira_tarifa_liquida` / `bandeira_tarifa_oficial` gravados em escala de 100 (heurística: valor ≥ 0,5) são convertidos para R$/kWh na exibição, e o registro é regravado na nova escala ao salvar. Assim nenhum mês já fechado muda de valor.

4. **Validação de divergência** continua comparando com o preço unitário das linhas de bandeira da fatura, agora na mesma escala (R$/kWh) — o que elimina a confusão atual de precisar multiplicar por 100 mentalmente.

## Detalhes técnicos

- Novo helper de escala (`toKwh` / `toCem`) usado nos pontos de leitura/gravação de `faturaItens.bandeira_tarifa_*`.
- `fmtBR(..., 4)` vira `fmtBR(..., 6)` nos campos de bandeira para não perder precisão em 0,025511.
- `grossUpBandeira` permanece igual (é linear, independe da escala).
- Nenhuma migração de banco: o campo continua sendo texto dentro do JSONB `fatura_copel_itens`.
