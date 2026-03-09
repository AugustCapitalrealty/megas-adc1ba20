

## Corrigir badge "Devolvido" exibido em solicitações já aprovadas

### Problema

O `FluigStatusCard` detecta devoluções históricas nos eventos e exibe o badge "Devolvido por Gerência Financeira" mesmo quando o processo já foi **fechado/aprovado**. A lógica de `devolucaoDetectada` olha o histórico de eventos sem considerar se o processo já concluiu todas as aprovações necessárias.

Na imagem: Facilities ✅ e Financeiro ✅ estão ambos verdes (aprovados), mas o badge laranja "Devolvido por Gerência Financeira" aparece indevidamente.

### Causa raiz

Duas áreas no `FluigStatusCard.tsx`:

1. **`devolucaoDetectada` (linhas 171-194)** — busca eventos de localização que diminuíram de nível, sem verificar se `isFluigFechado(status)` é true
2. **`approvalStages` (linha 295-297)** — devolução detectada sobrescreve o status "approved" vindo de `getFluigApprovalStatus`

### Correção

**`src/components/FluigStatusCard.tsx`** — duas mudanças:

1. No memo `devolucaoDetectada`: se `isFluigFechado(status)` retornar true, retornar `null` imediatamente (processo concluído, devolução é histórica)
2. No `approvalStages`: mover a verificação de `stage.aprovado` (done) **antes** da verificação de `devolucaoDetectada`, para que aprovações confirmadas nunca sejam sobrescritas

Isso garante que quando o Painel Fluig mostra o processo como aprovado, o card na tela de Minhas Solicitações mostra a mesma coisa.

