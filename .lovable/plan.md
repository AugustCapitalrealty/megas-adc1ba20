

## Bug: Cancelamento aprovado não efetiva o cancelamento

### Causa raiz (confirmada no banco)

A solicitação `#2026000146` (status `aguardando_aceite`, `cancelamento_pendente=true`) teve o botão "Aprovar Cancelamento" clicado **7 vezes** entre 09/04 e 17/04. Em todas as tentativas:

1. O `handleAprovarCancelamento` chamou `supabase.update({ status: 'cancelado', cancelamento_pendente: false })`
2. O trigger `validate_status_transition_trigger` **rejeitou** a operação porque a transição `aguardando_aceite → cancelado` **não existe** em `status_transitions` (só existem `recebido/em_analise/pendente_correcao/aprovado/em_processamento/aguardando_informacoes → cancelado`)
3. O código **não verifica o `error`** retornado pelo supabase — então segue inserindo o `historico_solicitacoes` (que não tem trigger de validação) e exibe o toast de sucesso
4. A linha em `solicitacoes` permanece intocada → continua aparecendo na aba "Cancel. Pendente"

Mesmo problema afeta `enviado_fornecedor` (outro status atualmente com cancelamento pendente no banco) e qualquer outro status que não esteja na tabela.

### Fix (3 partes)

**1. Migração SQL — adicionar transições faltantes para `cancelado`**

Adicionar em `status_transitions` todas as transições `<status_ativo> → cancelado` que faltam:
- `aguardando_aceite → cancelado`
- `liberado_fornecedor → cancelado`
- `enviado_fornecedor → cancelado`
- `aguardando_nf_boleto → cancelado`
- `nf_boleto_enviados → cancelado`
- `aguardando_execucao → cancelado`
- `oc_ac_emitida → cancelado` (se existir no enum)

Usar `INSERT ... ON CONFLICT DO NOTHING` para ser idempotente.

**2. Reparar a solicitação #2026000146 (e a outra `enviado_fornecedor`)**

Após adicionar as transições, executar UPDATE manual nas duas linhas órfãs:
```sql
UPDATE solicitacoes 
SET status='cancelado', cancelamento_pendente=false 
WHERE cancelamento_pendente=true;
```

**3. Frontend — checar erros do Supabase em `Backoffice.tsx`**

Em `handleAprovarCancelamento` e `handleRejeitarCancelamento`:
- Capturar `{ error }` de cada chamada `await supabase...`
- Se `error` existir: lançar `throw error` para cair no `catch`, **reverter** o optimistic update (re-adicionar o ID em `cancelamentoPendenteIds`) e mostrar toast com a mensagem real do erro
- Mesma proteção em outros handlers de update críticos do Backoffice (auditoria leve em `handleAprovarOC`, `handleRejeitarOC`, `handleConcluirLiberada` para evitar bugs silenciosos similares)

### Arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/<novo>.sql` | INSERT idempotente das transições para `cancelado` + UPDATE de reparo das linhas pendentes |
| `src/pages/Backoffice.tsx` | Checar `error` em todas as chamadas dentro dos handlers de cancelamento; reverter optimistic update no erro; aplicar padrão também aos handlers de OC |

