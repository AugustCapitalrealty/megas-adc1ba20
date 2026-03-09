

## Unificar componentes de mensagens

### Problema

Existem dois componentes com lógica duplicada de envio de mensagens:

1. **`SolicitacaoMessages`** — lista apenas mensagens + input de envio
2. **`SolicitacaoTimeline`** — timeline com histórico + mensagens intercaladas + input de envio

Ambos têm código idêntico para: inserir na tabela `solicitacao_mensagens`, notificar destinatários, toggle de nota interna, textarea + botão de envio, filtragem de mensagens internas.

### Solução

Eliminar `SolicitacaoMessages` completamente e usar `SolicitacaoTimeline` em todos os contextos, adicionando uma prop `showHistorico` (default `true`) para quando se quer exibir apenas mensagens sem o histórico de status.

### Mudanças

**`src/components/SolicitacaoTimeline.tsx`**
- Adicionar prop `showHistorico?: boolean` (default `true`)
- Quando `showHistorico = false`, filtrar `timelineItems` para mostrar apenas itens do tipo `mensagem`
- Manter todo o resto igual (input, notas internas, notificações)

**`src/components/backoffice/BackofficeModals.tsx`**
- Remover import de `SolicitacaoMessages`
- Substituir `<SolicitacaoMessages solicitacaoId={...} />` por `<SolicitacaoTimeline solicitacaoId={...} showHistorico={false} showMessages />`

**`src/components/monitoramento/OCDetalhesModal.tsx`**
- Remover import de `SolicitacaoMessages`
- Remover a aba "Mensagens" separada (já que a aba Timeline mostra mensagens intercaladas)
- Ou substituir conteúdo da aba Mensagens por `<SolicitacaoTimeline showHistorico={false} showMessages />`

**`src/components/SolicitacaoMessages.tsx`**
- Deletar o arquivo

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/components/SolicitacaoTimeline.tsx` | Adicionar prop `showHistorico` |
| `src/components/backoffice/BackofficeModals.tsx` | Trocar `SolicitacaoMessages` → `SolicitacaoTimeline` |
| `src/components/monitoramento/OCDetalhesModal.tsx` | Trocar `SolicitacaoMessages` → `SolicitacaoTimeline` |
| `src/components/SolicitacaoMessages.tsx` | Deletar |

