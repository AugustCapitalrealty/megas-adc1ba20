

# Plano: Aba "Monitoramento Projuris" no painel de Monitoramento

## Objetivo

Adicionar uma segunda aba ao `MonitoramentoOC` para monitorar solicitações que possuem número Projuris, exibindo o andamento jurídico (etapas do `acompanhamento_juridico`) em formato de tabela similar ao OC x NF.

## Estrutura

O componente `MonitoramentoOC.tsx` será envolvido por `Tabs` com duas abas:
- **OC x NF** (conteúdo atual, inalterado)
- **Projuris** (novo conteúdo)

## Aba Projuris — Dados e lógica

1. **Buscar solicitações** com `numero_projuris IS NOT NULL` (campo já existente na tabela `solicitacoes`), excluindo status `cancelado` e `concluida`.
2. **Buscar `acompanhamento_juridico`** para essas solicitações e determinar a etapa atual (última registrada).
3. **Enriquecer** com fornecedor (nome) e perfil do solicitante.
4. **Filtros**: empreendimento, etapa jurídica atual, busca por texto (protocolo, fornecedor, nº Projuris).

## Aba Projuris — UI

- **KPIs**: Total com Projuris | Em elaboração de minuta | Aguardando assinatura | Contratos vigentes
- **Tabela**: Protocolo | Nº Projuris | Empreendimento | Fornecedor | Valor | Instrumento | Etapa Atual | Dias na etapa | Ações
- **Ações por linha**: Ver detalhes (abre `OCDetalhesModal` existente), ver histórico jurídico
- Linhas do próprio usuário destacadas com borda azul (mesmo padrão OC x NF)

## Alterações

| Arquivo | Mudança |
|---------|---------|
| `src/pages/MonitoramentoOC.tsx` | Extrair conteúdo OC x NF para componente interno `TabOCxNF`; adicionar `Tabs` wrapper com aba "Projuris" renderizando novo componente `TabProjuris` inline |

Tudo em um único arquivo para manter o padrão existente — o componente `TabProjuris` será definido dentro de `MonitoramentoOC.tsx` (ou extraído se ficar grande demais).

