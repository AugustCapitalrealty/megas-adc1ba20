

# Plano: Destacar linhas do solicitante no Monitoramento OC

## Problema
O painel mostra OCs do empreendimento inteiro, mas o solicitante não consegue identificar rapidamente quais são as **suas** solicitações. Precisa de um destaque visual nas linhas que ele abriu.

## Alterações

### `src/pages/MonitoramentoOC.tsx`

1. **Adicionar `user_id` à interface `OCMonitorRow`** — novo campo `user_id: string`.

2. **Buscar `user_id` na query de solicitações** — adicionar `user_id` ao `.select()` da query de `solicitacoes` (linha ~121).

3. **Popular `user_id` no mapeamento de rows** — incluir `user_id: sol.user_id` ao montar cada row (linha ~170).

4. **Destacar visualmente a linha do solicitante** — na `TableRow` (linha ~536), adicionar uma classe condicional:
   - Borda esquerda azul (ex: `border-l-4 border-l-primary`) quando `row.user_id === user?.id`
   - Isso se soma aos destaques existentes (amarelo para pendente, vermelho para cancelamento)

5. **Legenda** — Adicionar um pequeno indicador na área de filtros: "🔵 Suas solicitações" para explicar o destaque.

## Resultado
Linhas abertas pelo usuário logado terão uma borda lateral colorida, tornando imediato identificar quais OCs são de sua responsabilidade.

