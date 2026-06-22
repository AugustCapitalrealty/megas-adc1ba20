## Rateio de Perdas — embutir no Consumo da fatura (sem linha visível)

### Diagnóstico
A engine `src/lib/energia-rateio.ts` já calcula o rateio de perdas por módulo proporcional ao consumo (`AH/AI/AJ` e `rs_perdas` em `MemoriaLinha`), e `agruparPorCliente` já soma `rs_perdas` por cliente. O problema é apenas na **apresentação da fatura**:

- O `FaturaCard` calcula `total = totalFornecimento + ilum + credito + bandeira` **sem incluir `rs_perdas`**.
- A linha "Ponta" e "Fora Ponta" mostram `rsPonta`/`rsFora` puros, sem a perda embutida.
- Resultado: o cliente vê um total menor que o devido, e a perda some.

O cálculo já é auditável (gravado por linha na memória), só falta **embutir o valor no consumo exibido** e somar no total.

### O que vai mudar (apenas frontend / apresentação)

1. **`src/components/admin/energia/FaturasTab.tsx` — função `FaturaCard`**
   - Somar `rs_perdas_ponta` e `rs_perdas_fora` por cliente (já existem em `MemoriaLinha` como `rs_perdas_te_ponta + rs_perdas_tusd_ponta` e `_fora`).
   - Distribuir a perda dentro da própria linha de consumo:
     - `rsPontaExibido = rsPonta + rsPerdasPonta`
     - `rsForaExibido = rsFora + rsPerdasFora`
   - Recalcular tarifa exibida (R$/kWh) como `rsPontaExibido / consumoPonta` para manter coerência visual (kWh medido × tarifa exibida = valor exibido).
   - Incluir as perdas no `totalFornecimento` e portanto no `total` da fatura.
   - Não criar nenhuma linha "Perdas" no Bloco 2, Bloco 3 ou Bloco 4 — o cliente continua vendo apenas Ponta / Fora Ponta / Bandeira / Tributos / Total.

2. **`agruparPorCliente` em `src/lib/energia-rateio.ts`**
   - Adicionar campos auxiliares `rs_perdas_ponta` e `rs_perdas_fora` em `FaturaCliente` (separados de `rs_perdas`), para o `FaturaCard` distribuir corretamente entre as duas linhas. Mantém `rs_perdas` total para retrocompatibilidade.

3. **`copiarResumo` e `exportCSV`** (mesmo arquivo) — já somam `rs_consumo_total + rs_perdas`; manter como está, só conferir.

### Auditoria interna (sem mudar UX do cliente)

A engine já entrega a quebra por módulo (`MemoriaLinha.rs_perdas_te_ponta`, `_tusd_ponta`, `_te_fora`, `_tusd_fora`, `perdas_ponta_kwh`, `perdas_fora_kwh`). Essa quebra continua disponível na aba **Memória de Cálculo** e no CSV interno — atende ao requisito de "auditável internamente, invisível ao cliente".

### Persistência no banco (proposta — pedir confirmação antes)

Hoje os lançamentos guardam apenas o input cru (`consumo_ponta_kwh`, `consumo_fora_kwh`, etc.) e o cálculo é determinístico no cliente. Para o requisito do briefing ("gravar `valor_rateio_perdas` por lançamento") existem duas opções:

- **Opção A (recomendada, menor risco):** manter cálculo determinístico no front; nada a gravar. A auditoria já é reproduzível porque tarifas (`energia_competencia_tarifas`) e lançamentos são versionados por competência. Zero migração.
- **Opção B:** adicionar colunas `valor_consumo_puro_reais`, `valor_rateio_perdas_reais`, `valor_total_reais` em `energia_competencia_lancamentos`, populadas no fechamento da competência (status `fechada`) via trigger ou edge function. Migração + backfill.

**Pergunta para o usuário antes de codar:** seguir só com Opção A (apresentação) ou também aplicar Opção B (persistência)?

### Fora do escopo
- Geração de PDF do cliente (não existe rota separada; o "PDF" é o `window.print()` do próprio `FaturaCard`, então a mudança no card já cobre o PDF).
- Mudanças em `FaturaCopelTab` / `MemoriaCalculoTab` — continuam mostrando o detalhamento técnico interno.
