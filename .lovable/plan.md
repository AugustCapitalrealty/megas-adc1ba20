## Problema

A aba "Memória de Cálculo" hoje mostra **dois cards para a mesma coisa**:

1. "Tarifas Copel do mês" (campos genéricos) **e** "📄 Itens da Fatura Copel" (layout da fatura) → mesma informação.
2. "👥 Consumo por Cliente" **e** "Matriz por Módulo (72)" → mesma informação (a matriz é só uma visualização derivada).

Além disso, no card de Itens da Fatura a pessoa precisa digitar Valor, PIS/COFINS, ICMS e Tarifa unit. à mão — sendo que tudo isso pode ser calculado a partir de **Quantidade × Preço Unitário** e das **alíquotas cadastradas** (PIS/COFINS/ICMS já existem em `energia_parametros`).

## O que vai mudar

### 1. Manter apenas UM card de fatura: "📄 Itens da Fatura Copel"

Remover o card antigo "Tarifas Copel do mês" (bloco de inputs por grupo). A entrada da fatura passa a ser exclusivamente o card que segue o layout da fatura física.

### 2. Auto-cálculo no card "Itens da Fatura Copel"

A pessoa preenche **apenas 2 colunas por linha**:

- **Quant.** (kWh ou kW)
- **Preço unit (R$) com tributos**

O sistema calcula automaticamente:

- **Valor (R$)** = Quant × Preço unit
- **PIS/COFINS (R$)** = Valor × (pis% + cofins%) das alíquotas do cadastro
- **ICMS (R$)** = Valor × icms% do cadastro
- **Tarifa unit. (R$)** = Preço unit × (1 − pis% − cofins% − icms%) (preço "limpo")

Linha **CONT ILUMIN PUBLICA MUNICIPIO**: só campo Valor (sem quant/preço/tributos), como na fatura.

Tabela lateral de **Tributos** (ICMS / COFINS / PIS) é preenchida automaticamente:

- Base de Cálc. = soma dos valores das linhas tributáveis
- Alíquota = vem do cadastro (`energia_parametros`)
- Valor = Base × Alíquota

O **TOTAL Valor (R$)** continua sendo soma de todos os itens e bate com "TOTAL A PAGAR" da fatura.

Todos os campos seguem editáveis (override manual) caso a fatura traga arredondamento diferente, mas o default é o cálculo automático ao digitar Quant/Preço.

### 3. Remover "Matriz por Módulo" duplicada

A matriz read-only de módulos era apenas reflexo do rateio do "Consumo por Cliente". Vai sair da tela.

Permanece o card **"👥 Consumo por Cliente"** como única entrada (já com Demanda contratada vindo do contrato, demanda usada + consumo ponta + consumo fora por cliente, linha "Módulos Vagos → Mega" e validação contra os totais Copel).

O rateio para módulos individuais continua acontecendo no backend (`saveConsumoCli` distribui por área), só não é mais mostrado em tela.

### 4. Ordem final dos cards da aba

```text
1. ☀️ Fotovoltaico (kWh)
2. 📄 Itens da Fatura Copel   ← entrada única da fatura (auto-cálculo)
3. 👥 Consumo por Cliente     ← entrada única do consumo
4. (resumos/exports existentes)
```

## Detalhes técnicos

- Arquivo: `src/components/admin/energia/MemoriaCalculoTab.tsx`
  - Remover JSX do card "Tarifas Copel do mês" (linhas ~687–716) e tudo que só serve a ele (mapa `TARIFA_FIELDS`/`tarifaGroups` só nessa UI — checar antes de apagar, pois `tarifas` continua sendo usado para fotovoltaico e como totalizadores espelhados).
  - Manter `tarifas` no estado (ainda usado por fotovoltaico e por `calcularMemoria`). Os campos `copel_demanda_kw`, `copel_consumo_ponta_kwh`, `copel_consumo_fora_kwh` passam a ser **derivados** dos itens da fatura ao salvar (Quant da linha DEMANDA → `copel_demanda_kw`; Quant TE PONTA → `copel_consumo_ponta_kwh`; Quant TE F PONTA → `copel_consumo_fora_kwh`).
  - Remover o card "Matriz por Módulo" (linhas ~812–831) e a função interna `MatrizModulos` se não for usada em outro lugar.
- Componente `FaturaCopelCard`:
  - Adicionar prop `aliquotas: { pis: number; cofins: number; icms: number }` (vinda de `energia_parametros`).
  - Em `updateItem`, quando o campo alterado for `quant` ou `preco_unit`, recalcular `valor`, `pis_cofins`, `icms`, `tarifa_unit` no estado (sem sobrescrever se o usuário editar manualmente um campo derivado depois — ou seja, "auto" é o default ao mexer em Quant/Preço; mexer no derivado vira override).
  - Recalcular a tabela lateral de Tributos a partir das somas + alíquotas do cadastro.
- Carregar `energia_parametros` na aba para obter `pis_pct/cofins_pct/icms_pct` (já é o cadastro existente em `EnergiaCadastrosTab`).
- Sem migration nova: a estrutura `fatura_copel_itens` JSONB já comporta tudo. `consumo_por_cliente` JSONB e colunas espelhadas Copel continuam iguais.

## Aceite

- A aba mostra um único card de fatura (não dois).
- Digitar Quant e Preço unit em uma linha preenche sozinho Valor, PIS/COFINS, ICMS e Tarifa unit. usando as alíquotas do cadastro.
- TOTAL Valor confere com o TOTAL A PAGAR da fatura física.
- A "Matriz por Módulo (72)" não aparece mais; "Consumo por Cliente" continua sendo a entrada do mês.
- Fotovoltaico, contratos, grandezas contratadas e demais abas seguem funcionando.
