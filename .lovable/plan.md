## Plano de Ajustes — Rateio de Energia

### 1. PIS/COFINS por item na Fatura Copel (cálculo "por dentro")

**Problema:** Na aba *Fatura Copel*, as colunas "PIS/COFINS" e "Tarifa unit." de cada linha aplicam as alíquotas direto sobre o valor bruto. A Copel calcula PIS/COFINS sobre a base **líquida de ICMS** — por isso aparece 1.694,98 no sistema vs 1.372,93 na fatura real.

A tabela inferior "Tributos calculados" já está correta (usa `baseIcms - valorIcms`), mas as linhas individuais não.

**Correção em `FaturaCopelTab.tsx` (`updateItem`, linhas ~140-149):**

```text
pis_cofins = valor × (1 − icms_pct) × (pis_pct + cofins_pct)
tarifa_unit = preco_unit × (1 − icms_pct) × (1 − pis_pct − cofins_pct)
```

Recalcular `pis_cofins` e `tarifa_unit` de todas as linhas existentes quando as alíquotas/itens carregam (efeito de sincronização), para que faturas antigas reabertas exibam os números corretos sem precisar redigitar.

Resultado esperado para "ENERGIA ELÉTRICA TE PONTA" (Valor 24.008,18, ICMS 19%, PIS+COFINS 7,06%): `24.008,18 × 0,81 × 0,0706 ≈ 1.372,82` ✅

Sem mudanças no engine `energia-rateio.ts` (já está correto) nem na `FaturasTab`.

### 2. Travar competência selecionada entre as abas

**Problema:** Cada aba (`FaturaCopelTab`, `MemoriaCalculoTab`, `FaturasTab`) tem seu próprio `useState` de competência. Dá pra ficar editando Copel de 06/2026 e Lançamentos de 05/2026 sem perceber.

**Correção em `RateioEnergiaTab.tsx`:**
- Levantar `currentCompId` para o componente pai (já existe estado de aba ativa).
- Carregar lista de competências uma vez no pai e passar `competencias`, `currentCompId`, `setCurrentCompId` via props para as três abas que usam competência.
- Cada aba deixa de gerenciar o próprio estado e passa a refletir a seleção global. O seletor continua visível em cada aba (UX inalterada), mas mudar em uma muda em todas.

### 3. Saldo fotovoltaico em R$ além do kWh

**Problema:** Hoje o card de Fotovoltaico (`MemoriaCalculoTab`, linhas ~852-905) mostra saldo inicial, geração, consumido e saldo final apenas em kWh. Usuário quer ver também o equivalente em reais.

**Correção em `MemoriaCalculoTab.tsx` (card Fotovoltaico):**
- Para cada horário (Ponta / Fora), calcular o valor em R$ do saldo final usando a tarifa cheia da competência:
  - `tarifa_ponta_total = te_ponta + tusd_ponta` (já com tributos embutidos como a Copel cobra)
  - `tarifa_fora_total = te_fora + tusd_fora`
  - `saldo_final_rs = saldo_final_kwh × tarifa_total`
- Mesmo cálculo para geração e consumido, exibidos como linha secundária menor (cinza) abaixo do valor em kWh: `≈ R$ X,XX`.
- Adicionar uma linha de "Saldo total acumulado (R$)" no rodapé do card somando Ponta + Fora.
- Apenas exibição — não muda a persistência (`fotovoltaico_saldo_final_*_kwh` continua sendo o que carrega para o mês seguinte).

### Arquivos alterados

- `src/components/admin/energia/FaturaCopelTab.tsx` — recálculo PIS/COFINS por item + props de competência.
- `src/components/admin/energia/MemoriaCalculoTab.tsx` — props de competência + saldo fotovoltaico em R$.
- `src/components/admin/energia/FaturasTab.tsx` — props de competência.
- `src/components/admin/RateioEnergiaTab.tsx` — estado compartilhado de competência.

Sem migrations, sem mudanças em `energia-rateio.ts`.
