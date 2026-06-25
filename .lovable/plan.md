
## Contexto — o que mudou entre as 3 faturas

Comparando os blocos "Itens de fatura":

| Item                              | Fat 01/2026 | Fat 02/2026 | Fat 03/2026 |
|-----------------------------------|:-----------:|:-----------:|:-----------:|
| ENERGIA TE PONTA                  | ✔           | ✔           | ✔           |
| ENERGIA USD PONTA                 | ✔           | ✔           | ✔           |
| ENERGIA TE F PONTA                | ✔           | ✔           | ✔           |
| ENERGIA USD F PONTA               | ✔           | ✔           | ✔           |
| DEMANDA USD                       | ✔           | ✔           | ✔           |
| DEMANDA USD ULTRAP                | —           | ✔ (48,33 kW)| —           |
| DEMANDA USD ISENTA ICMS           | —           | —           | ✔ (3,51 kW) |
| CONT ILUMIN PUBLICA MUNICIPIO     | ✔           | ✔           | ✔ (98,17)   |
| Devolução SCEE (geração FV)       | ✔ (28 PT / 135 FP) | —    | —           |
| Bandeira tarifária (Amarela/Vermelha) | Amarela 12/25 | Verde   | Verde       |
| Energia reativa excedente         | —           | —           | —           |
| Juros / Multa / Atual. monetária  | —           | —           | —           |

Ou seja, há um **núcleo fixo** (4 energias + Demanda USD) e um conjunto de **itens opcionais** que aparecem dependendo de eventos: ultrapassagem, isenção ICMS por geração FV, devolução SCEE, bandeira amarela/vermelha, reativo excedente, juros, CIP em alguns casos.

## Solução proposta

Substituir a lista fixa de campos no `FaturaCopelTab` por um **catálogo de itens de fatura** com itens "core" (sempre presentes) + "opcionais" (toggle por fatura).

### 1. Catálogo de itens (constante em `src/lib/energia-itens-fatura.ts`)

Cada item tem: `codigo`, `descricao`, `unidade` (kWh/kW/—), `categoria` (energia | demanda | bandeira | scee | encargo | ajuste), `tributacao` (full | isento_icms | isento_pis_cofins | sem_tributo), `sinal` (+1 / –1 para devoluções/créditos), `obrigatorio` (boolean).

Catálogo inicial:
- **Obrigatórios:** ENERGIA TE PONTA, ENERGIA USD PONTA, ENERGIA TE F PONTA, ENERGIA USD F PONTA, DEMANDA USD
- **Opcionais:**
  - DEMANDA USD ULTRAP (kW, full)
  - DEMANDA USD ISENTA ICMS (kW, isento_icms) — usa preço sem ICMS
  - CONT ILUMIN PUBLICA MUNICIPIO (—, sem_tributo) — valor fixo
  - ADICIONAL BANDEIRA AMARELA / VERMELHA P1 / VERMELHA P2 (kWh, full)
  - ENERGIA REATIVA EXCEDENTE PONTA / F PONTA (kVArh, full)
  - DEVOLUÇÃO SCEE PONTA / F PONTA (kWh, sinal –1, isento_icms_pis_cofins conforme regra)
  - JUROS DE MORA, MULTA, ATUALIZAÇÃO MONETÁRIA (—, sem_tributo)
  - OUTROS (campo livre)

### 2. Banco — campo JSONB `itens_extras` em `energia_competencia_tarifas` (ou tabela própria)

Adicionar coluna `itens_extras jsonb default '[]'` na tabela de tarifas/lançamentos Copel onde hoje moram os campos fixos. Cada elemento:
```json
{ "codigo": "DEMANDA_USD_ULTRAP", "quantidade": 48.33, "preco_unit": 56.538175,
  "valor": 2732.49, "pis_cofins": 204.73, "icms": 519.17, "tarifa_unit": 41.56 }
```
Migration única adicionando a coluna (com GRANTs revistos só se necessário — coluna não muda policies).

### 3. UI — `FaturaCopelTab.tsx`

- Os 5 itens obrigatórios continuam renderizados como hoje.
- Abaixo, nova seção **"Itens adicionais da fatura"** com:
  - Botão **"+ Adicionar item"** abrindo dropdown com o catálogo de opcionais.
  - Cada item adicionado vira uma linha editável (descrição read-only, quantidade, preço unit, valor — com o mesmo cálculo PIS/COFINS/ICMS já corrigido, respeitando `tributacao` do catálogo) e botão de remover.
- Totalizador soma todos os itens (obrigatórios + extras), respeitando `sinal` para devoluções.

### 4. Regras de cálculo por `tributacao`

- `full`: PIS/COFINS sobre (valor × (1−ICMS)); ICMS sobre valor. Já é o cálculo atual.
- `isento_icms`: ICMS = 0; PIS/COFINS sobre valor cheio.
- `isento_pis_cofins`: PIS/COFINS = 0.
- `sem_tributo`: zero tributos (CIP, juros, multa).
- Sinal –1 (devolução SCEE) subtrai do total e dos tributos.

### 5. Memória de cálculo e rateio

`src/lib/energia-rateio.ts` hoje consome os campos fixos. Atualizar `EnergiaLancamentoInput` para receber `itens_extras` e somar no cálculo do módulo (rateando pelo mesmo critério já usado para Demanda/Energia conforme `categoria`):
- `energia` → rateia por consumo kWh do módulo
- `demanda` → rateia por demanda contratada do módulo
- `bandeira` → rateia por kWh
- `scee` → rateia por kWh (com sinal negativo)
- `encargo`/`ajuste` (CIP, juros, multa) → rateia por valor total ou por módulo conforme parâmetro global (default: proporcional ao valor)

## Detalhes técnicos

- Arquivos a criar: `src/lib/energia-itens-fatura.ts` (catálogo + helpers de cálculo por tributação).
- Arquivos a alterar: `FaturaCopelTab.tsx` (UI + load/save de `itens_extras`), `MemoriaCalculoTab.tsx` e `energia-rateio.ts` (somar extras no cálculo por módulo), `useEffect` de recálculo já existente passa a iterar também sobre `itens_extras`.
- Migration: `ALTER TABLE energia_competencia_tarifas ADD COLUMN itens_extras jsonb NOT NULL DEFAULT '[]'::jsonb;` (sem mudança de RLS).
- Faturas antigas: `itens_extras` default `[]` mantém comportamento atual; usuário adiciona itens manualmente quando necessário.
- Sem mudança no Lovable Cloud auth/RLS.

## Pergunta que ainda preciso confirmar antes de codar

Os **itens opcionais** devem ser:
(a) **manuais** — usuário adiciona via "+ Adicionar item" quando ler a fatura, ou
(b) **sempre visíveis como linhas zeradas** com toggle on/off, ou
(c) **híbrido** — alguns mais frequentes (CIP, Ultrapassagem, Bandeira) sempre visíveis, e o resto via botão "+"?

Minha recomendação é **(c)**, mas confirme antes de eu implementar.
