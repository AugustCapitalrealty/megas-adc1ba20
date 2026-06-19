## Objetivo

(1) Alinhar **Grandezas Contratadas** ao bloco real do contrato Copel; (2) criar entrada mensal dos **Itens da Fatura Copel**; (3) **agrupar cobrança por cliente** (Mercado Livre = 1 fatura para N módulos); (4) deixar claros os 3 inputs mensais por linha: **Demanda Usada (kW), Consumo Ponta (kWh), Consumo Fora Ponta (kWh)** — o resto é cálculo.

---

## Vocabulário Copel (aprendido da fatura)

**GRANDEZAS CONTRATADAS** = bloco fixo do contrato com a concessionária. Só muda quando renegocia.
- Demanda Todos os Períodos (kW) — hoje **750**
- Demanda Fora Ponta, Energia Ponta, Energia Fora Ponta, Res. Capacidade Ponta/Fora, Montante Ponta/Fora — hoje **0**

**Demanda Contratada** ≠ **Demanda Usada/Medida**. A contratada é do contrato; a usada é a medição mensal e gera USD/Isenta/Ultrapassagem.

**ITENS DE FATURA** (6 linhas digitadas mês a mês a partir do PDF):
TE Ponta, USD Ponta, TE Fora Ponta, USD Fora Ponta, Demanda USD, Iluminação Pública — cada uma com Quant, Preço unit c/ trib, Valor, PIS/COFINS, ICMS, Tarifa unit.

**Tributos consolidados** ICMS / PIS / COFINS (base, alíquota, valor).
**SCEE / Fotovoltaico**: saldos mês ponta/fora, acumulado ponta/fora, a expirar próximo mês.
**Bandeira**: verde/amarela/vermelha 1/vermelha 2.

---

## Plano

### 1. Aba "Grandezas Contratadas" — só contrato Copel

Reescrever `src/components/admin/energia/GrandezasContratadasTab.tsx`:
- Form enxuto: Vigência + 8 grandezas contratadas. Demanda TP default **750**, totalmente editável.
- Listagem: Vigência | Demanda TP | Demanda FP | badge "Vigente".
- Remover do form: tarifas TE/TUSD, iluminação, bandeira, PIS/COFINS/ICMS (passam para a fatura mensal).

Migração `energia_grandezas_contratadas`:
- Adicionar colunas: `demanda_fora_ponta_kw`, `energia_ponta_kwh`, `energia_fora_ponta_kwh`, `res_capacidade_ponta_kw`, `res_capacidade_fora_ponta_kw`, `montante_ponta_kw`, `montante_fora_ponta_kw` (numeric, default 0).
- Seed: se não houver vigência aberta, inserir uma com `demanda_contratada_kw = 750`.
- Colunas antigas de tarifa permanecem (compat), mas saem do form.

### 2. Aba mensal "Fatura Copel" (Comparativo Copel)

Novo `FaturaCopelTab.tsx` dentro da página de Rateio, por competência. Admin digita direto do PDF:
- Cabeçalho: Mês/Ano, Vencimento, Total a Pagar, Leitura ant/atual/dias/próxima, Bandeira vigente.
- 6 itens da fatura (linhas fixas) com colunas Quant, Preço unit c/trib, Valor, PIS/COFINS, ICMS, Tarifa unit.
- 3 tributos consolidados ICMS/PIS/COFINS (base, alíquota %, valor).
- Saldos SCEE da fatura (ponta/fora — mês, acumulado, expira próximo).

Nova tabela `energia_competencia_fatura_copel` (1‑para‑1 com `energia_competencias`) + RLS + GRANTs (admin/backoffice manage, authenticated read, service_role all).

### 3. Cobrança POR CLIENTE (não por módulo)

Mudança conceitual: a unidade de **cobrança** é o cliente. Um cliente (ex.: Mercado Livre) pode ocupar N módulos — recebe **1 fatura** que soma o consumo/demanda/área de todos os módulos dele.

