# Melhorias de UI/UX no Calendário

Após revisar `CalendarioServicos.tsx`, `CalendarioGrid.tsx`, `DiaServicosSheet.tsx`, `ServicoChip.tsx` e o hook, identifiquei melhorias agrupadas por impacto. A ideia é entregar tudo em uma rodada, sem quebrar a estrutura atual.

## 1. Visualização principal (grade do mês)

- **Modos de visualização (toggle)**: adicionar grupo de botões `Mês / Semana / Lista (agenda)` no toolbar.
  - **Semana**: mesma grade, mas só 7 dias da semana atual — ideal no viewport 1078px do usuário.
  - **Lista (agenda)**: tabela vertical agrupada por dia, com chips e valor total — útil para quem quer ler rápido sem clicar célula a célula.
- **Densidade**: toggle `Compacto / Confortável` (altera `min-h` da célula e mostra 2 vs 4 chips antes do "+N mais").
- **Linha de "hoje"**: além do anel atual, destacar a coluna do dia da semana de hoje no header (sutil, com `text-primary`).
- **Fim de semana**: já temos cinza; adicionar um pequeno rótulo "Fim de semana" no tooltip do dia para reforçar contexto quando há serviço agendado em sábado/domingo (alerta visual amarelo).

## 2. Chips do dia

- **Hierarquia por valor/risco**: ordenar chips dentro do dia por prioridade — `previsao_sem_oc_risco` → `atrasado` → `aguardando_nf` → demais. Hoje a ordem é a do fetch.
- **Soma do dia**: substituir o contador numérico no canto superior direito da célula por um mini-resumo: `3 · R$ 12k` (qtd · valor total formatado curto).
- **Mini-barra de status**: na borda inferior da célula, uma barra de 2px composta por segmentos coloridos proporcionais aos status presentes (visão "macro" sem precisar ler cada chip).
- **Chip de contrato mensal**: adicionar prefixo `↻` (já existe `Repeat` no lucide) para diferenciar de pontuais à primeira vista.
- **"+N mais"**: tornar clicável (abre o sheet do dia diretamente, sem precisar clicar na célula vazia).

## 3. Toolbar e filtros

- **Busca rápida**: input com ícone de lupa (`Search`) que filtra por protocolo / fornecedor / solicitante. Debounce de 200ms.
- **Filtro "Apenas com risco"**: switch único que combina `previsao_sem_oc_risco + atrasado` (atalho para o caso de uso mais comum).
- **Chips de filtros ativos**: abaixo do toolbar, mostrar pills removíveis (`Empreendimento: Mega Canoas ×`) — hoje só temos contagem dentro do popover.
- **Persistência**: salvar estado dos filtros e modo de visualização em `localStorage` por usuário (chave `calendario:prefs:v1`).

## 4. Sheet do dia (detalhes)

- **Resumo no topo**: cards horizontais com `Total de serviços / Valor total / Em risco` antes da lista.
- **Agrupamento**: separar em seções `Iniciando hoje`, `Em andamento (período)`, `Encerrando hoje`, `Pontuais`.
- **Ações rápidas no card**: além de "Ver detalhes", adicionar botão de copiar protocolo (`Copy`) e link direto para a OC no Fluig (quando houver `numero_oc`).
- **Navegação dia-a-dia**: botões `←` / `→` no header do sheet para ir ao dia anterior/seguinte sem fechar.

## 5. KPIs

- **Tendência**: pequena seta `▲ +3 vs semana passada` em `Atrasados` e `Sem OC (em risco)` (compara semana atual vs anterior, dentro dos serviços já carregados).
- **Estado vazio**: quando KPI for 0, mostrar valor cinza claro (não destacar como destrutivo).
- **Mobile**: no breakpoint `<lg`, transformar em carrossel horizontal scrollável em vez de quebrar em 2 colunas (evita altura excessiva).

## 6. Acessibilidade e polimento

- **`aria-label` por célula**: descrever data, qtd de serviços e principal status (`"15 de janeiro, 3 serviços, 1 atrasado"`).
- **Foco por teclado**: navegação com setas entre células (`role="grid"`).
- **Loading skeleton**: substituir o spinner de tela cheia por skeleton da própria grade — preserva contexto e reduz CLS.
- **Empty state**: quando filtros zeram resultados, mostrar ilustração + botão "Limpar filtros" centralizado dentro da grade (atualmente fica vazio sem feedback).

## 7. Pequenos ajustes técnicos

- Memoizar `LEGEND_ITEMS.map(...)` em `MultiFilter` (evita recriar array a cada render).
- Mover `getCategoria` para fora do componente (já é puro).
- Adicionar tipagem genérica em `MultiFilter` (`<T extends string>`) em vez de `Set<string>` casteado.
- `useCalendarioServicos`: cancelar fetch antigo via `AbortController` ao trocar mês rapidamente.

## Arquivos afetados

- `src/components/monitoramento/calendario/CalendarioServicos.tsx` — toolbar, busca, modos, persistência, chips de filtros ativos.
- `src/components/monitoramento/calendario/CalendarioGrid.tsx` — soma do dia, mini-barra, ordenação, "+N mais" clicável, a11y.
- `src/components/monitoramento/calendario/CalendarioSemana.tsx` — **novo**, view semanal.
- `src/components/monitoramento/calendario/CalendarioAgenda.tsx` — **novo**, view de lista.
- `src/components/monitoramento/calendario/DiaServicosSheet.tsx` — resumo, agrupamento, navegação ← →, copiar protocolo.
- `src/components/monitoramento/calendario/ServicoChip.tsx` — prefixo de contrato mensal, ordenação.
- `src/hooks/useCalendarioServicos.ts` — `AbortController`, helper de tendência semanal.
- `src/hooks/useCalendarioPrefs.ts` — **novo**, persistência das preferências.

## Sugestão de priorização

Se quiser fazer em fases:

1. **Alta UX, baixo esforço**: busca, chips de filtros ativos, soma do dia, ordenação por risco, "+N mais" clicável, skeleton, empty state.
2. **Médio esforço**: modos Semana/Agenda, persistência, navegação dia-a-dia no sheet, agrupamento no sheet.
3. **Polimento**: tendência nos KPIs, mini-barra de status, a11y por teclado, AbortController.

Posso implementar tudo de uma vez ou só a Fase 1 — me diga qual prefere.
