

## Remover opção "Reabrir" — manter apenas badge informativo

O fluxo correto para canceladas por prazo é o solicitante duplicar e abrir nova solicitação (funcionalidade já existente).

### Mudanças

#### 1. `src/components/backoffice/BackofficeSolicitacaoCard.tsx`
- **Remover** `handleReabrir` do `CardCallbacks` (linha 60)
- **Remover** o bloco do botão "Reabrir" (linhas 286-292)
- Manter o badge "Prazo expirado" como está

#### 2. `src/pages/Backoffice.tsx`
- **Remover** a função `handleReabrir` inteira (linhas 1214-1243)
- **Remover** `handleReabrir` do objeto de callbacks passado ao card

#### 3. `src/components/solicitante/SolicitanteSolicitacaoCard.tsx`
- Alterar o texto de "Solicite reabertura ao backoffice..." para algo como: "Caso ainda precise, duplique esta solicitação para abrir uma nova."

#### 4. Migração SQL (opcional)
- Remover a transição `rejeitado → recebido` adicionada anteriormente na `status_transitions`, já que não será mais usada

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/backoffice/BackofficeSolicitacaoCard.tsx` | Remover botão Reabrir e callback |
| `src/pages/Backoffice.tsx` | Remover handler `handleReabrir` |
| `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` | Atualizar texto orientativo |
| Migração SQL | Remover transição `rejeitado → recebido` |

