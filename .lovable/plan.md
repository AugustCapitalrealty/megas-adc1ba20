## Problema

A aba **Faturas** hoje monta uma fatura por cliente usando:
- todos os **módulos ativos** (não importa se houve lançamento na competência);
- o `cliente_id` **atual** do módulo (`energia_modulos.cliente_id`).

Isso quebra em dois casos reais:
1. Módulo sem lançamento naquele mês aparece (ou some) errado.
2. Módulo que **trocou de cliente** entre competências mostra a fatura no cliente atual, e não no cliente que era titular do contrato durante aquela competência.

A fonte de verdade certa é: **lançamentos da competência → contrato vigente naquele mês → cliente do contrato**.

## Mudanças

### 1. `src/components/admin/energia/FaturasTab.tsx`

- Em `fetchCompData`, ao ler `energia_contrato_modulos`, incluir `contrato.cliente_id` no inner join e guardar em um novo mapa `contratoClientePorId: Record<contrato_id, cliente_id>`.
- Construir os `inputs` de cálculo a partir dos **lançamentos** da competência, e não de todos os módulos ativos:
  - Iterar sobre `Object.values(lancamentos)`.
  - Para cada lançamento, achar o `modulo` correspondente (continua precisando para `identificador`, `area_m2`, flag de área comum).
  - Se um módulo não tem lançamento na competência, ele **não entra** na fatura nem no rateio.
- Ao chamar `agruparPorCliente`, sobrescrever o `cliente_id` do módulo pelo cliente do contrato vigente (`contratoClientePorId[contratoIdPorModulo[m.id]]`). Se não houver contrato vigente, o módulo cai em `VAGO:`.
- Atualizar o filtro do detalhe (`linhas={memoriaLinhas.filter(...)}`) para usar o mesmo `cliente_id efetivo` (do contrato), não `m.cliente_id`.
- `contratosPorCliente` continua igual (já opera sobre as chaves `cliente::contrato` retornadas).

### 2. Sem mudanças em

- `src/lib/energia-rateio.ts` (engine de cálculo e `agruparPorCliente` continuam idênticas — só recebem entradas corretas).
- Demais abas (Memória, Copel, Contratos, etc.).
- Schema do banco.

## Efeito esperado

- A barra lateral lista exatamente os clientes/contratos que tiveram lançamento naquele mês.
- Competências antigas mostram o cliente que era titular do contrato **na época**, mesmo que o módulo hoje pertença a outro cliente.
- Módulos sem lançamento somem da fatura, e não entram como zerados.
