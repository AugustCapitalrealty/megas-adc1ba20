

# Plano: Múltiplas OCs + Melhorias de UX

## 1. Permitir múltiplas OCs por solicitação

**Problema atual**: O modal de registro de OC aceita apenas um documento por vez e ao registrar, muda o status para `aguardando_aceite`, impedindo registrar mais OCs.

**Solução**: Refatorar o modal para aceitar múltiplas OCs de uma vez (lista dinâmica de OCs). Cada OC terá seu número e PDF. O backoffice adiciona quantas linhas precisar antes de submeter.

### Alterações em `src/pages/Backoffice.tsx`:

- Trocar `numeroDocumento` (string) e `documentoFile` (File) por um array `documentosOC: Array<{ numero: string; file: File | null; pdfValidation: PdfValidationResult | null; validating: boolean; confirmarDivergencia: boolean }>`.
- No modal, renderizar cada OC como um card com campos de número e upload, com botão "Adicionar outra OC".
- `handleRegistrarOCAC` faz upload de todos os documentos em sequência, inserindo um registro em `documentos_emitidos` para cada OC.
- O histórico registra todos os números: "OC nº 123, 456 emitida(s)".
- Botão "Adicionar OC" permite adicionar linhas dinamicamente; botão de remover para cada linha (exceto a primeira).

### Alterações no modal de Detalhes (footer):
- Para status `aguardando_aceite`, `liberado_fornecedor`, `enviado_fornecedor`, `aguardando_nf_boleto` — adicionar botão "Adicionar OC" que abre o modal de registro sem mudar o status (apenas insere o documento).
- `handleRegistrarOCAC` só muda status se a solicitação ainda estiver em `aprovado` ou `em_processamento`.

## 2. Melhorias de UX para Solicitantes

### 2a. Skeleton loaders nas páginas principais
- `MinhasSolicitacoes`: trocar o spinner central por skeleton cards (3-4 cards placeholder com shimmer).
- `Dashboard`: trocar spinner por skeleton nos KPI cards.

### 2b. Feedback visual ao copiar protocolo
- Já implementado no `SolicitacaoCard` — verificar se funciona bem.

### 2c. Toast de sucesso mais informativo
- Ao submeter nova solicitação, incluir protocolo no toast e botão "Ver solicitação" que navega para MinhasSolicitacoes.

## 3. Melhorias de UX para Backoffice

### 3a. Contador de OCs emitidas na listagem
- No card da solicitação no Backoffice, quando já tem documentos emitidos, mostrar badge "2 OCs" ao lado do protocolo.

### 3b. Atalho de teclado no modal de ação
- Enter para confirmar ação quando o botão está habilitado.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Backoffice.tsx` | Modal de OC múltipla, botão "Adicionar OC" em mais status, skeleton loader, badge de OCs |
| `src/pages/MinhasSolicitacoes.tsx` | Skeleton loader no lugar do spinner |
| `src/pages/Dashboard.tsx` | Skeleton loader nos KPIs |
| `src/components/ui/SolicitacaoCardSkeleton.tsx` | Componente skeleton reutilizável (já existe, verificar) |

