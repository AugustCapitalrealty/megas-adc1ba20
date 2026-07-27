## Objetivo

Permitir que um módulo troque de cliente no meio do mês (ex.: Veloz até 25/07, novo cliente a partir de 26/07) e que a fatura do mês seja dividida proporcionalmente aos dias de cada contrato.

## Situação atual (verificada no código)

- A tabela `energia_contrato_modulos` já guarda `vigencia_inicio` e `vigencia_fim` por módulo, e o formulário de contratos já permite editar essas datas.
- Porém, no cálculo (`FaturasTab.tsx`, linhas ~113-127) quando existe mais de uma vigência no mesmo mês o sistema **escolhe apenas a mais recente** e joga 100% do consumo para esse cliente. Nenhuma divisão por dias acontece hoje.
- O agrupamento por cliente (`agruparPorCliente` em `energia-rateio.ts`) trabalha com uma chave `cliente_id::contrato_id` por módulo — hoje um módulo só pode cair em um cliente.

## O que será construído

### 1. Resolver todas as vigências do mês (não só a última)
Para cada módulo, montar a lista de períodos que se sobrepõem à competência, recortados nos limites do mês:
- Veloz: 01/07 → 25/07 = 25 dias
- Novo cliente: 26/07 → 31/07 = 6 dias
- Dias sem nenhum contrato viram um período **Módulo Vago** (regra atual de módulo vago/área comum se aplica).

### 2. Dividir o lançamento por dias
O lançamento continua sendo **um só por módulo** (leitura mensal). Na hora do cálculo, ele é fatiado em N linhas virtuais:
- Consumo ponta, consumo fora ponta, demanda medida e ajuste manual são multiplicados por `dias do período ÷ dias do mês`.
- Demanda contratada usa a do contrato daquele período.
- Área (m²) não é fatiada — só é usada em rateio de área comum, e ali entra proporcional aos dias também, para não duplicar o m² do módulo.

### 3. Faturas separadas por cliente
Cada fatia vira uma linha na memória de cálculo com a chave do cliente/contrato do período, então a fatura sai naturalmente separada: Veloz recebe 25/31 e o novo cliente 6/31 do módulo.

### 4. Transparência na tela
- Na fatura do cliente, os módulos com período parcial aparecem como `Módulo 12 (01/07–25/07 · 25/31 dias)`.
- Bloco de auditoria mostra a equação `consumo do mês × dias ÷ dias do mês`.
- Na aba Lançamentos, o módulo com troca no mês ganha um aviso indicando os períodos e os clientes envolvidos.

### 5. Cadastro: o contrato passa a mandar
O campo cliente do cadastro de módulo deixa de ser a fonte de verdade e passa a ser apenas informativo (mostra o cliente vigente hoje, derivado do contrato). Onde ainda houver leitura direta de `energia_modulos.cliente_id` para faturamento, a leitura passa a ser pelo contrato vigente.

### 6. Validação no cadastro de contratos
Bloquear sobreposição de datas do mesmo módulo em contratos diferentes (já existe uma checagem no banco — será confirmada e a mensagem de erro melhorada na tela), e destacar visualmente na lista de contratos os módulos que terminam dentro da competência aberta.

## Detalhes técnicos

- `src/components/admin/energia/FaturasTab.tsx`: substituir o `cMap` (um contrato por módulo) por `periodosPorModulo: Record<moduloId, Periodo[]>` com `{ contrato_id, cliente_id, demanda_contratada_kw, inicio, fim, dias, fator }`.
- `src/lib/energia-rateio.ts`: `EnergiaLancamentoInput` ganha campos opcionais `periodo_label`, `fator_dias`, `contrato_id`, `cliente_id`; `agruparPorCliente` passa a aceitar múltiplas linhas do mesmo `modulo_id` com chaves de cliente distintas. As somas de consumo total e o rateio de perdas continuam corretos porque a soma das fatias é igual ao lançamento original.
- `MemoriaCalculoTab.tsx` e `EnergiaCadastrosTab.tsx`: usar a mesma função de resolução de períodos (extraída para `src/lib/energia-vigencias.ts`) em vez de cada tela repetir a lógica de "última vigência".
- Sem mudança de schema: `vigencia_inicio`/`vigencia_fim` já existem. Nenhuma migração de banco prevista.

## Fora de escopo

- Leitura real de medidor no dia da troca (fica pro-rata por dias, conforme escolhido).
- Recalcular competências já fechadas — o pro-rata vale para competências abertas.
