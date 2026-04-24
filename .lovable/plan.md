# Ajustes nas abas de Minhas Solicitações

## Diagnóstico (qual a diferença hoje)

**Correções** (`status = pendente_correcao`)
- O Backoffice rejeitou/devolveu a solicitação porque algum dado está errado ou faltando.
- Ação esperada: **abrir o formulário, corrigir e reenviar**.
- Botão típico: "Corrigir solicitação".

**Informações** (`status = aguardando_informacoes`)
- O Backoffice precisa de um esclarecimento textual (uma dúvida pontual) — a solicitação **não** precisa ser refeita.
- Ação esperada: **responder a mensagem** (chat/observação), sem reabrir o formulário.
- Botão típico: "Responder".

Ou seja, embora os dois sejam "pendência com o solicitante", a **ação é diferente** (editar formulário vs. apenas responder). Hoje estão separados justamente para deixar isso claro no chip e no contador.

**Aguardando Ciência** (`status = cancelado` AND `cancelamento_ciencia_em IS NULL`)
- Hoje captura **qualquer** solicitação cancelada sem ciência marcada — inclusive as que o próprio solicitante pediu para cancelar e o Backoffice aprovou.
- De fato é redundante: se o solicitante mesmo pediu o cancelamento, ele já sabe — não precisa "dar ciência" disso. A ciência faz sentido apenas para auto-cancelamentos do sistema (30 dias de inatividade) ou cancelamentos feitos pelo Backoffice sem o pedido do solicitante.

## O que vamos fazer

### 1. Unificar "Correções" + "Informações" em uma única aba "Pendentes"
- Nova aba/chip único chamado **"Pendentes em você"** (ou simplesmente **"Pendentes"**), com o total somado dos dois status.
- Ao abrir a aba, mostrar **subfiltros internos** (segmented control fino acima da lista):
  - "Todas" · "Corrigir" (badge laranja) · "Responder" (badge azul)
- Cada card/linha continua com seu badge de status próprio (mantém clareza da ação esperada).
- O `PendingHeaderChips` no topo da página passa a exibir **um único chip "Pendentes (N)"** combinando os dois — fica menos poluído e mais alinhado com o padrão do Backoffice.

### 2. Excluir cancelamentos pedidos pelo solicitante de "Aguardando Ciência"
- Lógica atual: `status = 'cancelado' AND cancelamento_ciencia_em IS NULL`.
- Lógica nova: além das duas condições acima, **excluir** os registros em que o último evento foi `cancelamento_solicitado` pelo próprio `user_id` da solicitação.
- Critério prático: olhar `solicitacao_acoes` (ou `solicitacao_historico`) e verificar se existe uma ação `cancelamento_solicitado` feita pelo solicitante antes do cancelamento. Se sim, marcar `cancelamento_ciencia_em` automaticamente no momento em que o Backoffice aprovar o cancelamento (assim ela já entra direto em "Canceladas", sem passar por "Aguardando Ciência").
- Para os registros **já existentes** nesse caso, rodar um backfill na migração: `UPDATE solicitacoes SET cancelamento_ciencia_em = updated_at WHERE status='cancelado' AND cancelamento_ciencia_em IS NULL AND id IN (SELECT solicitacao_id FROM solicitacao_acoes WHERE tipo_acao='cancelamento_solicitado' AND user_id = solicitacoes.user_id)`.
- O chip "Dar ciência" no `PendingHeaderChips` e a aba "Aguardando Ciência" continuam existindo, mas só aparecem quando houver cancelamento de fato **não solicitado pelo usuário**.

### 3. Espelhar a mesma simplificação no Backoffice
- Para manter paridade visual, os contadores de pendência por solicitante no Backoffice (cards/tabela) também passam a mostrar "Pendentes em solicitante" agregando os dois status, com tooltip detalhando "X corrigir / Y responder".

## Detalhes técnicos

**Frontend — `src/pages/MinhasSolicitacoes.tsx`**
- Trocar as duas entradas de aba `correcoes` e `informacoes` por uma única `pendentes` no array de tabs (linhas ~949-950).
- Manter o type `FilterTab` aceitando `'pendentes'`; preservar `'correcoes'` e `'informacoes'` apenas como subfiltros internos da view.
- Atualizar `statusCounts` (linhas ~412-413) para somar os dois.
- Ajustar `case 'ciencia'` (linha ~363) para excluir cancelamentos solicitados pelo próprio usuário; idem para `pendingCiencia` (linha ~920).

**Frontend — `src/components/solicitante/PendingHeaderChips.tsx`**
- Substituir os chips `correcoes` e `informacoes` por um único chip `pendentes` (com tooltip discriminando a quebra). Manter a paleta `destructive`.
- Ajustar a prop API: trocar `pendingCorrections` + `pendingInfoRequests` por `pendingActions` (e opcionalmente uma quebra para o tooltip).

**Backend — migração SQL**
- Backfill descrito acima em `solicitacoes.cancelamento_ciencia_em`.
- Trigger `AFTER UPDATE OF status ON solicitacoes`: quando `NEW.status = 'cancelado'` e existir uma ação `cancelamento_solicitado` do próprio `user_id` em `solicitacao_acoes`, setar `NEW.cancelamento_ciencia_em = now()` automaticamente. Isso garante que cancelamentos pedidos pelo solicitante nunca caiam em "Aguardando Ciência" daqui pra frente.

**Backoffice — `src/components/backoffice/BackofficeSolicitacaoCard.tsx` e `BackofficeTable.tsx`**
- Onde houver indicador de pendência por status do lado do solicitante, agregar `pendente_correcao + aguardando_informacoes` em "Pendente em solicitante" com tooltip.

## Não escopo
- Nenhuma mudança em "Canceladas" — continua mostrando todos os `cancelado/rejeitado`.
- Nenhuma mudança nos status do banco — `pendente_correcao` e `aguardando_informacoes` permanecem distintos no schema (a ação esperada é diferente); a unificação é só na **camada de UI**.
