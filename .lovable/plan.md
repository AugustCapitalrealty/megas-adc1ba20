## Refatorar Monitoramento OC x NF — Abas + Cards reativos + Tabela limpa

### 1. Substituir filtro de status por **abas estilo Solicitante/Backoffice**

Remover o `<Select>` de status e o filtro `pendente/aguardando_nf/adiado/cancelado/...`. Em vez disso, usar `TabsList` interno (segundo nível, abaixo da aba "OC x NF") com **apenas duas abas**:

- **Pendência de Justificativa** (status `pendente_justificativa` + `atencao` — tudo que precisa de ação do solicitante)
- **Justificadas** (status `adiado`, `aguardando_nf`, `em_prazo`, `cancel_solicitado`, `cancelado` — tudo que já tem tratativa)

Visual idêntico ao `MinhasSolicitacoes`: pills coloridas com contador (vermelho/âmbar para pendência, verde/azul para justificadas), responsivas ao filtro de empreendimento e busca.

### 2. Cards reativos ao filtro

Hoje os 4 KPIs e o card de "Distribuição operacional / Aging médio / Valor em aberto" mostram totais globais. Vou movê-los para **calcular sobre o conjunto filtrado** (`filteredGroups`) — se o usuário escolher Mega Curitiba, todos os números refletem só Curitiba.

Mudanças concretas no `useMonitoramentoOC.ts`:
- Extrair os cálculos de `kpis`, `distribution`, `valorEmAberto`, `agingMedio`, `topOfensores` para uma **função pura** `computeAggregates(groups)`.
- A página passa a calcular agregados em duas camadas:
  - **Globais** (sem filtro) — usados apenas para os badges de contagem das abas.
  - **Filtrados** (com empreendimento + busca aplicados, mas SEM o filtro de aba) — alimentam KPIs, distribuição, aging médio, valor em aberto, top ofensores.
- Adicionar um indicador sutil quando o filtro está ativo (ex: "Mega Curitiba · 12 OCs" no header dos cards).

### 3. Limpar a tabela (Justificar / Cancelar / Histórico)

Problema atual: 3 botões-ícone enfileirados sem rótulo, fáceis de confundir.

Mudanças:
- **Coluna Ações com largura mínima fixa** e botões com **texto + ícone** em vez de só ícone, mas compactos (`size="sm"`, `h-7 px-2`):
  - `Justificar` (âmbar, só aparece quando há pendência) — `AlertCircle`
  - `Cancelar` (vermelho outline) — `XOctagon`
  - Menu kebab `⋯` para ações secundárias (Histórico, Ver detalhes) — usando `DropdownMenu`
- Remover algumas colunas redundantes para diminuir poluição:
  - Mesclar **OC + Aging** numa coluna só: `035132` em cima, `52d` embaixo como pílula.
  - Mesclar **Status + Última ação** numa coluna só: badge em cima, "Justificativa há 22 dias" embaixo.
  - Resultado: tabela vai de **11 colunas para 8** (Expand · Protocolo · Solicitante · Empreendimento · Fornecedor · Valor · OC/Aging · Status/Ação · Ações).
- Aplicar zebra striping mais sutil e remover o `bg-destructive/[0.04]` da linha inteira (substituir por borda esquerda colorida `border-l-2`) — fica menos "chamativo" sem perder a indicação visual.

### 4. Detalhes técnicos

**Arquivos a editar:**
- `src/pages/MonitoramentoOC.tsx` — reestrutura toolbar (remove select de status), adiciona `Tabs` internas, refatora coluna de ações com `DropdownMenu`, mescla colunas.
- `src/hooks/useMonitoramentoOC.ts` — extrai `computeAggregates` para receber array de grupos arbitrário (permite passar filtrado ou completo).

**Mapeamento de abas → status:**
```ts
const TAB_STATUS_MAP = {
  pendencia: ['pendente_justificativa', 'atencao'],
  justificadas: ['adiado', 'aguardando_nf', 'em_prazo', 'cancel_solicitado', 'cancelado'],
};
```

**Nada removido do banco** — só UI.

### Resumo do resultado esperado

- 2 abas grandes coloridas (Pendência / Justificadas) com badges, igual ao padrão Solicitante/Backoffice.
- Filtro de empreendimento e busca **modificam todos os cards e KPIs em tempo real**.
- Tabela mais enxuta: 8 colunas, ações com label, kebab para secundárias.
