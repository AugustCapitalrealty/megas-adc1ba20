## Objetivo

Permitir que ao clicar em um chip/serviço no calendário, o usuário abra uma **tela completa de detalhes do protocolo** com status, valores, **anexos**, e histórico de mudanças.

## Estado atual

- O clique no chip já chama `handleChipClick(s)` em `CalendarioServicos.tsx`, que abre `OCDetalhesModal` via `detalhesId`.
- O `OCDetalhesModal` hoje mostra: cabeçalho com status/valores, abas Timeline, Documentos (emitidos + fiscais), Mensagens, Projuris e Info.
- `useSolicitacaoDetalhes` (RPC `get_solicitacao_detalhes`) **já retorna** `anexos: Anexo[]` — porém o modal **não exibe anexos** (apenas documentos emitidos/fiscais).
- Componente `AnexoCard` já existe e é o padrão visual para listar anexos.

## O que falta entregar

1. **Adicionar aba "Anexos" no `OCDetalhesModal`** logo após a aba Documentos.
   - Usa `detalhes.anexos` (já disponível na resposta da RPC).
   - Renderiza usando `<AnexoCard>` (padrão do projeto).
   - Agrupa por `tipo` (Orçamento escolhido, Mapa de cotação, Concorrentes, Escopo, Rateio, Outros) usando `ANEXO_LABELS`.
   - Empty state "Nenhum anexo" quando vazio.
   - Contador no rótulo da aba: `Anexos (N)`.

2. **Garantir histórico de mudanças visível e claro.**
   - A aba Timeline já existe (`SolicitacaoTimeline showHistorico`), apenas confirmar que aparece como primeira aba (já é).
   - Adicionar mini-resumo "última atividade" no header já vem de `RecentActivitySummary` — manter.

3. **Melhorias no fluxo a partir do calendário**:
   - No `DiaServicosSheet`, o botão "Ver detalhes" e o chip já levam ao modal — manter.
   - No header do `OCDetalhesModal`, adicionar botão **"Copiar protocolo"** (ícone) ao lado do `#protocolo` para consistência com o sheet do dia.
   - Adicionar atalho `Esc` (já nativo do Dialog) e foco automático na aba Timeline ao abrir.

## Detalhes técnicos

**Arquivo principal:** `src/components/monitoramento/OCDetalhesModal.tsx`

- Importar `AnexoCard` de `@/components/AnexoCard` e `ANEXO_LABELS` de `@/types`.
- Adicionar `<TabsTrigger value="anexos">Anexos ({detalhes.anexos?.length || 0})</TabsTrigger>` entre Documentos e Mensagens.
- Adicionar `<TabsContent value="anexos">` que:
  - Agrupa `detalhes.anexos` por `tipo` em um `Map<string, Anexo[]>`.
  - Para cada grupo, renderiza um título pequeno e a lista de `<AnexoCard anexo={a} showTipo={false} />`.
  - Se vazio: mensagem com ícone (padrão `Inbox` ou `Paperclip`).
- Atualizar `grid-cols` da `TabsList` para acomodar a aba extra (hoje 5 colunas → 6).

**Sem alterações de schema/RLS necessárias** — o RPC `get_solicitacao_detalhes` já entrega `anexos` respeitando as policies da tabela `anexos`.

## Fora de escopo

- Reescrever o modal como uma página dedicada (mantemos o `Dialog` atual, que já é grande e funcional).
- Editar/excluir anexos a partir desta tela (somente leitura/download).
- Mudanças no calendário em si — o clique já está corretamente cabeado.