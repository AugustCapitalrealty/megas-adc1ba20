## Ajuste — embutir perdas também nas colunas de kWh e na base dos impostos

### O que está errado hoje
Embutimos as perdas apenas nas colunas R$ de Ponta / Fora Ponta. As colunas **Medido**, **Faturado** e **Consumo Total (kWh)**, e também a **base** de PIS/COFINS e ICMS, continuam mostrando o valor sem o rateio. Isso quebra a coerência visual (kWh × tarifa ≠ R$).

### Mudança (somente `FaturaCard` em `src/components/admin/energia/FaturasTab.tsx`)

1. **Somar perdas em kWh por cliente** a partir de `MemoriaLinha`:
   - `perdasPontaKwh = sum('perdas_ponta_kwh')`
   - `perdasForaKwh = sum('perdas_fora_kwh')`

2. **Linhas Ponta / Fora Ponta** — exibir kWh com perdas embutido:
   - `medido` e `faturado` da linha Ponta = `consumoPonta + perdasPontaKwh`
   - `medido` e `faturado` da linha Fora Ponta = `consumoFora + perdasForaKwh`
   - Tarifa exibida continua sendo `rsExibido / kWhExibido` (mantém a identidade kWh × tarifa = valor).

3. **Bloco 3 — Consumo Total (kWh)**:
   - `consumoTotalExibido = (consumoPonta + perdasPontaKwh) + (consumoFora + perdasForaKwh)`

4. **Bloco 4 — Base dos impostos** (PIS/COFINS e ICMS):
   - Recalcular a partir do novo consumo R$ com perdas: `baseConsumo = rsPontaExibido + rsForaExibido`.
   - `piscofExibido = baseConsumo × (pis_pct + cofins_pct)` (mais a parcela de demanda que já existe — `piscof_demanda + piscof_demanda_isenta` somadas do bucket).
   - `icmsExibido = baseConsumo × icms_pct` (mais a parcela de demanda existente).
   - A base mostrada na coluna "Base" passa a refletir o consumo R$ com perdas.
   - PIS/COFINS e ICMS continuam informativos (não somam no TOTAL, como já é hoje).

5. **Total** continua: `totalFornecimento + ilum + credito + bandeira` — já correto desde a última alteração.

### Fora do escopo
- Nenhuma mudança na engine (`energia-rateio.ts`) ou no banco.
- Memória de Cálculo segue mostrando a quebra técnica (consumo puro + perdas separados) para auditoria.