Alterações:

**a) Engine `src/lib/energia-rateio.ts`**
- Continua recebendo `EnergiaLancamentoInput[]` por módulo (granularidade do medidor/contrato).
- Nova função `agruparPorCliente(MemoriaResultado)` que soma todas as linhas de mesmo `cliente_id` (ou agrupa "sem cliente" / "Área Comum" separados). Retorna `FaturaCliente[]` com todos os campos somados + área somada + lista de módulos.

**b) UI**
- **Matriz por Módulo** (já existe) — visão operacional, continua igual.
- Nova aba **"Fatura por Cliente"** — uma linha por cliente, expansível para mostrar os módulos que compõem. Esta é a tela impressa/enviada ao cliente.
- PDF de cobrança (`src/lib/rateio-pdf.ts`) — gerar por cliente, não por módulo.

**c) Edição dos inputs mensais** continua **por módulo** (cada módulo tem seu medidor). A consolidação é só na visualização e cobrança.

### 4. Os 3 inputs mensais por módulo

Manter na Matriz por Módulo apenas estes 3 campos editáveis (fundo amarelo já existente):
- **Demanda Usada (kW)** — `demanda_usd_medida_kw` (G)
- **Consumo Ponta (kWh)** — `consumo_ponta_kwh` (Q)
- **Consumo Fora Ponta (kWh)** — `consumo_fora_kwh` (T)

Tudo o mais (USD, Isenta, Ultrapassagem, R$ TE/TUSD, ICMS, PIS/COFINS, perdas, bandeira, IP, totais) é **calculado**. Já é o comportamento atual — vamos reforçar visualmente: tornar somente esses 3 inputs editáveis, demais colunas read-only com `tabular-nums`.

`demanda_contratada_kw` (F) por módulo continua vindo do **contrato/módulo** (não é input mensal). Mostrar como read-only.

### 5. Origem das tarifas para o cálculo

`MemoriaCalculoTab` monta `EnergiaTarifas` a partir de **Fatura Copel da competência** (tarifa unit. dos itens). Fallback: se a fatura do mês não estiver preenchida, usa `energia_grandezas_contratadas` antigas (compat). Aviso visual quando estiver em fallback.

### 6. Saldo Fotovoltaico — carry-over

Já existe trigger `energia_propagar_saldo_fotovoltaico`. Adicionar: quando `energia_competencia_fatura_copel` é salva com saldo SCEE acumulado, sincronizar `fotovoltaico_saldo_final_*` da competência → próxima.

### 7. Validação visual

Card de competência: **Total da Fatura Copel (digitado)** vs **Soma das Faturas por Cliente (calculado)**. Diferença em R$ e %. Badge âmbar se ≠ 0.

---

## Detalhes técnicos

**Migrações (uma só):**
1. `ALTER energia_grandezas_contratadas ADD COLUMN ...` (7 colunas).
2. `INSERT INTO energia_grandezas_contratadas` seed Demanda 750 (se vazia).
3. `CREATE TABLE energia_competencia_fatura_copel (...)` + GRANT authenticated/service_role + RLS + policies + trigger updated_at.

**Frontend:**
- Reescreve: `GrandezasContratadasTab.tsx`.
- Cria: `FaturaCopelTab.tsx`, `FaturaPorClienteTab.tsx`.
- Edita: `MemoriaCalculoTab.tsx` (lê tarifas da fatura, marca apenas 3 inputs como editáveis, adiciona aba "Fatura por Cliente").
- Edita: `src/lib/energia-rateio.ts` — adiciona `agruparPorCliente()`.
- Edita: `src/lib/rateio-pdf.ts` — gera PDF por cliente.

**Não muda:**
- Página `/admin/rateio-energia` (shell).
- `energia_modulos` (72 módulos carregados).
- Lógica de fotovoltaico abater Área Comum.
