## Problema
A base do PIS/COFINS está usando a mesma base do ICMS (soma bruta dos itens tributáveis). Conforme a fatura Copel, **PIS/COFINS incidem sobre a base já líquida do ICMS** ("cálculo por dentro"):

```
baseICMS      = Σ valor dos itens tributáveis        (ex.: 304.452,60)
valorICMS     = baseICMS × alíquotaICMS              (ex.: 304.452,60 × 19% = 57.845,99)
basePisCofins = baseICMS − valorICMS                 (ex.: 304.452,60 − 57.845,99 = 246.606,61)
valorCOFINS   = basePisCofins × alíquotaCOFINS       (ex.: 246.606,61 × 5,80% = 14.303,18)
valorPIS      = basePisCofins × alíquotaPIS          (ex.: 246.606,61 × 1,65% = 4.069,01)
```

## Correção
Trocar o `useEffect` de "Auto-tributos" em dois lugares para usar duas bases:

- **`src/components/admin/energia/FaturaCopelTab.tsx`** (linhas ~126-140)
- **`src/components/admin/energia/MemoriaCalculoTab.tsx`** (linhas ~430-446)

```ts
const baseIcms = ...soma dos itens com hasPisCofins;
const valorIcms = baseIcms * (aliquotas.icms / 100);
const basePisCofins = baseIcms - valorIcms;
icms   = { base: baseIcms,       aliquota: icms_pct,   valor: valorIcms }
cofins = { base: basePisCofins,  aliquota: cofins_pct, valor: basePisCofins * cofins_pct/100 }
pis    = { base: basePisCofins,  aliquota: pis_pct,    valor: basePisCofins * pis_pct/100 }
```

A engine (`energia-rateio.ts`) já está correta — usa `(W − W*icms_pct) * piscof`. Nada muda lá.

## Fora do escopo
- Não vou alterar a alíquota do PIS (a imagem mostra 1,26% mas o cadastro tem 1,65%; o usuário não pediu mudar).
- Sem mudanças na engine, FaturasTab ou DB.
