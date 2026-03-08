

# Corrigir overflow do nome do fornecedor no modal de detalhes

## Problema
No `OCDetalhesModal.tsx`, o nome do fornecedor nos summary cards vaza para fora do card quando é muito longo (ex: "GRASSTECNO GRAMADOS PAI...").

## Solução
Adicionar `truncate` e `min-w-0` nos cards de resumo para garantir que textos longos sejam cortados com ellipsis.

### Arquivo: `src/components/monitoramento/OCDetalhesModal.tsx`

No grid de summary cards, ajustar o card do Fornecedor:
- Adicionar `min-w-0` no container flex e no div interno
- Adicionar `truncate` no `<p>` do nome do fornecedor (já existe, mas o container pai precisa de `min-w-0` para funcionar)

Aplicar o mesmo padrão preventivo nos outros 3 cards para consistência.

**1 arquivo, ~4 linhas alteradas.**

