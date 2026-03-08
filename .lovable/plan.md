

# Plano: Filtro padrão separando concluídas

## Mudança

**`src/components/monitoramento/TabProjuris.tsx`**:

1. Alterar o valor padrão de `filterStatus` de `'todos'` para `'ativos'`.
2. Adicionar a opção `'ativos'` no Select de status, que filtra excluindo `concluida` e `cancelado`.
3. Manter as opções individuais (Concluída, Cancelado, etc.) para quem quiser ver especificamente.
4. Atualizar a lógica de `filteredRows` para tratar o novo valor `'ativos'`.

Resultado: ao abrir a aba Projuris, o usuário verá apenas solicitações ativas. Para ver as concluídas, basta trocar o filtro.

