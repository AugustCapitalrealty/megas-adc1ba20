
# Plano — Correções no Backoffice + Paridade no Solicitações

## Parte 1 — Correções urgentes no Backoffice (bugs visuais)

### Bug 1: "Sem fornecedor" aparecendo indevidamente
**Causa raiz confirmada no banco:** o RPC `get_solicitacoes_backoffice` usa `COALESCE(f.nome_fantasia, f.razao_social)`. Vários fornecedores têm `nome_fantasia` como **string vazia `''`** (não NULL), então o `COALESCE` retorna `''` em vez de cair para `razao_social`. Solicitações como #2026000402 (S. Vargas), #2026000401 (Dell) e #2026000398 (J.G da Silva) ficam sem nome, mesmo tendo fornecedor.

**Correção (migration):** alterar a função para usar `NULLIF` antes do `COALESCE`:
```sql
COALESCE(NULLIF(TRIM(f.nome_fantasia), ''), NULLIF(TRIM(f.razao_social), '')) AS fornecedor_razao
```
Aplicar a mesma lógica defensiva no front (`BackofficeTable.tsx`) como segurança extra: tratar string vazia como ausência.

### Bug 2: Status "Em Fila" quebrando em duas linhas
O `StatusBadge` usa label completo de `STATUS_LABELS` e dentro da célula de tabela com `w-[110px]` ele quebra. Soluções aplicadas em conjunto:
- Adicionar `whitespace-nowrap` ao `.status-badge` (ajuste em `index.css` já que essa classe é global).
- Aumentar a largura da coluna Status para `w-[130px]` e usar versão compacta (sem ícone OU ícone + label, mas em uma linha só).
- Para a coluna Empreendimento, normalizar o label via `EMPREENDIMENTO_LABELS` (atualmente faz replace manual e fica "Mega curitiba" minúsculo) e adicionar `whitespace-nowrap`.

### Bug 3: Linhas com altura desigual / desalinhadas
- Definir altura mínima fixa nas linhas (`h-14`) para padronização.
- Mover o badge "emergencial" (ícone vermelho) para inline ao lado do status, **dentro** do mesmo bloco flex `items-center` (hoje fica abaixo, jogando a linha pra baixo).
- Truncar a descrição em uma única linha com `truncate`, com `max-w` controlado pela coluna pai.
- Padronizar tipografia (tudo `text-sm` exceto valor que fica `font-medium tabular-nums`).

## Parte 2 — Paridade Solicitações ↔ Backoffice

Hoje o **Backoffice** tem: toolbar sticky, chips de filtros ativos, toggle Cards/Tabela, atalhos `j/k/Enter/x/a`, tooltip de teclado. O **Solicitações** tem só FilterBar + cards. Vamos trazer o que faz sentido para o solicitante, **mantendo as visões distintas**:

### O que vai para o Solicitante (igual ao Backoffice)
1. **Toggle Cards/Tabela** persistido em localStorage (`solicitante:viewMode`).
2. **Nova `SolicitanteTable`** densa, espelho do `BackofficeTable`, mas com colunas adaptadas:
   - Protocolo (com badge AC/OC + data) · Status · Fornecedor / Descrição · Empreend. · Valor · **Idade** (tempo desde criação) · **Pendência** (corrigir / aceitar OC / enviar NF — chip colorido) · Ações (Ver / Editar / Cancelar conforme status).
   - **Sem** coluna "Responsável" (não faz sentido para o solicitante).
   - **Com** ícone de favorito clicável na coluna do protocolo (paridade com card).
3. **Atalhos de teclado** `j / k / ↑ / ↓` para navegar e `Enter` para expandir/abrir detalhes. (Sem `a`/`x` que são exclusivos do backoffice.)
4. **Tooltip de teclado** no header (mesmo ícone `Keyboard`) listando: `/` busca, `j/k` navegar, `Enter` abrir.
5. **Chips de filtros ativos** abaixo da FilterBar (busca, empreendimento, viewMode), com botão "Limpar tudo".
6. **Toolbar sticky** (search + select empreendimento + sort + Minhas/Empreendimento + Exportar + toggle view + atalhos), no mesmo padrão visual do Backoffice (`sticky top-0 bg-background/95 backdrop-blur`).

### O que **NÃO** vai (mantém visão própria)
- Backoffice mantém: coluna Responsável, atalho `a` (assumir), `x` (selecionar), checkbox de seleção em massa, BatchActionBar.
- Solicitante mantém: `PendingHeaderChips` (chips de pendências do solicitante: correções/info/aceite/NF) acima da toolbar — equivalente conceitual aos KPIs do Backoffice, mas focado em "o que EU preciso fazer".
- Banner de sucesso ao criar (verde com PartyPopper) só no solicitante.

## Parte 3 — Padronização visual conjunta

- Criar utilitários compartilhados em `src/lib/solicitacao-display.ts`:
  - `getFornecedorDisplay(razao, fantasia)` — função única que pula vazio/null/whitespace.
  - `formatEmpreendimento(emp)` — usa `EMPREENDIMENTO_LABELS` em vez de `replace` ad-hoc.
  - `getSlaTone(sol)` — extrair do `BackofficeTable` para reuso.
- Atualizar **ambas** as tabelas para usar esses helpers, garantindo nunca mais "Sem fornecedor" indevido.
- Ajustar `.status-badge` no `index.css`: `whitespace-nowrap`, `inline-flex`, altura fixa `h-6`, padding compacto.

## Arquivos afetados

**Migration:**
- Nova migration corrigindo `get_solicitacoes_backoffice` (NULLIF + TRIM no COALESCE de fornecedor).

**Novos:**
- `src/components/solicitante/SolicitanteTable.tsx`
- `src/hooks/useSolicitanteShortcuts.ts`
- `src/lib/solicitacao-display.ts`

**Editados:**
- `src/components/backoffice/BackofficeTable.tsx` (whitespace-nowrap, altura padrão, EMPREENDIMENTO_LABELS, helper de fornecedor, emergencial inline)
- `src/pages/MinhasSolicitacoes.tsx` (toolbar sticky, toggle view, chips de filtros ativos, atalhos, tooltip teclado, render condicional Cards/Tabela)
- `src/pages/Backoffice.tsx` (usar helpers compartilhados)
- `src/index.css` (`.status-badge` com `whitespace-nowrap`)

## Resultado esperado

- Linhas com altura uniforme, status numa linha só, fornecedor sempre correto.
- Solicitante e Backoffice com **mesma linguagem visual** (toolbar, tabela, atalhos, chips), mas cada um com colunas e ações específicas do seu papel.
- Power-users do solicitante ganham densidade igual à do backoffice; backoffice fica visualmente mais limpo.
