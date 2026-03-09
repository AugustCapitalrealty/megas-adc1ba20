

## Exibir status "Concluída" quando processo Fluig está fechado

### Problema

Quando todas as aprovações necessárias foram concluídas (Facilities ✅, Financeiro ✅, Diretoria N/A por valor ≤ 2500), o card ainda mostra o `situacao` original do banco ("Em Aberto") e exibe "Responsável atual" e "Próxima etapa" como se o processo estivesse em andamento.

### Causa raiz

O `FluigStatusCard` exibe `status.situacao` diretamente do snapshot sem verificar `isFluigFechado()`. O campo `situacao` no banco não é atualizado automaticamente quando todas as aprovações são concluídas.

### Correção em `src/components/FluigStatusCard.tsx`

1. **Badge de situação**: Se `isFluigFechado(status)` for true, exibir "Concluída" (verde) em vez de `status.situacao`
2. **Ocultar "Responsável atual"** e **"Próxima etapa"** quando o processo está fechado — não faz sentido mostrar
3. **Ocultar dias com responsável** quando fechado

Lógica:
```
const processoConcluido = isFluigFechado(status);

// Badge: se concluído → "Concluída" (verde), senão → status.situacao
// Responsável atual: só mostra se !processoConcluido
// Próxima etapa: só mostra se !processoConcluido
```

