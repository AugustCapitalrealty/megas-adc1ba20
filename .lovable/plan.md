## Problema

Na tela **Monitoramento OC × NF**, ao clicar no card **"OC Liberada"** com filtro Mega Curitiba, os números aparecem desencontrados:

| Elemento | Valor mostrado | Unidade |
|---|---|---|
| Chip "Card: OC Liberada" | **9** | grupos (solicitações) |
| Chip "Recorte: OC Liberada · 9" (no header da Distribuição) | **9** | grupos — **duplica** a info do chip acima |
| Distribuição operacional | **6** pend. justif. + **3** adiado = **9** | **OCs** (não grupos) |
| Aba "Todas" | **9** | grupos |
| Aba "Pendência" | **6** | grupos |
| Aba "Justificadas" | **3** | grupos |
| Contador no canto superior | "3 sol. · 3 OCs" | reflete só a aba ativa |

O resultado parece coincidir (9 = 9), mas:
1. A **Distribuição conta OCs**, enquanto **abas e cards contam grupos** → semânticas misturadas.
2. O chip **"Recorte: OC Liberada · 9"** duplica visualmente o chip **"Card: OC Liberada"** já presente acima da tabela.
3. O contador "3 sol. · 3 OCs" mostra só o que está visível na tabela, sem contexto do total filtrado.
4. Card "OC Liberada" mostra **9** mas, ao ser clicado, parte dessas 9 nem aparecem em nenhuma aba (ex.: OCs com status `aguardando_nf` ou `em_prazo` não estão em `pendencia` nem em `justificadas`, só em "Todas").

## Solução

### 1. Padronizar todas as contagens em **grupos (solicitações)**

Hoje, `distribution` no hook conta OCs individuais (uma solicitação pode ter várias OCs). Como o resto da tela (cards, abas, tabela, chips) já trabalha com grupos, vamos alinhar a Distribuição também:

- Em `useMonitoramentoOC.ts` (e em `computeAggregates`), trocar o cálculo de `distribution` para contar **grupos** com base em `computeGroupStatus(group)`, não OCs individuais.
- Isto faz `pend. justif. + adiado` somar exatamente o mesmo número que os cards mostram.

### 2. Remover redundância do chip "Recorte" no header da Distribuição

- Em `MonitoramentoOC.tsx` linhas 406-411: remover o `Badge` "Recorte: OC Liberada · N" do `CardHeader` da Distribuição operacional.
- A informação já fica visível: o card de KPI ativo tem o anel azul (`ring-primary/40`) e o chip "Card: OC Liberada" aparece acima da tabela.

### 3. Tornar o contador do canto superior direito mais claro

Hoje mostra `"3 sol. · 3 OCs"` (só o filtro de aba). Trocar por algo que reflita o recorte completo:

- `"3 de 9 sol. · 3 OCs"` quando há filtro de aba ativo dentro do card.
- `"9 sol. · N OCs"` quando aba = "Todas".

Padrão: **{visível} de {total no recorte do card} sol. · {OCs visíveis} OCs**.

### 4. Ajustar a aba "Justificadas"

A aba "Justificadas" hoje só inclui `adiado`, `aguardando_nf` e `em_prazo`. Mas o card **"Justificadas"** conta grupos com pelo menos uma OC `adiado`. Isso causa divergência. Padronizar:

- Card "Justificadas" e aba "Justificadas" passam a usar a **mesma definição**: grupos cuja pior OC é `adiado` (já tem justificativa ativa com previsão futura). Removemos `aguardando_nf` e `em_prazo` da aba para alinhar com o card.
- Aba "Pendência" continua com `pendente_justificativa` + `atencao`.
- Aba "Todas" continua mostrando tudo (incluindo `aguardando_nf`, `em_prazo`, `cancel_solicitado`).

Assim, ao clicar no card "Justificadas", o número (3) bate exatamente com a aba "Justificadas" (3) e com a tabela (3 linhas).

### 5. Legenda da Distribuição operacional

Como a Distribuição passa a contar grupos pela pior OC, o segmento azul "adiado" passa a representar **grupos justificados** (mesma população do card "Justificadas") e o segmento vermelho "pend. justif." representa **grupos com pendência**. Manter os mesmos rótulos: `pend. justif.` e `adiado`.

## Arquivos afetados

- `src/hooks/useMonitoramentoOC.ts` — `computeAggregates` passa a contar grupos em `distribution` usando `computeGroupStatus`.
- `src/pages/MonitoramentoOC.tsx`:
  - Remover badge "Recorte: …" do header da Distribuição (linhas ~406-411).
  - Atualizar `TAB_STATUS.justificadas` para `['adiado']` apenas.
  - Atualizar contador "X sol. · Y OCs" para "X de Y sol. · Z OCs".

## Resultado esperado (mesmo cenário do print)

- Card "OC Liberada" ativo: **9**
- Distribuição operacional: **6** pend. justif. · **3** adiado (= 9, em grupos)
- Aba "Todas" 9 · "Pendência" 6 · "Justificadas" 3
- Aba "Justificadas" ativa → tabela mostra 3 linhas
- Contador: **"3 de 9 sol. · 3 OCs"**
- Sem chip duplicado de "Recorte" no header da Distribuição.

Tudo passa a falar a mesma língua: **grupos (solicitações)** em todos os indicadores.
