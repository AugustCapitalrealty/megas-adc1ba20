## Objetivo

Criar automaticamente um contrato em `energia_contratos` para cada cliente da planilha, já com os módulos correspondentes vinculados em `energia_contrato_modulos` — para aparecerem na tela **Contratos de Energia** como na referência.

## Placeholders (campos obrigatórios não informados)

- `numero_contrato` = `"A definir - <NOME CURTO>"` (ex.: `A definir - BOSCH`)
- `demanda_contratada_kw` = `0` (editar depois)
- `vigencia_inicio` = `CURRENT_DATE`
- `vigencia_fim` = `NULL` (vigente)
- `ativo` = `true`

Os mesmos valores são usados em `energia_contrato_modulos.vigencia_inicio`.

## Contratos a criar

| Cliente | Módulos |
|---|---|
| ROBERT BOSCH | 12,13,14,15,16,17,27,28,29,30 |
| BOTICARIO | 31,32,33,34 |
| CALAMO | 18,19,20,21,22,23,35,36,37,38 |
| DAMASIO | 6 |
| DGI | 11 |
| HP TRADE | 8,9,10 |
| NTN ROLAMENTOS | 3,4,2007 |
| SHPX (SHOPEE) | 39A,39B,40,41,54,55,56,57,58,59,66,67,68,69,70,71 |
| SODEXO | Restaurante |
| SUZANO | 42,43,44,45,46,47 |
| TORNADO | 5 |
| VELOZ | 1,2 |

Nenhum desses módulos conflita com contratos já existentes (MERCADOLIVRE usa 48–53 e 60,62,63).

## Execução

Uma única chamada `supabase--insert` que:
1. Insere os 12 contratos em `energia_contratos` (placeholder).
2. Insere os links em `energia_contrato_modulos` via JOIN entre `energia_clientes` (por razão social) e `energia_modulos` (por `identificador`).

## Validação

Query final: `SELECT cliente, count(modulos)` para confirmar 12 novos contratos com a quantidade certa de módulos cada.
