## Ajustes em `FaturasTab.tsx`

### 1) Detalhamento dos tributos como sublinhas (não card separado)

Hoje o detalhamento ficou num card cinza abaixo do bloco. Vou remover esse card e transformar o conteúdo em **sublinhas indentadas dentro da própria tabela de Impostos**, posicionadas logo abaixo das linhas PIS/COFINS e ICMS — antes de Iluminação Pública, Crédito, Bandeira e TOTAL DA FATURA.

Estrutura final do bloco de impostos:

```text
PIS/COFINS                        base 9,25%   R$ 2.052,42
ICMS                              base 19,00%  R$ 5.190,90
  ↳ Imposto de consumo                          R$ ...     ← sublinha
  ↳ Imposto da demanda usada                    R$ ...     ← sublinha
  ↳ Demanda isenta de ICMS (não deduzido)       R$ ...     ← sublinha
Iluminação Pública                              R$ 9,44
Crédito                                         R$ 0,00
Bandeira Tarifária                              R$ 0,00
TOTAL DA FATURA                                 R$ 27.388,62
```

Cada sublinha:
- Recuo (`pl-8`), tipografia menor, texto mudo
- Mostra PIS/COFINS + ICMS componentes em legenda discreta (igual hoje, só que inline)
- Sem mexer em cálculo — usa as variáveis `piscofConsumo`, `icmsConsumo`, `piscofDemandaUsd`, `icmsDemandaCalc`, `piscofDemandaIsenta` que já existem

### 2) Botão Exato/Planilha sobe para a tela "Faturas por Cliente"

Hoje o toggle de `modoPerdas` (Exato vs Planilha combinado) está dentro de `FaturaOficial`, então só aparece depois que o usuário clica num cliente — e o KPI "Total faturado" fica ambíguo (não dá pra saber se foi calculado num modo ou no outro globalmente).

Mudança:
- Mover o toggle para o header de **Faturas por Cliente**, ao lado do "Exportar CSV"
- Compacto, com label "Modo de rateio de perdas": `[ Exato (por posto) ] [ Planilha (combinado) ]`
- O `FaturaOficial` continua recebendo `modoPerdas` por prop (sem o controle interno; remove o seletor lá pra evitar duplicação)
- Como `useMemo` da memória já depende de `modoPerdas`, KPIs, Diferenças e Fatura Oficial recalculam juntos — Total faturado passa a refletir o modo escolhido de forma explícita

### 3) Lista de clientes que pagaram multa (ultrapassagem)

No bloco **Diferenças Copel × Faturado**, abaixo da linha "(−) Ultrapassagem faturada", abrir uma sub-tabelinha colapsável "Ver clientes com multa" mostrando:

```text
Cliente                              Demanda contratada  Demanda medida  Ultrapassagem (kW)  Multa (R$)
─────────────────────────────────────────────────────────────────────────────────────────────────────
Cliente A — Contrato 123                  500                620                120          R$ ...
Cliente B — Contrato 456                  300                350                 50          R$ ...
─────────────────────────────────────────────────────────────────────────────────────────────────────
TOTAL                                                                            170          R$ totalUltrapassagem
```

Detalhes:
- Lista somente faturas com `rsUltrapassagem > 0`
- Ordenada por multa desc
- Demanda contratada vem de `contratoDemandaPorId`
- Demanda medida = `f.demanda_usd`
- Ultrapassagem kW = `max(0, medida − contratada)` por fatura
- Multa R$ = `totaisPorFatura.get(key).rsUltrapassagem`
- Total fecha com o `totalUltrapassagem` já exibido na linha pai
- Se nenhum cliente tem multa, esconde o "Ver clientes" e mostra "Nenhum cliente com ultrapassagem nesta competência"

## Fora de escopo

- Engine `calcularMemoria` em `src/lib/energia-rateio.ts` — sem mudanças
- Banco / migrations — nenhuma
- PDF / Print — mantém o layout atual (pode ser feito numa próxima rodada)
- `RateioEnergiaTab` — sem mudanças

## Validação esperada

- Bloco de impostos termina em "TOTAL DA FATURA" sem card extra abaixo; sublinhas indentadas logo após ICMS
- Trocar Exato ↔ Planilha no topo recalcula o KPI "Total faturado", "Diferença" e a Fatura Oficial selecionada
- "Ver clientes com multa" lista cada cliente com ultrapassagem > 0 e a soma bate com `totalUltrapassagem`
