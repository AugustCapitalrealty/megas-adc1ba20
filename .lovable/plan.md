

# Melhorias no Monitoramento OC x NF

## Alteracoes

### 1. Filtrar por empreendimento do usuario

Usar o hook `useUserEmpreendimentos` para obter os empreendimentos do usuario. No enriquecimento dos dados, filtrar apenas as solicitacoes cujo `empreendimento` esta na lista do usuario (ou mostrar todos se `hasAllAccess`). Tambem limitar o dropdown de filtro para mostrar apenas os empreendimentos acessiveis.

### 2. Trocar "Aging" por "Dias em aberto"

Alterar o `TableHead` na linha 414 de "Aging" para "Dias em aberto".

### 3. Botao "Solicitar Cancelamento" na tabela

Adicionar botao "Cancelar OC" nas acoes da tabela (para linhas que nao estao canceladas e nao tem `cancelamento_pendente`). Ao clicar, abre um modal com textarea obrigatoria para justificativa. Ao salvar:
- Insere em `oc_acompanhamento` com `tipo_acao = 'cancelamento_solicitado'`
- Atualiza `solicitacoes.cancelamento_pendente = true`
- Recarrega dados

Criar estado para o modal de cancelamento (`cancelRow`) e componente inline no mesmo arquivo.

### 4. Melhorias de UX e visualizacao

- Empreendimento como coluna na tabela (com badge colorido)
- Tooltip no badge de dias em aberto mostrando data da OC
- Linha com previsao de NF mostra a data inline na coluna Status
- Melhorar KPIs com cores mais contrastantes
- Busca por protocolo ou fornecedor (input de search)
- Ordenacao padrao por dias em aberto (decrescente)

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/MonitoramentoOC.tsx` | Filtro por empreendimento do usuario, renomear Aging, botao cancelamento com modal, search, coluna empreendimento, melhorias visuais |

