## Problema

Hoje o rateio de perdas usa **um único ratio combinado**:

```
ratio = (consumo_ponta + consumo_fora do cliente) / (consumo_ponta + consumo_fora de todos)
perdas_fora_kwh_cliente = ratio × perdas_fora_total_kwh
perdas_ponta_kwh_cliente = ratio × perdas_ponta_total_kwh
```

Isso distorce o resultado quando o perfil de consumo (proporção ponta/fora) varia entre clientes. O correto é ratear **separadamente por posto tarifário**, como na sua fórmula:

```
perdas_fora_kwh_cliente = (consumo_fora_cliente / consumo_fora_total) × perdas_fora_total_kwh
perdas_ponta_kwh_cliente = (consumo_ponta_cliente / consumo_ponta_total) × perdas_ponta_total_kwh
```

## Mudanças

### 1. Engine de cálculo — `src/lib/energia-rateio.ts`

Em `calcularMemoria`:

- Trocar o agregado `consumoTotalGeral` por dois denominadores:
  - `consumoPontaTotal = Σ consumo_ponta_kwh`
  - `consumoForaTotal  = Σ consumo_fora_kwh`
- Calcular ratios separados por linha:
  - `ratioPonta = Q / consumoPontaTotal` (Q = consumo_ponta da linha)
  - `ratioFora  = T / consumoForaTotal`  (T = consumo_fora da linha)
- Aplicar:
  - `AH = ratioPonta × perdasPontaTotal`  (kWh perdas ponta)
  - `AI = ratioFora  × perdasForaTotal`   (kWh perdas fora)
- O restante (`AL..AP`, `AR`, `AT`, bandeira `BM/BN`) já consome `AH/AI` e continua funcionando.

### 2. Outros rateios na mesma função

Avaliar se devem migrar para a mesma lógica separada ou continuar usando consumo total combinado:

- `BK` (iluminação pública) — hoje rateado por `U/consumoTotalGeral`. **Manter combinado** (é um valor único da fatura, sem posto tarifário).
- `BS` (créditos/débitos da fatura) — idem, **manter combinado**.

Para preservar isso, manter `consumoTotalGeral` em paralelo aos dois novos denominadores.

### 3. Proteção contra divisão por zero

Se `consumoPontaTotal = 0` (ex.: mês sem consumo ponta em nenhum cliente), `ratioPonta = 0` — as perdas ponta ficam sem rateio (corretamente, pois não há base). Mesmo para fora ponta.

### 4. Validação no caso BOTICARIO 33-34

Após a mudança, no contrato citado a perda fora ponta do cliente deve dar aproximadamente:

```
(10.668,43 / 377.462,69) × 15.754,11 kWh ≈ 445,27 kWh  ← agora baterá com sua conta
```

Hoje, com o ratio combinado, o valor difere porque o denominador inclui o consumo ponta de todos os clientes.

### 5. Auditoria visível ao admin

O bloco "🔍 Memória do cálculo de consumo" em `FaturasTab.tsx` (já existente, `print:hidden`) passa a refletir os novos valores automaticamente, pois lê os campos `perdas_ponta_kwh` / `perdas_fora_kwh` já recalculados. Adicionar **uma linha extra** mostrando explicitamente a fórmula do rateio por posto para facilitar conferência:

```
Rateio Fora Ponta: 10.668,43 / 377.462,69 = 2,8264% × 15.754,11 kWh = 445,27 kWh
```

## Impacto

- **Engine puro** (`energia-rateio.ts`) — mudança contida; sem alterações de schema.
- **Telas que consomem o resultado** (`MemoriaCalculoTab`, `FaturasTab`) — apenas mostram valores novos, sem mudança de código necessária além da linha extra de auditoria.
- **Sem migração de banco.**
- Totais por cliente mudarão ligeiramente em todas as competências recalculadas (clientes com perfil mais "fora ponta" assumirão mais perdas fora ponta, e vice-versa). O total geral da fatura permanece igual.
