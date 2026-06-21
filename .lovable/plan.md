## Objetivo

Refazer o painel de detalhe da aba **Faturas por Cliente** para replicar exatamente o layout da planilha oficial "FATURA DE ENERGIA — Mega Centro Logístico" (PDF enviado). Isso garante que os números batam linha a linha com o documento que o cliente recebe hoje.

## Modelo de fatura (PDF anexado)

```
Cliente: MERCADO LIVRE        Módulos: 48 ao 53
Concessionária: COPEL-DIS
Modalidade Tarifária: A4 Verde
Período: 28/02/2026 → 31/03/2026

                       MEDIDO    CONTRATADO  FATURADO   TARIFA       VALORES (R$)
DEMANDA (kW)
  Demanda USD           70,44     120,00      70,44     27,603090     1.944,36
  Demanda USD Isenta    49,56                  49,56     0,000000         0,00
  Ultrapassagem                                 0,00    55,206180         0,00
CONSUMO (kWh)
  Ponta              2.820,48                2.820,48    2,158900     6.089,13
  Fora Ponta        32.567,17               32.567,17    0,502674    16.370,67
  Bandeira Verde                                                          0,00

RESUMO
  Consumo Total (kWh)  35.387,65
  Total Fornecimento (R$)                                            24.404,16

IMPOSTOS / TRIBUTOS         Base         %         Valor
  PIS/COFINS            19.767,37      7,06%     1.395,58
  ICMS                  24.404,16     19,00%     4.636,79
  Iluminação Pública                                  8,06
  Crédito                                             0,00
  Bandeira Tarifária                                  0,00
  TOTAL DA FATURA                                24.412,22
```

## Mudanças

### 1. `FaturasTab.tsx` — substituir `FaturaDetalhe`

Trocar o card atual ("Composição da fatura" + KPIs genéricos) por um componente `FaturaOficial` que reproduz o layout acima:

- **Cabeçalho** com Cliente, Módulos (faixa "48 ao 53" quando contíguos, senão lista), Concessionária ("COPEL-DIS"), Modalidade Tarifária (do contrato/parâmetros), Período (1º dia da competência até último dia, formato dd/MM/yyyy).
- **Tabela Demanda** com 5 colunas (Medido / Contratado / Faturado / Tarifa / Valor).
- **Tabela Consumo** com mesmas colunas, incluindo linha "Bandeira" com a cor vigente.
- **Resumo**: Consumo Total (kWh) e Total Fornecimento (R$ = Demanda + Consumo + Perdas, antes de tributos).
- **Tributos**: PIS/COFINS, ICMS, Iluminação Pública, Crédito, Bandeira, **TOTAL DA FATURA** em destaque.
- Estilo visual: borda dupla, cabeçalhos em `bg-muted`, total final em `bg-primary/10` com fonte maior; tabular-nums; uso da identidade Mega (laranja `#E87722` como destaque do total).

### 2. Mapeamento dos campos (sem mudar `energia-rateio.ts`)

Tudo já existe em `FaturaCliente` / `MemoriaLinha` (ver `src/lib/energia-rateio.ts`):

- Medido Demanda → `f.demanda_usd_medida` (somar `demanda_usd_medida_kw` por módulo)
- Contratado → soma de `contratoPorModulo[m.id].demanda_contratada_kw`
- Faturado Demanda → `f.demanda_usd`
- Demanda isenta ICMS → derivada (parte do faturado sem ICMS — já existe em `MemoriaLinha`); se não houver campo, exibir 0
- Tarifa Demanda → `tarifas.tarifa_demanda_usd`
- Consumo Ponta/Fora → `f.consumo_ponta` / `f.consumo_fora`, tarifas vindas de `tarifas.tarifa_consumo_ponta` / `tarifa_consumo_fora`
- Bandeira → `tarifas.bandeira_cor` + `f.bandeira_total`
- Tributos → `f.piscof_total`, `f.icms_total`, `f.iluminacao_publica`, `f.cred_deb_rateado`
- TOTAL → `f.total_fatura_energy`

Para campos que ainda não existem expostos por módulo (medido, isento ICMS), agregar somando os lançamentos selecionados (`lancamentos[m.id]`) dentro do `FaturasTab` antes de passar à `FaturaOficial`. Nenhuma mudança no engine de cálculo.

### 3. Ações

Manter "Copiar resumo" e "Exportar CSV" como estão. Adicionar botão **Imprimir / PDF** (usa `window.print()` com classe `print:block` aplicada apenas no card de fatura — sem libs novas).

### 4. Sidebar e KPIs

Mantidos como hoje (a lista de clientes à esquerda e os 4 KPIs no topo continuam úteis para auditoria). Nenhuma alteração em `RateioEnergiaTab.tsx`, `MemoriaCalculoTab.tsx`, `FaturaCopelTab.tsx` ou no engine.

## Arquivos

- **Editar**: `src/components/admin/energia/FaturasTab.tsx` (substituir `FaturaDetalhe` + helpers `Row`/`MiniKpi` pelo novo `FaturaOficial`).

Sem migrações, sem mudanças de schema, sem novas dependências.
