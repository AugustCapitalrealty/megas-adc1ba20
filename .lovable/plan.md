
## Objetivo

Corrigir 4 problemas na Fatura por Cliente (`FaturasTab.tsx`) e na engine de cálculo (`energia-rateio.ts`):

1. **Demanda contratada é por cliente, não por módulo** — hoje aparece 840 kW (7 × 120) quando o contrato do cliente diz 120 kW.
2. **Demanda Isenta de ICMS** seguindo a regra: `max(contratada - medida, 0)` aplicada **uma vez por cliente**, nunca negativa.
3. **Tarifa de Mercado Livre (R$ 19,805217)** está sendo trocada pela tarifa Copel cativo (R$ 27,603090). A engine precisa usar a tarifa do **contrato/Mercado Livre**, não a da Fatura Copel.
4. **Resumo da Conta** com colunas desalinhadas — "Medido" e "Valores" precisam respeitar as mesmas colunas da tabela de Demanda/Consumo acima.

---

## 1. Demanda por cliente (não por módulo)

### Hoje
`FaturasTab.tsx` cria 1 input por módulo, cada um com `demanda_contratada_kw` vindo do contrato vinculado. Na hora de exibir, a função `sum('demanda_contratada')` soma todas as linhas → 7 × 120 = 840.

### Correção
Manter o cálculo **por linha** na memória (compat. com a aba Memória de Cálculo), mas na **Fatura do Cliente**:

- Em vez de `sum('demanda_contratada')`, pegar **um único valor** vindo do contrato do cliente. Se houver mais de um contrato distinto vinculado aos módulos do cliente, somar os contratos **distintos** (e não os módulos).
- O mesmo vale para `demanda_isenta` e `rs_demanda_isenta`: recalcular no nível cliente usando `contratada_cliente` e `sum(demanda_usd)` dos módulos:
  - `demandaContratadaCliente = soma das demandas contratadas dos contratos únicos do cliente`
  - `demandaMedidaCliente = sum('demanda_usd')` (continua igual, é por módulo)
  - `demandaIsentaCliente = Math.max(demandaContratadaCliente - demandaMedidaCliente, 0)`
  - `ultrapassagemCliente = Math.max(demandaMedidaCliente - demandaContratadaCliente, 0)`

Implementação prática:

- `FaturasTab.tsx` passará a `FaturaOficial` um objeto extra `demandaContrato` com `{ contratada, isenta, ultrapassagem }` calculado a partir de `contratoPorModulo` deduplicado por `contrato_id`.
- `FaturaOficial` usará esses valores nas linhas "Demanda USD", "Demanda USD Isenta ICMS" e "Ultrapassagem" — **substituindo** `sum('demanda_contratada')`, `sum('demanda_isenta')` e `sum('ultrapassagem')`.

> A query `vinc` em `fetchCompData` já traz `contrato:energia_contratos!inner(...)`. Vou ampliar para retornar `contrato.id` e armazenar `contratoIdPorModulo`, permitindo deduplicar contratos por cliente.

### Engine (`energia-rateio.ts`)
A linha por módulo continua usando F = `demanda_contratada_kw` (já é o valor do contrato). Como cada módulo do mesmo cliente recebe a **mesma** F do contrato, o cálculo de J/K/L da memória de cálculo (auditável) fica como está — quem corrige é a camada de agregação por cliente. Não há alteração na engine para o item 1.

---

## 2. Demanda Isenta — comentado conforme spec

A regra pedida é exatamente a do item 1 (aplicada por cliente):

```ts
// Calcula a Demanda Isenta de ICMS conforme decisão judicial brasileira.
// ICMS só incide sobre a demanda efetivamente utilizada; a sobra entre
// contratada e medida fica isenta. Nunca retorna valor negativo.
function calcularDemandaIsentaIcms(contratada: number, utilizada: number): number {
  if (utilizada >= contratada) return 0;       // Cenário B: consumiu tudo
  return contratada - utilizada;                // Cenário A: sobra isenta
}
```

Usada em `FaturasTab.tsx` no nível cliente. A engine por módulo já implementa essa mesma fórmula (`H = G <= F ? F - G : 0`) e fica como está.

---

## 3. Tarifa de Mercado Livre

