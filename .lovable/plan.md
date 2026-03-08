

# Fix: Ocultar badge "suas" quando não há justificativas próprias pendentes

## Problema
O botão "Justificativas OC" mostra o indicador "X suas" mesmo quando o usuário não tem nenhuma justificativa pendente própria — gerando ruído desnecessário.

## Solução
Ajuste simples em `PendingActionsCard.tsx`: o sub-badge "suas" já tem a condição `ownCount > 0`, mas o botão inteiro de Justificativas OC aparece baseado no total geral. O refinamento é:

1. **Se `pendingJustificativasOwn === 0`**, não mostrar o sub-badge "X suas" (já funciona assim)
2. **Se `pendingJustificativas > 0` mas `pendingJustificativasOwn === 0`**, mostrar o botão sem o sub-badge — OK para backoffice ver o total
3. **Se o usuário é solicitante puro** (não backoffice/admin) e `pendingJustificativasOwn === 0`, **ocultar o botão inteiro** de justificativas — não faz sentido mostrar justificativas de outros

Para isso, o componente precisa receber uma prop `isBackoffice` para decidir se mostra justificativas globais ou apenas as próprias.

## Arquivos
- `src/components/PendingActionsCard.tsx` — adicionar prop `isBackofficeOrAdmin`, filtrar botão de justificativas para solicitante
- `src/pages/Dashboard.tsx` — passar a nova prop

