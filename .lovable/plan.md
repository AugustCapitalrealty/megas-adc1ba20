## Bug 1 — Erro "Cannot read properties of null (reading 'replace')" ao corrigir solicitação

**Causa:** No modal "Corrigir e Reenviar" (`SolicitanteModals.tsx`), as linhas 257 e 497 chamam `fornecedor.cnpj.replace(...)` direto. Se o fornecedor associado tiver `cnpj` nulo (ou se outros campos opcionais chegarem nulos do banco), a renderização quebra.

Outros pontos vulneráveis correlatos: `editValor.replace(...)` no handler de reenvio (linha 679 de `MinhasSolicitacoes.tsx`) e leitura de rascunho/duplicação em `useNovaSolicitacaoForm.ts` (linhas 142–144, 305, 314–315), que assumem string.

**Correção:**
- Em `SolicitanteModals.tsx` (linhas 257 e 497): formatar CNPJ com helper seguro — usar `formatCnpj(cnpj)` que retorna `'—'` quando nulo/vazio, evitando `.replace` em null.
- Em `MinhasSolicitacoes.tsx`:
  - `openEditModal` (linha 555): `setEditValor(sol.valor != null ? String(Math.round(sol.valor * 100)) : '')`.
  - `setEditDescricao(sol.descricao ?? '')` e `setEditNaturezaOrcamentaria(sol.natureza_orcamentaria ?? '' as any)`.
  - `handleResubmit` (linha 679): `(editValor || '').replace(...)`.
- Em `useNovaSolicitacaoForm.ts`: usar `(valor || '').replace`, `(valorServico || '').replace`, `(valorMaterial || '').replace`; nos `setValor(draft.valor ?? '')`, `setValorServico(draft.valorServico ?? '')`, `setValorMaterial(draft.valorMaterial ?? '')`.

## Bug 2 — Múltiplas solicitações criadas ao clicar várias vezes em "Enviar"

**Causa real:** O `handleSubmit` em `NovaSolicitacao.tsx` já tem trava (`isSubmittingRef` + `submitting`). O problema é que, depois do `insert` da solicitação ter sucesso (linha 781–787), passos posteriores podem lançar exceção sem `try/catch`:

- `supabase.from('historico_solicitacoes').insert(...)` (linha 824) — sem proteção.
- `supabase.from('profiles').select(...)` (linha 831) — sem proteção.

Se qualquer um falhar (RLS, rede), cai no `catch` geral. O usuário vê "Erro ao criar solicitação", o draft NÃO é limpo, e ao tentar de novo gera uma nova solicitação. Por isso aparecem #2026000620/621/622/623/625 todos iguais.

**Correção em `NovaSolicitacao.tsx` (handleSubmit):**
1. Marcar "ponto de não retorno" logo após o insert da solicitação bem-sucedido: a partir daí, qualquer erro em historico/profiles/notificações é apenas logado (try/catch individual) e a função segue para `clearDraft()` + toast de sucesso + navegação.
2. Envolver o insert em `historico_solicitacoes` (linha 824) em `try/catch` que apenas loga.
3. Envolver o `select` em `profiles` em `try/catch` (já tolerar `userProfile` undefined no envio das notificações).
4. Reforço opcional: desabilitar o botão de envio em `FormNavigation` quando `submitting` for true (verificar se já está).

Resultado: ao clicar várias vezes, mesmo se uma etapa periférica falhar, a solicitação não será duplicada — o draft é limpo na primeira resposta de sucesso do insert principal.

## Arquivos a alterar
- `src/components/solicitante/SolicitanteModals.tsx`
- `src/pages/MinhasSolicitacoes.tsx`
- `src/hooks/useNovaSolicitacaoForm.ts`
- `src/pages/NovaSolicitacao.tsx`

## Validação
- Typecheck (`tsgo`).
- Reabrir a solicitação afetada (#2026000627) para corrigir — modal não deve quebrar mesmo se fornecedor tiver CNPJ nulo.
- Clicar "Enviar" várias vezes rapidamente em uma nova solicitação — apenas 1 protocolo criado.