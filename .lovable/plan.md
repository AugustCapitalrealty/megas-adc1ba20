## Problema

A solicitação **2026000504** está corretamente vinculada ao fornecedor internacional **Lovable Labs Incorporated** no banco (`tipo_fornecedor='internacional'`, `pais='US'`, `identificador_fiscal='GB509006909'`, `cnpj=NULL`), mas o fornecedor não aparece na tela de detalhes.

Causa raiz: o pipeline de detalhes foi construído presumindo que todo fornecedor tem CNPJ. Sem CNPJ, o bloco inteiro é escondido e os campos internacionais nem são retornados pela RPC.

## Correções

### 1. RPC `get_solicitacao_detalhes` (migration)
Incluir nos selects de `fornecedor`, `concorrente1` e `concorrente2`:
- `tipo_fornecedor`, `pais`, `identificador_fiscal`, `tipo_identificador_fiscal`, `moeda_padrao`

Mantém retrocompatibilidade — apenas adiciona colunas.

### 2. `src/hooks/useSolicitacaoDetalhes.ts`
Adicionar os mesmos campos (com prefixos `fornecedor_`, `concorrente1_`, `concorrente2_`) ao tipo `SolicitacaoDetalhes`.

### 3. `src/pages/Backoffice.tsx` — `buildFornecedorFromDetalhes` e `buildConcorrenteFromDetalhes`
- Mapear `tipo_fornecedor`, `pais`, `identificador_fiscal`, `tipo_identificador_fiscal`, `moeda_padrao` nos objetos `Fornecedor` retornados.
- Em `buildConcorrenteFromDetalhes`, trocar o gate `if (!cnpj) return null;` por: retornar `null` apenas quando não houver nem `cnpj` nem `identificador_fiscal` (concorrente internacional).

### 4. `src/components/backoffice/BackofficeModals.tsx`
- Trocar a condição da seção Fornecedor de `detalhes.solicitacao.fornecedor_cnpj` para algo como `detalhes.solicitacao.fornecedor_id` (ou `fornecedor_cnpj || fornecedor_identificador_fiscal`), para que internacionais sejam exibidos.
- Pular badges Brasil-específicos (`MEIAlertBadge`, `CNAECompatibilityBadge`) quando `tipo_fornecedor === 'internacional'`, reaproveitando o padrão já usado em `FornecedorStep`.

### 5. Verificação rápida pós-migração
Conferir via `read_query` que a RPC para a solicitação 2026000504 já retorna `fornecedor_pais='US'` e `fornecedor_identificador_fiscal='GB509006909'`, e validar visualmente no preview que o card aparece com bandeira/país/moeda (renderização já tratada em `FornecedorCard.tsx`).

## Fora de escopo
- Não altera lógica de criação de fornecedor internacional, regras de 3 CNPJs, exceção, retenção ou conversão cambial.
- Não modifica o card resumido de `/minhas-solicitacoes` (já usa `razao_social`, que existe para o registro).
