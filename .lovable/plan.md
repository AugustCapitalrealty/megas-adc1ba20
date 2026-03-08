

# Melhoria: Permitir buscar novo fornecedor ao corrigir solicitação

## Situação atual
Hoje, ao corrigir uma solicitação devolvida, o solicitante só pode trocar o fornecedor escolhido por um dos concorrentes já cadastrados na solicitação. Se nenhum concorrente foi informado (ou se todos têm problemas de CNAE), o usuário precisa abrir uma nova solicitação do zero.

## Solução
Adicionar uma terceira opção no modal de edição: **"Buscar novo fornecedor"**, que exibe o componente `SupplierSearch` já existente no projeto. Isso permite ao solicitante pesquisar por CNPJ ou nome e selecionar um fornecedor completamente novo, sem precisar recriar a solicitação.

## Alterações

**1 arquivo:** `src/pages/MinhasSolicitacoes.tsx`

1. Adicionar novo state `novoFornecedorBuscado` do tipo `Fornecedor | null`
2. No bloco onde aparece a checkbox "Desejo trocar o fornecedor escolhido", adicionar uma opção extra "Buscar outro fornecedor" (radio button) além dos concorrentes 1 e 2
3. Quando selecionada, renderizar o componente `SupplierSearch` inline para busca por CNPJ/nome
4. No `handleResubmit`, tratar o caso `novoFornecedorEscolhido === 'novo'`:
   - Usar o `id` do fornecedor buscado como novo `fornecedor_id`
   - Mover o fornecedor antigo para a posição de concorrente (se houver vaga) ou simplesmente substituir
5. Registrar no histórico que houve troca de fornecedor com o motivo

### Detalhes técnicos
- O `SupplierSearch` já faz lookup por CNPJ na Receita Federal e salva no banco, retornando um `Fornecedor` completo com `id`
- O state `novoFornecedorEscolhido` passa a aceitar `'concorrente1' | 'concorrente2' | 'novo' | null`
- No `updateData` do resubmit, quando `'novo'`: `updateData.fornecedor_id = novoFornecedorBuscado.id`
- Reset do state `novoFornecedorBuscado` ao fechar o modal

