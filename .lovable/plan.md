

## Correções: Typo no Resumo + Visibilidade de Canceladas por Prazo Expirado

### 1. Corrigir typo "solicitaçãoões"

**Arquivo:** `src/components/DailyInsightCard.tsx` (linha 38)

O problema é a interpolação `solicitação${newInQueue > 1 ? 'ões' : ''}` que produz "solicitaçãoões" no plural. Corrigir para `solicitaç${newInQueue > 1 ? 'ões' : 'ão'}`.

### 2. Onde ficam as canceladas por prazo expirado

Atualmente, quando o prazo de 30 dias expira, a edge function muda o status para `rejeitado`. Essas solicitações aparecem na aba "Reprovadas" — tanto no Backoffice quanto no Solicitante. O problema é que não há distinção visual entre uma rejeição manual do backoffice e um cancelamento automático por prazo, nem existe opção de reabrir.

### 3. Permitir reabertura pelo backoffice

**Migração SQL:**
- Adicionar transição `rejeitado → recebido` na tabela `status_transitions`

**Arquivo:** `src/components/backoffice/BackofficeSolicitacaoCard.tsx`
- Para solicitações com status `rejeitado`, verificar no histórico se a ação foi `prazo_correção_expirado` ou `prazo_resposta_expirado`
- Exibir badge "Cancelada por prazo" para diferenciá-las visualmente
- Adicionar botão "Reabrir" que muda o status de volta para `recebido`

**Arquivo:** `src/pages/Backoffice.tsx`
- Adicionar handler `handleReabrir` que:
  1. Atualiza status para `recebido`
  2. Insere registro no histórico com ação `reabertura`
  3. Notifica o solicitante

**Arquivo:** `src/components/solicitante/SolicitanteSolicitacaoCard.tsx`
- Para solicitações rejeitadas por prazo, mostrar banner informativo: "Cancelada automaticamente — prazo de 30 dias expirado. Solicite reabertura ao backoffice."

### 4. Badge diferenciador no card (ambas as visões)

Criar lógica que consulta o último registro de histórico da solicitação rejeitada. Se a ação contém "prazo" e "expirado", exibir badge vermelho "Prazo expirado" em vez do genérico "Rejeitada".

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/DailyInsightCard.tsx` | Corrigir typo |
| Migração SQL | Transição `rejeitado → recebido` |
| `src/pages/Backoffice.tsx` | Handler `handleReabrir` |
| `src/components/backoffice/BackofficeSolicitacaoCard.tsx` | Badge "Prazo expirado" + botão "Reabrir" |
| `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` | Banner informativo |

