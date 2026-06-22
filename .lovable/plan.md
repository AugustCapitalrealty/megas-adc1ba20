## Dois ajustes na fatura

### 1. PIS/COFINS — base correta
Hoje calculo `piscofExibido = baseConsumoComPerdas × (pis_pct + cofins_pct) + parcela_demanda`. A regra correta é cobrar sobre o consumo **líquido de ICMS**:

- `basePiscofConsumo = baseConsumoComPerdas × (1 − icms_pct)`
- `piscofExibido = basePiscofConsumo × (pis_pct + cofins_pct) + piscofDemandaSum`
- `basePiscof = piscofExibido / piscofPct` (continua coerente com o que mostra na coluna "Base")

Aplicar apenas em `FaturaCard` (`src/components/admin/energia/FaturasTab.tsx`). Engine não muda.

### 2. Tarifa de Ultrapassagem — 2× a tarifa de demanda
Hoje uso `tarifas.ultrapassagem` direto. Quando esse campo não está preenchido (ou está com valor errado), a tarifa fica incorreta. Regra fixa do mercado livre: ultrapassagem = `2 × tarifas.demanda_usd`.

- Em `FaturaCard`: `tarifaUltrapassagem = tarifas.demanda_usd * 2` e `rsUltrapassagem = ultrapassagem * tarifaUltrapassagem`.
- Exibir essa tarifa derivada na coluna "Tarifa" da linha Ultrapassagem.

Engine e banco não mudam — é apresentação na fatura do cliente.
