

## Bugs de Visualização — Backoffice & Minhas Solicitações

### Bug 1 — Cancelamento aprovado não sai da aba "Cancel. Pendente"

**Causa:** Em `Backoffice.tsx`, `cancelamentoPendenteIds` é um Set local atualizado por `useEffect` que dispara após `solicitacoes` mudar. Quando `handleAprovarCancelamento`/`handleRejeitarCancelamento` chamam `fetchSolicitacoes()`, há uma janela onde:
1. O DB já tem `cancelamento_pendente = false`
2. Mas o Set local ainda contém o ID
3. O filtro `cancelamentoPendenteIds.has(s.id)` mantém o card na aba

**Fix:** Atualização otimista — remover o ID do Set imediatamente no início de `handleAprovarCancelamento` e `handleRejeitarCancelamento`, antes do `await`.

```ts
setCancelamentoPendenteIds(prev => {
  const next = new Set(prev);
  next.delete(sol.id);
  return next;
});
```

### Bug 2 — Solicitar Ajuste de OC vai para "Em Proc." em vez de "Recebidas"

**Causa:** Em `MinhasSolicitacoes.tsx > handleSolicitarAjuste` (linha 712), quando o solicitante pede ajuste numa OC `aguardando_aceite`, o status volta para `em_processamento`. Isso aparece na aba **"Em Proc."** do backoffice, sem destaque de que o solicitante pediu retrabalho.

**Fix:** Mudar o status alvo para `recebido` (entra em "Recebidas" do backoffice como nova tarefa). Atualizar:
- `MinhasSolicitacoes.tsx` linha 712: `status: 'recebido'`
- Linha 720: `status_novo: 'recebido'`
- Garantir que o histórico mantém `acao: 'ajuste_solicitado'` (já tem) para o card mostrar o banner "Solicitante pediu ajuste na OC" — atualmente o `BackofficeSolicitacaoCard` deve detectar isso pela última ação no histórico, não pelo status.

Verificar/ajustar também: o card no backoffice deve exibir um chip de destaque "🔁 Ajuste pedido pelo solicitante" quando a última `acao` no histórico for `ajuste_solicitado` e o status atual for `recebido`.

### Bug 3 — Contagem nas abas ignora filtros ativos

**Causa em ambas as páginas:**
- `Backoffice.tsx` (linha 1263): `groupedSolicitacoes` usa `filteredSolicitacoes` ✅ — então contagem **já reflete** filtros de fornecedor/"apenas minhas". MAS o badge "Cancel. Pendente" usa `cancelamentoPendenteIds.has(s.id)` que filtra só por ID; tudo certo.
- `MinhasSolicitacoes.tsx` (linha 343): `statusCounts` usa `solicitacoes` (não filtrado) → contagem **NÃO reflete** filtros de busca, empreendimento.

**Fix em `MinhasSolicitacoes.tsx`:** Calcular `statusCounts` a partir de uma base já filtrada por busca + empreendimento (mas NÃO pela aba ativa, senão zera os outros). Criar `solicitacoesFiltradasBase` (sem filtro de aba) e basear contagem nele.

**Verificação extra no Backoffice:** Confirmar que o filtro de busca no `Backoffice` também passa por `filteredSolicitacoes` — atualmente search é via RPC, então já reflete. ✅

### Outros bugs do mesmo tipo identificados

- **`SolicitanteKPIs.tsx`**: KPIs calculados sobre array bruto. Verificar se devem refletir filtros — caso sim, propagar `solicitacoesFiltradasBase`.
- **Modal `OCDetalhesModal`**: badge "Cancelamento Pendente" lê `(detalhes.solicitacao as any).cancelamento_pendente` — deve continuar funcionando após fetch refresh; OK.

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/pages/Backoffice.tsx` | Atualização otimista do `cancelamentoPendenteIds` em aprovar/rejeitar |
| `src/pages/MinhasSolicitacoes.tsx` | (a) Status `recebido` em `handleSolicitarAjuste`; (b) `statusCounts` baseado em filtragem (busca+empreendimento) |
| `src/components/backoffice/BackofficeSolicitacaoCard.tsx` | Chip "Ajuste pedido pelo solicitante" quando `ultimaAcao === 'ajuste_solicitado'` e status `recebido` |
| `src/components/solicitante/SolicitanteKPIs.tsx` | (Opcional) KPIs sobre base filtrada |

