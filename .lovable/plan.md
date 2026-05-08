## Objetivo

No calendário de serviços, ocultar serviços com status visual `cancelado` por padrão (a cor vermelha confunde com "Previsão em risco"). Manter um toggle para reativar a exibição quando o usuário quiser.

## Mudanças

### 1. `src/hooks/useCalendarioPrefs.ts`
- Adicionar nova preferência persistida `mostrarCancelados: boolean` (default `false`).

### 2. `src/components/monitoramento/calendario/CalendarioServicos.tsx`
- No `filteredServicos`, filtrar `s.visual === 'cancelado'` quando `prefs.mostrarCancelados` for `false`.
- Adicionar um `Switch` "Mostrar cancelados" no painel de filtros/preferências (próximo ao toggle "Apenas em risco" / heatmap), com tooltip explicando que estão ocultos por padrão para evitar confusão visual com "Previsão em risco".
- Incluir `cancelado` na `LEGEND_ITEMS` apenas quando `mostrarCancelados` estiver ativo (para não poluir a legenda quando ocultos).
- `clearAllFilters` mantém `mostrarCancelados = false` (estado padrão).

## Comportamento esperado

- Ao abrir o calendário, serviços cancelados não aparecem nos chips, agenda, semana, timeline ou sheet do dia.
- Ativando o switch "Mostrar cancelados", os chips cinza-vermelhos voltam a aparecer e a legenda inclui o item `Cancelado`.
- A preferência é persistida em `localStorage` (mesmo mecanismo dos outros prefs).
