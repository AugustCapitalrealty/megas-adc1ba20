## Objetivo

1. **Cadastrar os módulos do Mega Curitiba** (módulos 1–70, com o 39 dividido em **39A** e **39B**, mais **"Área Comum"**) → 72 registros no total.
2. **Refazer o layout da "Matriz por Módulo"** para caber na tela sem scroll horizontal.

---

## 1. Seed dos módulos

Limpar os módulos existentes (hoje só há o "30" de teste) e inserir via migration:

- Ordem 1 → identificador `1`
- Ordem 2 → `2`
- … até ordem 38 → `38`
- Ordem 39 → `39A`
- Ordem 40 → `39B`
- Ordem 41 → `40` … até ordem 71 → `70`
- Ordem 72 → `Área Comum`

Todos com `area_m2 = 0`, `ativo = true`, `cliente_id = NULL` (Vago) e `demanda_contratada_kw = 0`. A área de cada módulo será preenchida depois na aba **Cadastros** pelo admin (campo já existente, editável inline).

Aviso: a tabela `energia_contrato_modulos` referencia `energia_modulos`; vamos validar que está vazia antes de truncar. Se houver vínculos, faremos `DELETE` somente do módulo "30" e `INSERT` dos demais sem colidir.

---

## 2. Redesenho da Matriz por Módulo

Hoje a matriz tem **23 colunas** numa única tabela com `overflow-x-auto` — impossível caber em 1338 px. Proposta:

### a) Agrupar colunas em "visões" com tabs internas

A linha do módulo (com `Módulo`, `Cliente`, `Área`, `Total Energy`, `Total Copel`, `OK`) fica **fixa** em todas as visões. As demais colunas viram 4 grupos selecionáveis por um `Tabs` no topo da matriz:

| Visão           | Colunas exibidas                                                                 |
| --------------- | -------------------------------------------------------------------------------- |
| **Demanda**     | Dem. Contr. · Dem. USD ✏️ · Ultrap. · R$ Demanda                                  |
| **Consumo**     | Cons. Ponta ✏️ · Cons. Fora ✏️ · Cons. Total · R$ Consumo · Perdas kWh · R$ Perdas |
| **Tributos/Encargos** | ICMS · PIS/COFINS · Ilum. Pública · Bandeira · Créd/Déb · Fotovolt.         |
| **Ajustes**     | Ajuste ✏️                                                                         |

Colunas fixas (sempre visíveis): **Módulo · Cliente · Área · TOTAL Energy · TOTAL Copel · OK**.

Com isso cada visão tem no máximo ~11 colunas → cabe confortavelmente em 1338 px sem scroll horizontal.

### b) Compactação visual

- Reduzir `px-2` → `px-1.5`, padding vertical em linhas para `py-0.5`.
- Inputs editáveis com `w-20` (em vez de `w-24`) e `h-6`.
- `Cliente`: truncar com `max-w-[160px] truncate` + tooltip no hover.
- Cabeçalhos com `whitespace-nowrap` e `text-[11px]`.
- Linha de **TOTAL** continua sticky no fim, agora respeitando a visão selecionada.
- Manter a coluna **Módulo** sticky à esquerda.

### c) Visão "Completa" opcional

Adicionar uma 5ª aba **"Completa"** que mantém o comportamento atual (todas as colunas + scroll horizontal) para quem quiser ver tudo de uma vez ou exportar.

---

## Arquivos afetados

- **Novo:** `supabase/migrations/<timestamp>_seed_modulos_mega_curitiba.sql` — limpa e insere os 72 módulos.
- **Editado:** `src/components/admin/energia/MemoriaCalculoTab.tsx` — refatorar o bloco "Matriz por Módulo" (linhas 617–743) introduzindo `Tabs` com as 4 visões + "Completa", colunas fixas e compactação visual.

Nenhuma alteração no engine de cálculo (`src/lib/energia-rateio.ts`) ou nas demais abas.
