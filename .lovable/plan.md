

# Informações do Backoffice não visíveis para o Solicitante

## Problemas Identificados

### 1. Observação da OC não aparece para o solicitante
Quando o backoffice registra uma OC, pode adicionar uma **observação** (campo `observacao` em `documentos_emitidos`). Essa observação:
- **É salva** no banco corretamente
- **Não é exibida** em nenhum lugar para o solicitante:
  - No card expandido em MinhasSolicitacoes (linha 1287-1304): mostra apenas tipo + número + botão baixar
  - No modal de aceite (linha 1893-1943): mostra tipo + número + valor + fornecedor, mas sem observação
  - No OCDetalhesModal (linha 216-226): mostra tipo + número + data + quem emitiu, sem observação

### 2. Múltiplas OCs não visíveis para o solicitante
O `docsMap` em MinhasSolicitacoes (linha 247-249) só guarda **a primeira OC** por solicitação (`if (!docsMap[...]) docsMap[...] = doc`). Se o backoffice registrou 2+ OCs, o solicitante só vê a primeira.

### 3. Modal de aceite não permite baixar todas as OCs
O modal de aceite (linha 1893) usa `aceiteSolicitacao.documentoEmitido` (singular). Se há múltiplas OCs, o solicitante revisa e aceita baseando-se em apenas uma.

## Alterações Propostas

### Arquivo: `src/pages/MinhasSolicitacoes.tsx`

**A) Fetch todas as OCs (não só a primeira)**
- Mudar `docsMap` de `Record<string, any>` para `Record<string, any[]>` (array)
- Ajustar `SolicitacaoComFornecedor` para `documentosEmitidos?: DocumentoEmitido[]` (plural)

**B) Card expandido: mostrar todas as OCs + observação**
- Iterar sobre `sol.documentosEmitidos` em vez de exibir só um
- Exibir `doc.observacao` quando presente

**C) Modal de aceite: listar todas as OCs**
- Mostrar lista de OCs com download individual
- Exibir observação do backoffice se houver

### Arquivo: `src/components/monitoramento/OCDetalhesModal.tsx`

**D) Exibir observação nos documentos emitidos**
- Adicionar linha com `doc.observacao` quando presente no card de documentos

**4 locais de alteração em 2 arquivos.**

