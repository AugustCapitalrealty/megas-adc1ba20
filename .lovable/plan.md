## Reestruturação das abas Rateio Energia

### Visão geral

Hoje a aba "Memória de Cálculo" acumula muita coisa: seleção de competência, entrada de consumo por cliente, tarifas, memória detalhada, totais e até resíduos da Fatura Copel. Com a "Fatura Copel" já isolada, vamos:

1. Renomear "Memória de Cálculo" → **"Lançamentos"** (focado em entrada de consumo do mês da Copel).
2. Refatorar a UX da aba para ficar limpa, guiada e visual.
3. Criar nova aba **"Faturas"** com a visão por cliente (o que cada um vai pagar).

```text
[ Lançamentos ] [ Fatura Copel ] [ Faturas ] [ Contratos ] [ Grandezas ] [ Cadastros ]
```

---

### 1. Aba "Lançamentos" (refatoração da Memória de Cálculo)

**Objetivo:** registrar o consumo do mês (por cliente / módulo) referente à competência da Fatura Copel já lançada.

**Layout proposto (top → bottom):**

- **Header sticky**
  - Seletor de competência (AAAA-MM) + status (Rascunho / Fechada)
  - Badge resumo da Fatura Copel do mês (Total R$, Demanda kW, Ponta kWh, Fora kWh) — read-only, link "Editar Fatura Copel"
  - Botões: "Nova competência", "Fechar competência", "Exportar PDF"

- **Stepper visual de 3 passos**
  1. **Fatura Copel** ✅ (preenchida na outra aba) — verde se ok, âmbar se faltando
  2. **Lançamentos do mês** (esta tela) — destacado
  3. **Faturas por cliente** → link para nova aba

- **Card "Consumo por Cliente / Módulo"**
  - Tabela enxuta: Cliente | Módulo | Demanda kW | Consumo Ponta | Consumo Fora | Ações
  - Linhas agrupadas por cliente, com subtotal
  - Linha especial "Área Comum" no topo
  - Botão "Distribuir Copel proporcionalmente" (rateio automático sugerido a partir dos totais Copel)
  - Validação visual: soma dos lançamentos vs total Copel (badge verde/amarelo)

- **Card "Memória de cálculo detalhada"** (colapsável, fechado por padrão)
  - Mantém a tabela técnica atual (linhas por módulo com TE, USD, ICMS, etc.)
  - Botão "Recalcular" e export

- **Footer sticky:** Total calculado | Total Copel | Diferença | Botão "Salvar lançamentos"

**Limpeza:**
- Remover totalmente o bloco "📄 Itens da Fatura Copel" e "Tributos" desta tela (já vivem na aba Fatura Copel).
- Remover duplicação do banner "Matriz por Módulo (72)" — manter apenas uma representação.

---

### 2. Nova aba "Faturas" (visão por cliente)

**Objetivo:** após Copel + lançamentos preenchidos, mostrar o que cada cliente paga.

**Layout:**

- **Header:** seletor de competência + KPIs (Total faturado, Nº clientes, Diferença vs Copel)
- **Sidebar de clientes (esquerda):** lista com nome + valor total, busca, badge de status
- **Painel principal (direita):** detalhe da fatura do cliente selecionado
  - Cabeçalho: Nome do cliente / Competência / Módulos vinculados
  - KPI cards: Demanda, Consumo Ponta, Consumo Fora, Total a Pagar
  - Tabela de composição: TE Ponta, USD Ponta, TE Fora, USD Fora, Demanda, ICMS, PIS/COFINS, Bandeira, Iluminação, Crédito FV — colunas (kWh/kW, R$ unit, R$ total)
  - Card "Como foi calculado": breve explicação textual com os parâmetros usados
  - Botões: "Exportar PDF da fatura", "Copiar resumo"

- **Modo "Todos os clientes":** tabela comparativa (Cliente | Demanda | Ponta | Fora | Total | % do mês)

**Fonte de dados:** reutiliza `agruparPorCliente(linhas, modulos)` já existente em `src/lib/energia-rateio.ts` — sem mudanças no engine.

---

### 3. Detalhes técnicos

- **Sem migração de banco.** Tudo já existe (`energia_competencia_lancamentos`, `energia_competencia_tarifas`, `fatura_copel_itens`).
- Novo arquivo: `src/components/admin/energia/FaturasTab.tsx` (visão por cliente).
- `MemoriaCalculoTab.tsx` será renomeado conceitualmente para "Lançamentos" — mantemos o arquivo para evitar quebrar imports, mas removemos toda a UI relacionada a itens Copel/tributos e reorganizamos os cards conforme acima. Extrair sub-componentes:
  - `LancamentosHeader.tsx` (seletor + resumo Copel + stepper)
  - `ConsumoClienteTable.tsx`
  - `MemoriaDetalhadaCollapsible.tsx`
- Atualizar `RateioEnergiaTab.tsx`: renomear label "Memória de Cálculo" → "Lançamentos", adicionar aba "Faturas" entre "Fatura Copel" e "Contratos".
- Manter export PDF existente.
- Cálculo permanece em `calcularMemoria` / `agruparPorCliente` (sem alterações de regra de negócio).

---

### 4. Fluxo final do usuário

1. Abre **Fatura Copel** → preenche quantidades e preços unitários do mês.
2. Vai para **Lançamentos** → vê o resumo Copel no topo, distribui consumo por cliente (manual ou rateio sugerido), salva.
3. Vai para **Faturas** → seleciona cliente e vê quanto ele paga, exporta PDF individual.
