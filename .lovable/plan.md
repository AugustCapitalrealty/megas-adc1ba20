## Problema

A importação da planilha do Fluig está falhando com erros como:
`duplicate key value violates unique constraint "fluig_painel_snapshot_solicitacao_fluig_key"`

### Causa raiz

Em `src/hooks/useFluigDashboard.ts` (linhas ~165–169), antes de processar cada linha o código faz um `SELECT` único em `fluig_painel_snapshot` para montar o mapa de registros existentes:

```ts
const { data: existing } = await supabase
  .from('fluig_painel_snapshot')
  .select('id, solicitacao_fluig, ...');
const existingMap = new Map((existing || []).map(e => [e.solicitacao_fluig, e]));
```

O PostgREST tem **limite default de 1000 linhas por query**, e a tabela já tem **1136 registros**. As ~136 linhas além do limite ficam de fora do `existingMap`, então o código segue pelo ramo `.insert(snapshotData)` (linha ~419) ao invés do `.update(...)` — e bate na unique constraint de `solicitacao_fluig`.

## Correção

Trocar o `SELECT` por uma busca paginada que percorre toda a tabela em blocos de 1000, garantindo que o `existingMap` contenha todos os registros:

```ts
const existingAll: Array<{ id: string; solicitacao_fluig: string; ... }> = [];
const PAGE = 1000;
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from('fluig_painel_snapshot')
    .select('id, solicitacao_fluig, situacao, localizacao, responsavel_atual, gerencia_conclusao, gerencia_facilities_conclusao, gerencia_financeiro_conclusao, diretoria_conclusao')
    .range(from, from + PAGE - 1);
  if (error) throw error;
  if (!data || data.length === 0) break;
  existingAll.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}
const existingMap = new Map(existingAll.map(e => [e.solicitacao_fluig, e]));
```

Mesmo tratamento para os dois outros `SELECT` da mesma função que podem estourar o limite:
- `solicitacoes` com `numero_chamado_fluig not null` (linhas ~172–175) → usado para o `linkMap`
- `solicitacoes` lista de `id` válidos (linhas ~180–183) → usado para `validIds`

### Salvaguarda extra

Como reforço (caso surja um caso de corrida em que o registro foi criado entre a leitura e a escrita), trocar o `.insert(snapshotData)` final (linha ~419) por `.upsert(snapshotData, { onConflict: 'solicitacao_fluig' })`. Isso elimina o erro de duplicate key sem mudar o comportamento esperado.

## Arquivos afetados

- `src/hooks/useFluigDashboard.ts` — paginar os três SELECTs e trocar `insert` por `upsert` no fallback.

## Fora de escopo

- Mudanças no parser da planilha, no UI do `FluigImport`, ou no schema do banco.
- Performance geral da importação (continua linha-a-linha como hoje).
