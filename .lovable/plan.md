## Diagnóstico

A correção anterior (remover `Math.max(0, …)`) está no código, mas o **banco ainda tem o valor antigo zerado** — confirmei via SQL:

```
perdas_copel_fora_kwh = 0           ← deveria ser -4.751,71
perdas_copel_ponta_kwh = 1102,02
perdas_energy_fora_kwh = -11.002,40
perdas_energy_ponta_kwh = 0
```

Por isso a fatura mostra apenas `-11.002,40` no rateio Fora Ponta. O usuário precisaria reabrir Fatura Copel e clicar Salvar — o que é frágil e vai acontecer de novo.

## Correção definitiva

Tornar as perdas Copel **derivadas em tempo de cálculo** em vez de persistidas, eliminando o problema na raiz.

### 1) `src/components/admin/energia/FaturasTab.tsx` (~linha 136)

Antes de chamar `calcularMemoria`, recomputar `perdas_copel_*_kwh` a partir do consumo medido pela Copel e da soma dos lançamentos da competência:

```ts
const somaPonta = inputs.reduce((s, i) => s + (i.consumo_ponta_kwh || 0), 0);
const somaFora  = inputs.reduce((s, i) => s + (i.consumo_fora_kwh  || 0), 0);
const copelPonta = Number((tarifas as any).copel_consumo_ponta_kwh) || 0;
const copelFora  = Number((tarifas as any).copel_consumo_fora_kwh)  || 0;
const tarifasComPerdas: EnergiaTarifas = {
  ...(tarifas as EnergiaTarifas),
  perdas_copel_ponta_kwh: copelPonta - somaPonta,
  perdas_copel_fora_kwh:  copelFora  - somaFora,
};
const memoria = calcularMemoria(tarifasComPerdas, inputs, modoPerdas);
```

Mesma alteração em `src/components/admin/energia/MemoriaCalculoTab.tsx` (linha 749) para manter consistência entre as abas.

### 2) Backfill imediato da competência atual

Rodar UPDATE para corrigir o valor já persistido:

```sql
UPDATE energia_competencia_tarifas t
SET perdas_copel_fora_kwh  = COALESCE(t.copel_consumo_fora_kwh, 0)
                           - COALESCE((SELECT SUM(l.consumo_fora_kwh)
                                       FROM energia_competencia_lancamentos l
                                       WHERE l.competencia_id = t.competencia_id), 0),
    perdas_copel_ponta_kwh = COALESCE(t.copel_consumo_ponta_kwh, 0)
                           - COALESCE((SELECT SUM(l.consumo_ponta_kwh)
                                       FROM energia_competencia_lancamentos l
                                       WHERE l.competencia_id = t.competencia_id), 0)
WHERE t.id = '80f1cac2-8abe-4ae8-b568-5304da6dec1f';
```

(Aplico só na competência ativa para não mexer em históricos antigos sem necessidade.)

### 3) `FaturaCopelTab.tsx` — manter o save sem clamp

Já foi corrigido na rodada anterior. Mantém a gravação como espelho/auditoria, mas a fatura passa a usar o valor derivado, então mesmo se o usuário esquecer de re-salvar, o cálculo fica certo.

## Validação esperada

Após o deploy, para BOTICARIO mod 33–34 em modo **Planilha (combinado)**:

- `perdasForaTotal = -4.751,71 + -11.002,40 = -15.754,11`
- `AI = (10.668,43 / 377.462,69) × -15.754,11 ≈ -445,27 kWh`
- **Medido Fora Ponta ≈ 9.743,50 kWh** ✅

E o texto de auditoria passa a exibir `× -15.754,11 kWh` em vez de `× -11.002,40 kWh`.
