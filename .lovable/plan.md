

## Plano: Alimentar Projuris com dados da planilha CSV

### Contexto

A planilha `Megas_2.0.csv` contém ~10.000 registros do Projuris com colunas:
- A: Data da Requisição
- B: Data da última aprovação
- C: Data do último envio para aprovação
- D: Detalhes
- E: Empreendimento
- F: Nº Fluig
- G: Número Requisição (= número Fluig interno)
- H: Requisitante
- I: Tipo Requisição
- J: Usuários responsáveis
- K: Status
- L: Data da finalização
- M: Cliente/Fornecedor

### O que será feito

**1. Nova tabela `projuris_requisicoes`**

Armazena os dados importados da planilha:

| Coluna | Tipo | Origem CSV |
|--------|------|-----------|
| id | uuid PK | auto |
| numero_requisicao | text UNIQUE | Col G |
| numero_fluig | text | Col F |
| data_requisicao | timestamptz | Col A |
| data_ultima_aprovacao | timestamptz | Col B |
| data_ultimo_envio_aprovacao | timestamptz | Col C |
| detalhes | text | Col D |
| empreendimento | text | Col E |
| requisitante | text | Col H |
| tipo_requisicao | text | Col I |
| responsavel | text | Col J |
| status | text | Col K |
| data_finalizacao | timestamptz | Col L |
| cliente_fornecedor | text | Col M |
| ordem_prioridade | integer | Para drag-and-drop |
| importado_por | uuid | user_id |
| importado_em | timestamptz | auto |

RLS: backoffice/admin pode CRUD, usuários autenticados podem SELECT.

**2. Importador CSV no TabProjuris**

- Botão "Importar Planilha Projuris" no topo
- Parser CSV (semicolon-separated, encoding latin1)
- Upsert por `numero_requisicao`
- Resumo de importação (novos, atualizados)

**3. Reescrever ProjurisVisaoStatus**

Ao invés de buscar de `solicitacoes` + `acompanhamento_juridico`, passa a buscar de `projuris_requisicoes`:

- KPIs no topo baseados no campo `status` do CSV
- Tabela com: Nº Requisição, Status (col K), Responsável (col J), Datas A/B/C, Empreendimento, Tipo, Cliente/Fornecedor
- Filtros por Status, Empreendimento, Responsável
- **Coluna "Sequência"** com numeração 1, 2, 3... e **drag-and-drop** para reordenar (salva `ordem_prioridade` no banco)
- O usuário arrasta as linhas para priorizar, tira um print e envia

**4. Atualizar demais sub-abas**

- **Parados Assinatura**: filtra `projuris_requisicoes` onde status indica aguardando assinatura e calcula dias parado com base nas datas
- **Fluxo de Aprovações**: usa as datas A/B/C para mostrar timeline de cada requisição
- **Compliance**: mantém a lógica atual (solicitações internas sem Projuris)

### Detalhes Técnicos

**Drag-and-drop**: Usar `@dnd-kit/core` + `@dnd-kit/sortable` para reordenação de linhas na tabela. Ao soltar, atualiza `ordem_prioridade` no banco.

**Parsing CSV**: O arquivo usa `;` como separador e encoding latin1. Campos com aspas podem conter quebras de linha (multi-line). Será parseado no frontend com tratamento adequado.

### Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `projuris_requisicoes` com RLS |
| `src/components/monitoramento/projuris/ProjurisImport.tsx` | Novo — importador CSV |
| `src/components/monitoramento/projuris/ProjurisVisaoStatus.tsx` | Reescrever — dados do CSV + drag-and-drop sequência |
| `src/components/monitoramento/projuris/ProjurisParadosAssinatura.tsx` | Adaptar — dados do CSV |
| `src/components/monitoramento/projuris/ProjurisFluxoAprovacoes.tsx` | Adaptar — timeline com datas A/B/C |
| `src/components/monitoramento/TabProjuris.tsx` | Adicionar botão de importação |
| `package.json` | Adicionar `@dnd-kit/core` e `@dnd-kit/sortable` |

