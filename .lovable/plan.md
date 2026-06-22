## Faturas por Contrato (não por cliente)

Hoje a aba **Faturas** agrupa tudo por `cliente_id`: se um cliente tem 2 contratos vinculados a módulos diferentes, ele aparece como **uma única fatura**, somando demandas/consumos dos dois contratos. Precisa virar **uma fatura por contrato**.

### Mudanças

**1. `src/lib/energia-rateio.ts` — `agruparPorCliente`**
- Renomear (internamente) a chave de agrupamento para combinar `cliente_id + contrato_id`.
- Aceitar `contrato_id` e `contrato_numero` em cada módulo passado.
- Nova `cliente_key` = `${cliente_id}::${contrato_id}` (ou `VAGO:${modulo_id}` / `AREA_COMUM` como hoje).
- Adicionar campos no `FaturaCliente`: `contrato_id`, `contrato_numero`.
- `cliente_nome` mantém o nome do cliente; UI exibe nº do contrato como subtítulo/badge.

**2. `src/components/admin/energia/FaturasTab.tsx`**
- Passar `contrato_id` e `contrato_numero` para `agruparPorCliente` (já temos `contratoIdPorModulo`; buscar `numero_contrato` junto com a vigência em `fetchCompData`).
- Sidebar: cada item mostra `Cliente — Contrato Nº X` (quando houver mais de 1 contrato do mesmo cliente). Quando só há 1 contrato, mostra só o nome (sem ruído visual).
- Filtragem do detalhe (`linhas` e `modIds`) passa a casar por **contrato** além de cliente: `m.cliente_id === cli && contratoIdPorModulo[m.id] === contrato`.
- `demandaContrato`: apenas a demanda do contrato daquela fatura (não soma de contratos únicos).
- Busca por nome continua funcionando; ordenação igual (Área Comum por último, resto por total desc).

**3. Export CSV / cópia de resumo**
- Adicionar coluna `Contrato` no CSV.
- Incluir `Contrato Nº` na primeira linha do resumo copiado.

### Não muda
- Cálculo da memória (`calcularMemoria`) — continua por módulo.
- Schema do banco.
- KPIs do topo (totais globais).
- Outras abas (Memória, Copel, Contratos, etc.).
