## O que está errado (verificado no banco)

O card mostra **75 de 72 módulos** por dois motivos somados:

1. **Numerador inflado:** a competência 2026-06 tem 75 lançamentos, mas 3 deles são dos módulos **24, 25 e 26**, que estão marcados como inativos (sem cliente). Eles vieram de uma cópia anterior e continuam sendo contados.
2. **Denominador impreciso:** os 72 "ativos" incluem três unidades que não são módulos locáveis — **Área Comum**, **Restaurante** e **OBRA**. Ou seja, hoje o correto seria "69 módulos + 3 áreas especiais".

## O que será feito

### 1. Classificar as unidades no cadastro
Adicionar um campo de **tipo** em `energia_modulos`:
- `modulo` (padrão) — módulo locável, numerado
- `area_comum`
- `restaurante`
- `obra`
- `outro`

Na migração, já classificar automaticamente os registros existentes pelo nome (Área Comum, Restaurante, OBRA) e deixar o restante como `modulo`.

### 2. Ajustar o cadastro (aba Módulos)
- Seletor de tipo ao criar/editar uma unidade.
- Etiqueta visual do tipo na lista, com as áreas especiais agrupadas ao final.

### 3. Corrigir o contador do Painel
- Contar apenas lançamentos de unidades **ativas** (lançamentos órfãos de unidades inativas deixam de entrar no total e nunca mais podem passar do máximo).
- Quebrar o texto em duas linhas:
  - `69 de 69 módulos`
  - `3 de 3 áreas especiais (Área Comum, Restaurante, Obra)`
- O item do checklist "Lançamentos de todos os módulos" passa a considerar as duas contagens; só fica concluído quando ambas estiverem completas.
- Alerta discreto quando existirem lançamentos de unidades inativas na competência, com a opção de removê-los.

### 4. Aba de Lançamentos
- Agrupar a grade em duas seções: **Módulos** e **Áreas especiais**, cada uma com seu próprio contador de preenchimento.
- Lançamentos de unidades inativas aparecem em uma seção "Fora do cadastro atual", sinalizados, para o usuário decidir excluir.

## Detalhes técnicos

- Migração: `ALTER TABLE public.energia_modulos ADD COLUMN tipo text NOT NULL DEFAULT 'modulo'` + `CHECK` com os valores permitidos + `UPDATE` classificando Área Comum / Restaurante / OBRA. Sem novas tabelas, portanto sem novos GRANTs.
- `EnergiaPainelTab.tsx`: `loadStatus` passa a buscar `id, tipo` de `energia_modulos` (apenas ativos) e a interseccionar os `modulo_id` dos lançamentos com esse conjunto, gerando `{ modulos: x/y, especiais: a/b, orfaos: n }`.
- `ModulosTab` (cadastro) e a grade de lançamentos recebem o campo `tipo` no formulário e no agrupamento.
- O motor de rateio (`src/lib/energia-rateio.ts`) **não muda** — o tipo é apenas classificação/visualização; a lógica de área comum continua como está hoje.
