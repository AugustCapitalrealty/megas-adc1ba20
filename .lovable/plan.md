## Objetivo

A tela "Responder Solicitação de Informações" / "Corrigir e Reenviar Solicitação" está apertada: o modal usa `max-w-lg` (≈512px) com muito conteúdo (descrição longa, valor, natureza, fornecedores, anexos). Vamos dar mais largura, hierarquia visual e respiro, mantendo todo o conteúdo atual.

## Mudanças propostas

### 1. Largura e altura do modal
Em `src/components/solicitante/SolicitanteModals.tsx`, no `EditModal`:

- Trocar `max-w-lg max-h-[90vh]` por algo confortável e responsivo:
  - `sm:max-w-2xl lg:max-w-3xl max-h-[92vh] p-0` (o `p-0` permite header/footer fixos)
- Estruturar em três áreas:
  - **Header fixo** (com título e, quando houver, o destaque de "Informações solicitadas / Motivo da correção" logo abaixo do título — assim o usuário não precisa rolar para lembrar o pedido).
  - **Corpo rolável** (`overflow-y-auto px-6 py-4 space-y-5`).
  - **Footer fixo** com os botões de ação (Cancelar / Reenviar), evitando que o usuário precise rolar até o fim para enviar.

### 2. Layout em duas colunas para campos curtos
Dentro do corpo, agrupar campos curtos em grid responsivo para não desperdiçar largura:

- `Valor (R$)` + `Natureza Orçamentária` lado a lado em `md:grid-cols-2 gap-4`.
- `Descrição` e `Escopo Detalhado` permanecem largura total (são textareas longas).
- Aumentar `rows` da Descrição de 4 → 6 para reduzir a sensação de "caixinha apertada".

### 3. Destaque das instruções do backoffice
O bloco azul "Informações solicitadas" (e o amarelo "Motivo da correção") sai do meio do formulário e vira um **banner sticky no topo do corpo** (logo abaixo do header), com:

- ícone maior, título em negrito, texto em `text-sm leading-relaxed`;
- borda lateral colorida (`border-l-4`) para reforço visual;
- `whitespace-pre-wrap` para preservar quebras de linha do que o backoffice escreveu.

### 4. Bloco "Fornecedor Atual"
- Reduzir padding interno (`p-3` em vez de `p-4`) e usar `text-sm` no nome para ficar menos pesado.
- Manter as opções de troca, mas com espaçamento `gap-2` em vez de `gap-3`.

### 5. Bloco de Anexos
- Os títulos "Anexos já enviados" e "Adicionar/Substituir anexos" passam a ter divisores sutis (`border-t pt-4`) para separar visualmente das seções anteriores.

### 6. Acessibilidade / UX
- Adicionar `DialogDescription` curta abaixo do título ("Revise as informações abaixo e reenvie a solicitação para o backoffice").
- Botões do footer com `w-full sm:w-auto` para ficarem confortáveis no mobile.

## Arquivos afetados

- `src/components/solicitante/SolicitanteModals.tsx` — apenas o componente `EditModal` (sem alterar lógica, props ou handlers; somente JSX/classes Tailwind).

## Fora do escopo

- Não mexemos em validações, submit, regras de troca de fornecedor, nem em outros modais (Approve, Reject, etc.).
- Não alteramos schema do banco nem RLS.
