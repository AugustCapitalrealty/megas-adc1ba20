## Causa raiz

O engine de rateio (`src/lib/energia-rateio.ts`) lê os campos de tarifa em `energia_competencia_tarifas`:

- `demanda_usd`, `te_ponta`, `tusd_ponta`, `te_fora`, `tusd_fora`

A aba **Fatura Copel** está salvando apenas os campos espelho de auditoria (`copel_tarifa_*`) — os campos do engine continuam com valores antigos. Por isso a fatura do cliente mostra R$ 19,805217 / 1,549011 / 0,360668 mesmo depois de você atualizar a Copel.

## Correção

Em `src/components/admin/energia/FaturaCopelTab.tsx`, na função `save()`, gravar **também** os campos lidos pelo engine, com as tarifas unitárias pós-tributos da Copel da própria competência:

```ts
const mirror = {
  ...mirrorAtual,
  // Tarifas usadas pelo engine de rateio (cada competência tem as suas)
  demanda_usd: tarif('demanda_usd'),
  te_ponta:    tarif('te_ponta'),
  tusd_ponta:  tarif('usd_ponta'),
  te_fora:     tarif('te_fora'),
  tusd_fora:   tarif('usd_fora'),
};
```

Resultado: ao salvar a Fatura Copel da competência 2026-06, a fatura do cliente da mesma competência passa a recalcular usando as tarifas da Copel 2026-06 automaticamente — sem botão extra, sem etapa manual.

## Reprocessar competências já lançadas

Para as competências que já têm Fatura Copel preenchida mas continuam exibindo as tarifas antigas (ex.: 2026-06), rodar um `UPDATE` único copiando `copel_tarifa_*` → campos do engine:

```sql
UPDATE public.energia_competencia_tarifas
   SET demanda_usd = COALESCE(copel_tarifa_demanda_usd, demanda_usd),
       te_ponta    = COALESCE(copel_tarifa_te_ponta,    te_ponta),
       tusd_ponta  = COALESCE(copel_tarifa_tusd_ponta,  tusd_ponta),
       te_fora     = COALESCE(copel_tarifa_te_fora,     te_fora),
       tusd_fora   = COALESCE(copel_tarifa_tusd_fora,   tusd_fora)
 WHERE copel_tarifa_demanda_usd IS NOT NULL
    OR copel_tarifa_te_ponta    IS NOT NULL;
```

## Arquivos alterados

- `src/components/admin/energia/FaturaCopelTab.tsx` — adicionar 5 campos no `mirror` do `save()`.
- Um data-fix SQL para sincronizar competências já lançadas.

Sem migração de schema. Sem alteração em `energia-rateio.ts`.