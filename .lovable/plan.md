## Problema

Ao clicar em "Distribuir aos módulos" (Consumo por Contrato), o upsert em `energia_competencia_lancamentos` falha com:

> null value in column "id" violates not-null constraint

## Causa

Em `MemoriaCalculoTab.tsx` (linhas ~649–666), o array de rows é montado com:

```ts
...(existing?.id ? { id: existing.id } : {})
```

Algumas linhas incluem `id`, outras não. O PostgREST, ao serializar o upsert em lote, normaliza as colunas e envia `id: null` para as linhas sem id — o que viola NOT NULL, mesmo o default `gen_random_uuid()` existindo (default só se aplica quando a coluna é **omitida**, não quando vem null explícito).

## Correção

Em `src/components/admin/energia/MemoriaCalculoTab.tsx`, na função que distribui aos módulos (linha ~649):

- Remover o spread condicional do `id`. O upsert já usa `onConflict: 'competencia_id,modulo_id'`, então o banco resolve update vs insert sem precisar do `id`.
- Linhas novas pegam `id` do default; linhas existentes são atualizadas pelo conflict target.

Resultado: rows uniformes sem coluna `id`, eliminando o erro.

Nenhuma mudança de schema, nenhum outro arquivo afetado.