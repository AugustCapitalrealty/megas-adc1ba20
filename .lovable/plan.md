

# Fix: Financeiro mostrando "aprovado" quando devolveu para Facilities

## Problema

No caso do 150010: `localizacao` indica que está com Facilities (stage 1), mas `gerencia_financeiro_conclusao` está preenchido. A lógica atual só marca Financeiro como `rejected` quando `currentStage === 0` (Início). Quando `currentStage === 1` (Facilities), cai no `else` e fica como `pending` — mas a UI mostra a data de conclusão em verde porque `financeiroConclusao` existe.

A regra correta: se Financeiro tem data de conclusão mas o processo voltou para antes dele (stage < 2), significa **rejeição** — independente de ter voltado para Início ou para Facilities.

## Alteração

**Arquivo:** `src/lib/fluig-utils.ts`, linhas 233-243

Remover a distinção `currentStage === 0` vs `currentStage === 1`. Se `financeiroConclusao` existe e `currentStage < 2`, é sempre `rejected`:

```text
// ANTES (linha 234-240):
if (financeiroConclusao && currentStage < 2) {
  if (currentStage === 0) {
    financeiro = 'rejected';
  } else {
    financeiro = 'pending';
  }
}

// DEPOIS:
if (financeiroConclusao && currentStage < 2) {
  financeiro = 'rejected';
}
```

Mesma lógica já limpa a `financeiroConclusao` na linha 268 quando status é `rejected`, garantindo que a data não aparece em verde.

Nenhum outro arquivo precisa ser alterado — a correção é apenas na função centralizada `getFluigApprovalStatus`.

