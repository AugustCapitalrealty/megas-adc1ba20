## Unificar Projuris no card do Backoffice

Hoje o `BackofficeSolicitacaoCard` mostra "Projuris" em dois pontos: o chip compacto no header (apenas em `awaitingOC`) e o botão de ação ao lado de "Ver Detalhes/Histórico" (em todos os estados pós-OC). É redundância visual — manter apenas o chip do header, estendendo-o para todos os estados pós-OC.

### Alteração

**`src/components/backoffice/BackofficeSolicitacaoCard.tsx`**

1. Na seção de chips (linhas 155–176), trocar a condição `if (awaitingOC)` para incluir também todos os estados pós-OC, de forma que o chip "Projuris: N" / "+ Projuris" apareça sempre que for aplicável. O chip do Fluig/RM continua restrito a `awaitingOC` (lógica atual preservada).
2. Remover por completo o bloco do botão "Adicionar Projuris / Projuris #X" (linhas 556–572), incluindo a IIFE que o envolve.

### Detalhes técnicos

- Lista de status pós-OC reaproveitada da IIFE atual: `['aprovado','em_processamento','aguardando_aceite','oc_ac_emitida','liberado_fornecedor','enviado_fornecedor','aguardando_execucao','aguardando_nf_boleto','nf_boleto_enviados','enviado_pagamento','concluida']`. Definir uma const `showProjurisChip = awaitingOC || postOCStatuses.includes(sol.status)` antes do bloco de chips.
- O chip mantém `onClick={() => callbacks.openEditProjuris(sol)}`, então a funcionalidade de edição/adição segue idêntica.
- Sem mudanças em `SolicitanteSolicitacaoCard`, `BackofficeModals`, `ProjurisStatusCard` ou tipos.

### Fora de escopo

- Nenhuma mudança de lógica de negócio, RLS, ou no fluxo de edição do Projuris.
- Nenhuma alteração nos cards do solicitante.