### Diagnóstico
- A tabela `energia_competencia_tarifas` tem **um único** conjunto de tarifas (`demanda_usd`, `te_ponta`, `tusd_ponta`...) que a engine consome.
- Hoje, `FaturaCopelTab.tsx` (linhas 173-177) e `MemoriaCalculoTab.tsx` (linha 482) sobrescrevem `demanda_usd`, `te_ponta`, `tusd_ponta`, `te_fora`, `tusd_fora` com a **tarifa unitária pós-tributos da Copel** (cativo).
- Mas a engine deveria estar usando a tarifa do **Mercado Livre** (contrato Energy), que é distinta — ex.: Demanda USD ML = R$ 19,805217 vs Copel = R$ 27,603090.

### Correção
Existem duas formas. Vou propor a mais simples e auditável:

**Opção A — Tarifas ML editáveis na competência (recomendada)**
- Não mexer no `FaturaCopelTab` (continua mirando os valores Copel, mas em **novos campos** dedicados `copel_tarifa_*` em vez dos campos compartilhados).
- Os campos `demanda_usd`, `te_ponta`, `tusd_ponta`, `te_fora`, `tusd_fora` da `energia_competencia_tarifas` passam a ser **somente** as tarifas Mercado Livre (já são editáveis na aba Memória de Cálculo).
- **Migration**: adicionar colunas `copel_tarifa_demanda_usd`, `copel_tarifa_te_ponta`, `copel_tarifa_tusd_ponta`, `copel_tarifa_te_fora`, `copel_tarifa_tusd_fora` em `energia_competencia_tarifas`.
- Em `FaturaCopelTab.tsx` (e no `MemoriaCalculoTab.tsx` no bloco "Editar Fatura Copel"), trocar o mirror para essas novas colunas. Remover a sobrescrita das tarifas ML.
- A engine continua intacta.
- Na aba Memória de Cálculo, os campos `demanda_usd`/`te_ponta`/... ganham um rótulo explícito **"Tarifa Mercado Livre"** e ficam editáveis (já são).

**Opção B — Puxar tarifa do contrato**
- Usar `energia_grandezas_contratadas.tarifa_demanda_usd` por vigência. Hoje está zerado (1 registro com tudo 0), e os campos `te_ponta`/`tusd_ponta` não existem ali. Requer popular esses dados e refatorar a engine para receber tarifas por contrato. Mais invasivo; deixo como Etapa 2 futura.

→ Sigo com **Opção A** salvo se você preferir B.

---

## 4. Resumo da Conta com colunas alinhadas

### Hoje
Tabela 2 colunas livres (rótulo / valor), enquanto a tabela superior tem 6 colunas (Medido, Contratado, Faturado, Tarifa, Valores).

### Correção
Reusar a mesma estrutura de 6 colunas (vazia onde não se aplica):

```text
              | Medido     | Contratado | Faturado | Tarifa | Valores (R$)
Consumo Total | xxx kWh    |            |          |        |
Total Fornec. |            |            |          |        | R$ xxx
```

Implementar como `<DataRow>` reaproveitando o componente existente; o valor "Total Fornecimento" usa apenas a coluna **Valores**, e "Consumo Total (kWh)" usa apenas **Medido**.

---

## Arquivos afetados

- **Migration nova** — adicionar colunas `copel_tarifa_*` em `energia_competencia_tarifas` (5 colunas numeric).
- **`src/components/admin/energia/FaturaCopelTab.tsx`** — trocar o mirror das tarifas para `copel_tarifa_*` (não sobrescrever mais `demanda_usd`/`te_*`/`tusd_*`).
- **`src/components/admin/energia/MemoriaCalculoTab.tsx`** — mesmo ajuste no bloco "Editar Fatura Copel" (linha ~482); deixar explícito que os campos `demanda_usd`/`te_*`/`tusd_*` são as **Tarifas Mercado Livre**.
- **`src/components/admin/energia/FaturasTab.tsx`**:
  - `fetchCompData`: ampliar query `vinc` para trazer `contrato.id`; armazenar `contratoIdPorModulo`.
  - `FaturaOficial`: receber `demandaContrato` calculado por cliente (contratos únicos), aplicar a fórmula de isenta/ultrapassagem aqui, e reorganizar o bloco "Resumo da Conta" no formato 6 colunas alinhado.
- **`src/lib/energia-rateio.ts`** — sem mudanças.

## Fora do escopo

- Não altero `RateioEnergiaTab`, `MemoriaCalculoTab` (engine), `ContratosTab`, `EnergiaCadastrosTab`.
- Não vou popular as `energia_grandezas_contratadas` (Opção B) — fica para outra rodada se quiser.
