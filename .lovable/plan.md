## Problema

No modo **Planilha (combinado)** o cálculo de perdas Fora Ponta está divergente porque a diferença Copel negativa não está sendo persistida.

Em `src/components/admin/energia/FaturaCopelTab.tsx` (linhas 414–415), ao salvar a fatura Copel:

```ts
perdas_copel_ponta_kwh: Math.max(0, difCopelPonta),
perdas_copel_fora_kwh:  Math.max(0, difCopelFora),
```

O `Math.max(0, …)` zera qualquer diferença Copel negativa. No caso da competência atual, `difCopelFora = -4.751,71` é gravado como `0`, e o engine soma apenas as perdas Energy (`-11.002,40`) — exatamente o sintoma descrito.

A UI exibe corretamente `difCopelFora = -4.751,71` (linha 785), mas o valor que vai pro banco é truncado.

## Correção

**Arquivo:** `src/components/admin/energia/FaturaCopelTab.tsx`

Remover o clamp e persistir o valor real (positivo ou negativo):

```ts
perdas_copel_ponta_kwh: difCopelPonta,
perdas_copel_fora_kwh:  difCopelFora,
```

O engine de rateio (`energia-rateio.ts`) já trata valores negativos corretamente em ambos os modos — ele apenas soma `copel + energy` em `perdasPontaTotal` / `perdasForaTotal`. Não precisa de mudança.

## Validação esperada após o fix

Para BOTICARIO módulo 33–34, modo **Planilha (combinado)**:

- `perdasForaTotal = -4.751,71 + -11.002,40 = -15.754,11`
- `ratio = 10.668,43 / 377.462,69 = 2,8263%`
- `AI = 2,8263% × -15.754,11 ≈ -445,27 kWh`
- Medido Fora Ponta ≈ `10.188,77 + (-445,27) = 9.743,50 kWh` ✅

E o modo **Exato (separado)** continua usando a mesma base corrigida (`perdasForaTotal = -15.754,11`), só muda o denominador do ratio.

## Passo extra

Após o deploy, o usuário precisa reabrir a aba **Fatura Copel** da competência atual e clicar em **Salvar** para regravar `perdas_copel_fora_kwh = -4.751,71` (o valor antigo `0` está persistido). A fatura do cliente passará a refletir o cálculo correto em ambos os modos.
