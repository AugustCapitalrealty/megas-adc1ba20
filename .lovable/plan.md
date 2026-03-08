

# Plano: Mostrar todas as solicitações com Projuris (incluindo concluídas)

## Problema
A query atual exclui solicitações com status `cancelado` e `concluida`, resultando em apenas 2 registros.

## Mudança

**`src/components/monitoramento/TabProjuris.tsx`**:
1. Remover o filtro `.not('status', 'in', '("cancelado","concluida")')` da query para trazer todas as solicitações com `numero_projuris`.
2. Adicionar um filtro de **status** no painel de filtros para que o usuário possa separar por status (ativas, concluídas, canceladas, etc.).
3. Atualizar os KPIs para refletir o total real.

