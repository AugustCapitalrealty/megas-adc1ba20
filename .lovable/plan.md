## Objetivo

Voltar ao preenchimento simples: **não digitar tarifa ANEEL**. A tarifa da bandeira é lida do preço unitário das próprias linhas de bandeira da fatura Copel (ex.: `0,025511` R$/kWh, já com tributos), e o cálculo continua no modo **tarifa oficial** — cada cliente paga `(consumo + perdas rateadas) × tarifa`.

## O que muda em `src/components/admin/energia/FaturaCopelTab.tsx`

1. **Remover os campos de tarifa do card de bandeira**
   - Some o campo "Tarifa ANEEL — sem tributos".
   - Some o campo "Tarifa COM tributos — usada na cobrança" e o modo manual.
   - Some o aviso "a fatura traz X — usar o valor da fatura" (deixa de existir divergência, porque a fonte passa a ser a fatura).

2. **Fonte única da tarifa**
   - `bandeiraInfo.tarifaOficial` = preço unitário informado nas linhas de bandeira da fatura (`bandeira_*_ponta` / `bandeira_*_fora`).
   - Se nenhuma linha de bandeira tiver preço unitário digitado, cai na tabela ANEEL da bandeira vigente (`BANDEIRA_TABELA`, já com tributos) como valor de referência.
   - O seletor "Bandeira vigente" continua (serve de rótulo e fallback), sem mexer em campos de tarifa.

3. **Cálculo e alimentação do motor de rateio ficam iguais**
   - Continua `bandeira_valor = tarifa × 100` (o engine em `src/lib/energia-rateio.ts` trabalha em R$/100 kWh) — nenhum resultado de cliente muda quando a tarifa lançada é a mesma.
   - Os dois modos (`oficial` × `rateio fechado`) permanecem, com "oficial" como padrão.

4. **Cards comparativos e "Como é calculado"**
   - O card "Tarifa oficial" passa a mostrar uma linha só: tarifa (R$/kWh, da fatura), total cobrado dos clientes e sobra/falta vs. Copel.
   - Texto explicativo reduzido: a tarifa vem da fatura e é aplicada sobre consumo + perdas.

5. **Compatibilidade**
   - Competências já salvas continuam abrindo: os campos `bandeira_tarifa_liquida` / `bandeira_tarifa_manual` deixam de ser gravados; `bandeira_tarifa_oficial` continua sendo salvo (agora com a tarifa lida da fatura) para manter o histórico do que foi usado no fechamento.

## Detalhes técnicos

- Remover `BANDEIRA_TABELA_LIQUIDA`, `grossUpBandeira` e o helper de escala usado só por esses campos, se ficarem sem uso.
- `setBandeiraTipo` volta a apenas setar `bandeira_vigente`.
- Nenhuma migração de banco.
