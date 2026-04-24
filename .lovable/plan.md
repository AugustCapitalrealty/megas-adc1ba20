## Objetivo

Ao **concluir uma solicitação** no backoffice, capturar o **número Fluig do pagamento lançado** e gravá-lo na solicitação (campo novo, separado do `numero_chamado_fluig` da compra e do `numero_fluig_cadastro` do produto/serviço).

---

## 1. Banco de dados (migração)

Adicionar coluna em `public.solicitacoes`:

```sql
ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS numero_fluig_pagamento text;

COMMENT ON COLUMN public.solicitacoes.numero_fluig_pagamento IS
  'Número do Fluig lançado para pagamento, preenchido na conclusão da solicitação pelo backoffice.';
```

> Sem RLS adicional — herda das policies existentes da tabela.

---

## 2. Modal "Concluir Solicitação" (`src/components/backoffice/BackofficeModals.tsx`)

No componente `ConcluirSolicitacaoModal`:

- Adicionar state `numeroFluigPagamento` (string).
- A 2ª linha do checklist passa de um simples checkbox para:
  - **Checkbox** "Pagamento lançado no Fluig"
  - Quando marcado, exibir um `<Input>` obrigatório logo abaixo, com placeholder `Nº do Fluig de pagamento (ex: 123456)`.
- `isReady = checkNF && checkFluig && numeroFluigPagamento.trim().length > 0`.
- Mensagem de ajuda discreta abaixo do input quando vazio: "Informe o nº Fluig para concluir".
- Trim do valor antes de enviar; reset ao fechar/cancelar.
- Ajustar a assinatura do `onConfirm` para receber também `numeroFluigPagamento`:
  - `onConfirm: (sol, numeroFluigPagamento) => Promise<void>`.
- Atualizar o tipo da prop `handleConcluirLiberadaConfirmed` no `BackofficeModalsProps` (linha 152) para aceitar o segundo argumento.

---

## 3. Handler de conclusão (`src/pages/Backoffice.tsx`)

Em `handleConcluirLiberadaConfirmed`:

- Aceitar segundo argumento `numeroFluigPagamento: string`.
- No `update` da solicitação, gravar também `numero_fluig_pagamento`:
  ```ts
  .update({
    status: 'concluida' as any,
    numero_fluig_pagamento: numeroFluigPagamento,
    data_conclusao: new Date().toISOString(),
  } as any)
  ```
  (Inclui `data_conclusao` para garantir consistência caso ainda não exista trigger que preencha; campo já existe na tabela.)
- No insert do `historico_solicitacoes`, atualizar o `motivo` para:
  `NF recebida e pagamento lançado no Fluig #${numeroFluigPagamento}`.

---

## 4. Sem alterações imediatas em listagens

A coluna fica disponível no banco para uso futuro (exibir o número Fluig de pagamento em telas de detalhes, exportações etc.). O RPC `get_solicitacoes_backoffice` e o tipo `SolicitacaoBackoffice` **não** precisam ser tocados agora — fica como melhoria opcional caso o usuário peça.

---

## Arquivos modificados

- **migration**: nova coluna `solicitacoes.numero_fluig_pagamento`.
- `src/components/backoffice/BackofficeModals.tsx` — input no modal + tipo da prop.
- `src/pages/Backoffice.tsx` — handler grava o campo + histórico enriquecido.
