

## Diagnóstico: Notificações faltando nos spaces

### Problema 1: Correção #2026000328 não chegou no Mega Curitiba

**Causa:** O campo `empreendimento` no payload está sendo enviado como o valor raw do banco (`mega_curitiba`). A lógica de roteamento em `getTargetSpaces` compara `s.empreendimento === empreendimento` — isso está correto. O registro `mega_curitiba` existe na tabela `gchat_spaces` apontando para `spaces/AAQASY7qbTk`.

Porém, ao inspecionar o `Backoffice.tsx` linha 258, o `sol?.empreendimento` vem do hook `useBackofficeSolicitacoes` que retorna o campo `empreendimento` como tipo `empreendimento` (enum). A comparação no edge function deveria funcionar. Vou verificar os logs do edge function para confirmar o que realmente chegou.

**Ação:** Verificar logs e, se necessário, adicionar logging de debug no `getTargetSpaces`.

### Problema 2: Nova solicitação #2026000357 não chegou no Backoffice

**Causa confirmada:** **Não existe nenhum código que chame `gchat-notify-oc` com `tipo: 'nova_entrada'`**. A edge function suporta o tipo, mas nenhum lugar no frontend dispara essa notificação quando uma nova solicitação é criada.

### Problema 3: Solicitação corrigida não chega no Backoffice

**Causa confirmada:** Mesma situação — **não existe nenhum código que chame `gchat-notify-oc` com `tipo: 'solicitacao_corrigida'`**. O `handleResubmit` em `MinhasSolicitacoes.tsx` atualiza o status para `recebido` e insere histórico, mas não dispara notificação no Google Chat.

### Correções necessárias

**1. Adicionar notificação `nova_entrada` na criação de solicitação**
- Arquivo: `src/hooks/useNovaSolicitacaoForm.ts` (ou `src/pages/NovaSolicitacao.tsx`)
- Após inserir com sucesso na tabela `solicitacoes`, chamar `gchat-notify-oc` com `tipo: 'nova_entrada'`

**2. Adicionar notificação `solicitacao_corrigida` no reenvio**
- Arquivo: `src/pages/MinhasSolicitacoes.tsx` no `handleResubmit`
- Após atualizar o status para `recebido`, chamar `gchat-notify-oc` com `tipo: 'solicitacao_corrigida'`

**3. Verificar logs da correção #2026000328 para entender por que não foi ao Mega Curitiba**
- Pode ser que o campo `empreendimento` não estava populado no momento do envio

### Resultado esperado

| Evento | Spaces que recebem |
|--------|-------------------|
| Nova solicitação criada | Backoffice + Coordenação |
| Solicitação corrigida/reenviada | Backoffice + Coordenação |
| Correção solicitada (backoffice) | Space do empreendimento + Coordenação |
| OC emitida | Space do empreendimento + Coordenação |

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useNovaSolicitacaoForm.ts` | Adicionar chamada `gchat-notify-oc` tipo `nova_entrada` após criação |
| `src/pages/MinhasSolicitacoes.tsx` | Adicionar chamada `gchat-notify-oc` tipo `solicitacao_corrigida` no `handleResubmit` |
| `supabase/functions/gchat-notify-oc/index.ts` | Adicionar logs de debug no `getTargetSpaces` para diagnosticar falha da correção |

