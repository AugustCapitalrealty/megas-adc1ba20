
## Diagnóstico — 3 problemas encontrados

### Problema 1 — `GarantiaFiltros.tsx` linha 17: tipo `Empreendimento` inclui `'todos'`
O tipo `Empreendimento = 'mega_curitiba' | 'mega_itajai' | 'mega_esteio' | 'todos'` mas o array hardcoded só tem 3 valores — isso é correto. Porém o `EMPREENDIMENTO_LABELS` é `Record<Empreendimento, string>` que inclui a chave `'todos'`, então o acesso `EMPREENDIMENTO_LABELS[g.empreendimento]` no `GarantiaCard.tsx` pode retornar `'Rateio entre Megas'` para empreendimentos com valor `'todos'` — aceitável, não é bug.

### Problema 2 — `GarantiaCard.tsx` linha 9: `import { format } from 'date-fns'` duplicado com `date-utils.ts`
O projeto tem `src/lib/date-utils.ts` com `formatBR` que usa timezone de Brasília. O `GarantiaCard` e `GarantiaFiltros` usam `format` direto do `date-fns` sem timezone. Isso pode causar datas "erradas" em UTC (ex: 31/12 vira 01/01). Deve usar `formatBR` de `@/lib/date-utils`.

### Problema 3 — `GarantiaFiltros.tsx` linha 49: `colWidths` pode quebrar se `rows` está vazio
```ts
const colWidths = Object.keys(rows[0] || {}).map(...)
```
Se `garantias.length === 0` o botão está desabilitado, então esse código nunca roda com array vazio. **Não é bug** — mas o `|| {}` resolve preventivamente.

### Problema 4 — `useGarantiasVigentes.ts` linha 144: dependency array do `useEffect` incompleto
```ts
useEffect(() => {
  if (loadingEmp) return;
  fetchGarantias();
}, [loadingEmp, empreendimentos, hasAllAccess]);
```
`fetchGarantias` não está no dep array — é um bug de linting (eslint exhaustive-deps). A função é definida fora do `useEffect`, portanto sofre stale closure. Deve ser convertida para `useCallback` ou movida para dentro do `useEffect`.

### Problema 5 — `GarantiaCard.tsx` linha 40-42: `expirando_breve` usa `bg-warning/10` mas `warning` pode não existir no tema
O projeto usa `text-warning` e `bg-warning` em vários lugares — verificar se a cor `warning` está definida no `tailwind.config.ts`.

---

## O que precisa ser corrigido

### Fix 1 — `GarantiaCard.tsx` e `GarantiaFiltros.tsx`: usar `formatBR` de `date-utils`
Trocar `import { format } from 'date-fns'` + `import { ptBR }` pelo `import { formatBR } from '@/lib/date-utils'` e usar `formatBR(date, 'dd/MM/yyyy')` em ambos os arquivos.

### Fix 2 — `useGarantiasVigentes.ts`: corrigir dependency array
Mover a lógica de `fetchGarantias` para dentro do `useEffect` ou usar `useCallback` com deps corretas. A abordagem mais limpa: envolver `fetchGarantias` em `useCallback` com as dependências `[empreendimentos, hasAllAccess]`.

### Fix 3 — verificar `tailwind.config.ts` se `warning` está definido

---

## Verificação do tailwind.config.ts
Preciso ler antes de confirmar o fix 3.
