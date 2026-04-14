

## Correção de Dados e Modal de Detalhes — Projuris

### Problema Identificado

Existem registros antigos importados com mapeamento errado (posição fixa), criando entradas onde `numero_requisicao` contém o número Fluig (ex: `152.296`) ao invés do número Projuris (`4006`). São ~5 registros com `numero_requisicao` longo (mais de 5 caracteres com pontos), que são claramente números Fluig.

Os registros corretos (da importação com header dinâmico) já existem — basta limpar os duplicados antigos.

### Mudanças

**1. Migration SQL — Limpar registros ruins**
- Deletar registros onde `numero_requisicao` contém padrão de número Fluig (formato `XXX.XXX` com 6+ caracteres) e já existe um registro correto com esse valor em `numero_fluig`
- Deletar registros duplicados com mapeamento errado

**2. Modal de Detalhes da Requisição**
- Criar `ProjurisDetalhesModal.tsx` — modal que abre ao clicar em qualquer linha
- Exibe todas as informações: Nº Requisição, Nº Fluig, Status, Responsável, Requisitante, Empreendimento, Tipo Requisição, Cliente/Fornecedor, todas as datas formatadas, e **Detalhes** (texto completo com scroll)
- Layout limpo com cards de resumo no topo e seção de detalhes expandida

**3. Simplificar a tabela (`ProjurisVisaoStatus.tsx`)**
- Remover colunas que poluem: Detalhes, Cliente/Fornecedor, datas individuais
- Manter apenas: Seq (drag), Nº Req., Status, Responsável, Empreendimento, Últ. Atualização
- Ao clicar na linha → abre o modal de detalhes
- Cursor pointer nas linhas para indicar clicabilidade

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Deletar registros com mapeamento antigo errado |
| `src/components/monitoramento/projuris/ProjurisDetalhesModal.tsx` | Criar — modal de detalhes |
| `src/components/monitoramento/projuris/ProjurisVisaoStatus.tsx` | Simplificar colunas + integrar modal |

