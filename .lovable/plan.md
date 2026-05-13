## Permitir trocar fornecedor mesmo sem concorrentes na correção

Hoje, no modal de "Corrigir e Reenviar Solicitação" (`SolicitanteModals.tsx`), o bloco de troca de fornecedor só aparece quando existe **pelo menos um concorrente**:

```ts
{(fornecedoresInfo.concorrente1 || fornecedoresInfo.concorrente2) && fornecedoresInfo.principal && (...)}
```

Em solicitações como **2026000465** (tipo AC, sem concorrentes), o solicitante não tem nenhuma forma de trocar o fornecedor escolhido errado, mesmo após o backoffice devolver para correção.

### Alteração

**`src/components/solicitante/SolicitanteModals.tsx`** (bloco "Supplier swap", linhas 180–255)

1. Trocar a condição de exibição para apenas `fornecedoresInfo.principal` — o bloco passa a aparecer sempre que houver fornecedor principal no rascunho em correção.
2. Renderizar as opções `concorrente1` e `concorrente2` apenas quando existirem (já está condicional). A opção **"Buscar outro fornecedor"** (`novo`) sempre aparece — quando não há concorrentes, será a única opção, o que resolve o caso desta solicitação.
3. Ajustar a mensagem informativa abaixo das opções: quando não houver concorrentes, mostrar "ℹ️ O fornecedor atual será substituído pelo novo." em vez de "movido para a posição de concorrente".

### Lógica de gravação (já compatível)

Em `MinhasSolicitacoes.tsx` `handleResubmit` (linhas 677–690), o ramo `novoFornecedorEscolhido === 'novo'` já trata o caso sem concorrentes:
- Define `fornecedor_id = novoFornecedorBuscado.id`
- Move o antigo para `concorrente_1` se vazio, senão para `concorrente_2`, senão simplesmente é descartado (esse é o fluxo de hoje quando ambos já estão preenchidos — para 2026000465 vai para `concorrente_1`).

Nenhuma mudança de backend, RLS, schema ou tipos é necessária.

### Fora de escopo

- Mudanças no fluxo do backoffice ou na criação inicial.
- Permitir trocar fornecedor em outros estados além de `pendente_correcao`/`aguardando_informacoes`.
- Histórico/auditoria adicional da troca (continua o registro de `reenvio`/`resposta_informacoes` atual).
