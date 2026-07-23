## 1. Cadastrar cliente "JBT Marel" em Mega Itajaí

- Inserir novo registro em `clientes` (nome: `JBT Marel`).
- Vincular em `clientes_empreendimentos` ao empreendimento `mega_itajai`.
- Feito via ferramenta de inserção de dados (não é migração).

## 2. Comunicado ao Cliente deixa de ser obrigatório para "Módulo Vago"

Hoje, sempre que a solicitação tem `origem_custo = 'cliente'`, o sistema exige o anexo `comunicado_cliente`. Isso também acontece quando o cliente escolhido é **Módulo Vago** (id `83739dae-d131-41df-8c15-a6fa1cead116`), que não é um cliente real e portanto não recebe comunicado.

Ajustar em três lugares para manter frontend e banco alinhados:

- **`src/hooks/useNovaSolicitacaoForm.ts`** (função que monta a lista de anexos obrigatórios): só adicionar `comunicado_cliente` como obrigatório quando `origemCusto === 'cliente'` **e** o `clienteId` não for o Módulo Vago.
- **`src/pages/MinhasSolicitacoes.tsx`** (mesma lista usada no fluxo de correção): aplicar a mesma exceção.
- **Banco — nova migração** em `public.solicitacao_missing_anexos(...)`: quando `origem_custo = 'cliente'` mas `cliente_id` é o Módulo Vago, não incluir `comunicado_cliente` no array `required`. Assim o trigger `enforce_solicitacao_anexos` para de bloquear envio/promoção.

## Detalhes técnicos

- ID canônico do Módulo Vago: `83739dae-d131-41df-8c15-a6fa1cead116` (mesmo id compartilhado entre os 4 empreendimentos).
- Constante nova em `src/lib/solicitacao-rules.ts` (`MODULO_VAGO_CLIENTE_ID`) para reuso no frontend, evitando string mágica repetida.
- Migração ajusta apenas a função `solicitacao_missing_anexos`; sem mudanças em RLS, grants ou triggers.
- Sem alteração no fluxo de energia (o pedido é sobre solicitações comuns, onde o cliente "Módulo Vago" pode ser escolhido).
