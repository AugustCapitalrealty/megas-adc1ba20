## Objetivo

1. Atrelar módulos ↔ clientes conforme o CSV (1 módulo = 1 cliente, com unicidade garantida no banco).
2. Melhorar o seletor de cliente nos módulos (combobox pesquisável em vez do Select atual).

---

## 1. Dados — vincular módulos aos clientes

**Clientes a criar** (placeholders, sem CNPJ):
- HP TRADE
- SODEXO

**Módulos a criar** (área = 0, herdam próxima `ordem`):
- `2007` (NTN-SNR)
- `71` (SHOPEE)
- `Restaurante` (SODEXO)

**Vínculos a aplicar** (sobrescrevendo o que houver — inclui 46/47 hoje no MERCADOLIVRE):

| Cliente | Módulos |
|---|---|
| ROBERT BOSCH | 12,13,14,15,16,17,27,28,29,30 |
| BOTICARIO (BPB) | 31,32,33,34 |
| CALAMO | 18,19,20,21,22,23,35,36,37,38 |
| DAMASIO | 6 |
| DGI | 11 |
| HP TRADE (novo) | 8,9,10 |
| NTN ROLAMENTOS | 3,4,2007 |
| SHPX (SHOPEE) | 39A,39B,40,41,54,55,56,57,58,59,66,67,68,69,70,71 |
| SODEXO (novo) | Restaurante |
| SUZANO | 42,43,44,45,46,47 |
| TORNADO | 5 |
| VELOZ | 1,2 |

Demais módulos (7, 24, 25, 26, 48–53, 60–65, Área Comum etc.) ficam como estão.

## 2. Banco — garantir 1 cliente por módulo

Já é a regra (coluna `cliente_id` única por linha). A solicitação é só reforçar visualmente. Sem mudança de schema necessária — a tabela já é 1:N (cliente→módulos) e cada módulo só tem um `cliente_id`. Não vou adicionar constraint extra.

## 3. UI — melhorar a seleção de cliente do módulo

Em `src/components/admin/energia/EnergiaCadastrosTab.tsx`, trocar o `<Select>` da coluna **Cliente** por um **Combobox pesquisável** (Popover + Command, padrão shadcn já usado no projeto), com:

- Busca por nome/razão social/cidade.
- Opção "— Vago —" sempre no topo.
- Badge mostrando quantos módulos cada cliente já tem (ajuda a evitar confusão).
- Largura fixa e truncamento do nome longo.

Sem mudanças em outras telas.

## Execução

1. `supabase--insert` (uma migration de dados via INSERT/UPDATE): cria HP TRADE e SODEXO, cria módulos 2007/71/Restaurante, faz os UPDATEs de `cliente_id` nos módulos pelos `identificador`.
2. Editar `EnergiaCadastrosTab.tsx`: substituir o Select de cliente por um Combobox (Popover + Command).

## Validação

- Query final: contar módulos por cliente e comparar com o CSV.
- Abrir `/admin/energia` → aba Cadastros → conferir vínculos e usar a busca no novo combobox.
