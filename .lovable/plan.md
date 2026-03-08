

# Corrigir: Mensagem obrigatória não aparece ao reenviar

## Problema
A condição que exibe o campo obrigatório "O que foi corrigido?" só verifica `pendente_correcao`, mas o modal de edição/reenvio também abre para solicitações com status `aguardando_informacoes`. Quando o solicitante reenvia a partir de "aguardando_informacoes", o campo não aparece.

## Solução

**1 arquivo:** `src/pages/MinhasSolicitacoes.tsx`

Alterar 3 pontos onde a condição verifica apenas `pendente_correcao` para incluir também `aguardando_informacoes`:

1. **Validação no `handleResubmit`** (~linha 662): mudar de `=== 'pendente_correcao'` para incluir ambos os status
2. **Renderização do Textarea** (~linha 1978): mesma mudança na condição de exibição
3. **Botão disabled** (~linha 2004): mesma mudança na condição do botão

Condição atualizada: `['pendente_correcao', 'aguardando_informacoes'].includes(editingSolicitacao.status)`

