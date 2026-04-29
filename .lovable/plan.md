## Ajustes de UI — Gestão BO (Projuris)

Arquivo único: `src/components/monitoramento/projuris/ProjurisGestaoBackoffice.tsx`

### 1. Remover coluna "Valor"
- Remove o `<TableHead>` "Valor" e a célula correspondente (incluindo o modo de edição inline com `editingValor` / `valorDraft` / `startEditValor` / `saveValor`).
- Remove os states `editingValor`, `valorDraft` e helpers `fmtCurrency`, `startEditValor`, `saveValor` (não usados em outro lugar).
- Mantém o campo `valor` no SELECT da query e na interface `Row` (a coluna no banco continua existindo, só não é exibida nesta tela). Ajusta `colSpan` do empty state de 10 → 9.
- Remove o ícone `Pencil`, `Check`, `X` da lista de imports se não restarem outros usos (manter apenas os necessários).

### 2. Centralizar Status
- `<TableHead>Status</TableHead>` ganha `className="text-center"`.
- Célula do status: o wrapper `flex flex-col gap-1` passa a ser `flex flex-col gap-1 items-center` para centralizar o badge de status e o badge de "Xd".

### 3. Encurtar Requisitante e Responsável (apenas primeiro + segundo nome)
- Cria helper local `shortName(s: string | null): string` que pega as duas primeiras palavras não vazias do nome (ignora "da", "de", "do", "das", "dos" como conectivos comuns para não devolver "José Da"). Exemplo: "Mauro Sergio Silva..." → "Mauro Sergio"; "José Ernesto da Rosa" → "José Ernesto".
- Aplica `shortName(r.requisitante)` e `shortName(r.responsavel)` na renderização das células (o filtro/busca continua usando o nome completo original).
- Reduz `max-w` das células e remove `truncate` quando o nome curto já couber confortavelmente. O badge "Você" e o chip "Backoffice/Jurídico" continuam funcionando.
- Tooltip opcional com nome completo no hover (usa `TooltipProvider` já importado) para manter informação acessível.

### 4. Unir Vínculo com Nº Projuris numa única coluna
- Renomear a coluna **"Nº Req."** para **"Projuris / Vínculo"** (header simples, alinhado à esquerda).
- Remove a coluna "Vínculo" separada (header e célula).
- Na célula combinada, layout em 2 linhas:
  - Linha superior: número Projuris (`font-mono text-sm font-medium`), igual hoje.
  - Linha inferior: se existir `vinculos[r.numero_requisicao]`, mostra o botão `<Link2 /> {protocolo}` (mesmo botão atual com tooltip "Ver solicitação interna" e onClick `setVinculoModal(v)`); senão, mostra `—` em `text-[10px] text-muted-foreground`.
- Ajusta `colSpan` do empty state para o novo total de colunas (era 10 → fica 8: Projuris/Vínculo, Requisitante, Empreend., Fornecedor, Status, Responsável, Data Req., Ação).

### 5. Detalhes técnicos
- Sem mudanças de schema, sem migrações.
- Sem mudanças em `ProjurisDecisaoModal` nem em `OCDetalhesModal`.
- KPIs, filtros, busca, switches "Apenas ações nossas" e "Minhas requisições" permanecem inalterados.
- Faixa lateral colorida das linhas (`border-l-4` overdue / our action) permanece.

### Fora do escopo
- Não alterar a coluna `valor` no banco (pode ser reutilizada em outra tela / iteração futura).
- Não mexer nas outras abas do Projuris (Em Aberto, Parados, Fluxo, Compliance, Finalizadas).
