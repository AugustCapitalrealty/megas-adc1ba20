## Objetivo

Adicionar a aba **Todas** (ao lado de "Pendência de justificativa" e "Justificadas") que também influencia os cards quando selecionada, centralizar a coluna **Ações** da tabela e exibir apenas os 2 primeiros nomes do **Solicitante**.

---

## Alterações em `src/pages/MonitoramentoOC.tsx`

### 1. Nova aba "Todas"
- Estender `TabKey` para `'todas' | 'pendencia' | 'justificadas'`.
- Em `TAB_STATUS`, `'todas'` aceita todos os status visuais (`em_prazo`, `atencao`, `pendente_justificativa`, `aguardando_nf`, `adiado`, `cancel_solicitado`).
- `tabCounts` passa a incluir `todas` (= `cardFilteredGroups.length`).
- Adicionar terceiro botão na barra de abas, antes de "Pendência", visual neutro (border-primary/40 quando ativo).
- A aba **Todas** continua respeitando o card ativo (assim segue o pedido: clicar nela "influencia nos cards" — mantém o recorte do card e mostra todos os status dentro dele; e ao clicar em um card, a aba Todas exibe a contagem total daquele card).
- Ajustar `toggleCardFilter`: quando o usuário clica num card, manter o comportamento atual de pular para a aba apropriada (`pendencia`/`justificadas`), mas se a aba atual já for `'todas'`, **não** trocar de aba (preserva a visão consolidada).

### 2. Coluna "Ações" centralizada
- Cabeçalho: `<TableHead className="text-right w-[180px]">` → `text-center w-[180px]`.
- Célula da linha principal: `<TableCell className="text-right">` → `text-center` e o `div` interno passa de `justify-end` para `justify-center`.

### 3. Nome do solicitante reduzido a 2 palavras
- Criar helper local `getShortName(name)` que retorna as duas primeiras palavras (ex.: "Guilherme August Padilha" → "Guilherme August"). Mantém `title` com o nome completo no hover.
- Substituir `{group.solicitante_nome || '—'}` por `{getShortName(group.solicitante_nome) || '—'}` na célula de Solicitante.

### 4. Mensagem de tabela vazia
- Adicionar caso para `activeTab === 'todas'`: "Nenhuma OC neste recorte".

---

## Resumo do comportamento esperado

- 3 abas: **Todas · Pendência de justificativa · Justificadas** — todas refletem o card ativo (e vice-versa).
- Coluna **Ações** com botão "Justificar" e menu `⋯` centralizados.
- Coluna **Solicitante** mostra no máximo 2 nomes; nome completo segue acessível via tooltip.
