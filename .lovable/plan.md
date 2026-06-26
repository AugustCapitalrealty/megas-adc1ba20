## Problemas identificados

1. **KPIs não batem com a fatura exibida.** O card "Total faturado" soma `total_fatura_energy` (vem da memória, calculada por **módulo**, usando demanda contratada do módulo). Já a Fatura Oficial por cliente recalcula Demanda USD / Isenta ICMS / Ultrapassagem usando a **demanda contratada do contrato (por cliente)**. Resultado: o que aparece no card ≠ soma do que cada cliente realmente paga. Hoje há diferença real de ~R$ 114 mil que o usuário vê como "irreal".

2. **Diferença Copel × Faturado sem explicação.** O card "Diferença" mostra o número mas não diz o que é "esperado" (ultrapassagem) vs. "erro" (perdas mal rateadas, demanda divergente, bandeira, etc.).

3. **PIS/COFINS errado em alguns clientes.** Em `FaturaOficial`, o componente recalcula `rsDemandaUsd` a partir da demanda do contrato, mas reaproveita `piscof_demanda` somado das linhas da memória (que usaram a demanda **por módulo**). Quando contrato ≠ Σ módulos, o PIS/COFINS da demanda fica inflado/desalinhado. O mesmo vale para ICMS da demanda.

4. **Falta detalhamento na linha de impostos.** O usuário pediu, abaixo do bloco de impostos, uma linha resumo mostrando: **Imposto de consumo**, **Imposto da demanda usada**, e **Demanda isenta de ICMS (não deduzida)** — sem usar a palavra "perdas" no nome (cliente não vê).

## Mudanças

### 1) `src/components/admin/energia/FaturasTab.tsx` — KPIs coerentes com a fatura

Substituir o `total_fatura_energy` (vindo de `agruparPorCliente`) por um total **recalculado por cliente** usando a mesma lógica do `FaturaOficial` (demanda do contrato, ultrapassagem 2×, demanda isenta, perdas embutidas, sem somar PIS/COFINS/ICMS no total).

- Extrair a função de cálculo do total da Fatura Oficial para um helper puro `calcularTotalFaturaCliente(f, tarifas, linhas, demandaContrato)` no mesmo arquivo (ou em `src/lib/energia-rateio.ts`).
- Para cada `FaturaCliente`, calcular `totalCorrigido` usando esse helper e a `demandaContrato` correspondente.
- Cards passam a usar `Σ totalCorrigido`. Sidebar passa a mostrar `totalCorrigido` em vez de `f.total_fatura_energy` (o que já elimina o "valor irreal" no menu lateral).
- O card "Diferença" passa a ter um subtítulo curto: "Esperado: ultrapassagem (R$ X). Resto: revisar."

### 2) Novo card/seção "Diferenças Copel × Faturado"

Logo abaixo dos KPIs, adicionar um bloco colapsável **Diferenças desta competência** com uma tabelinha:

```text
Item                                   Valor
─────────────────────────────────────────────
Total Fatura Copel                     R$ ...
Σ Faturas dos clientes (esta tela)     R$ ...
─────────────────────────────────────────────
Diferença bruta                        R$ ...
  (−) Ultrapassagem faturada           R$ ...   ← esperado
  (−) Crédito/Débito repassado         R$ ...   ← esperado
─────────────────────────────────────────────
Diferença residual (deve ser ~R$ 0)    R$ ...
```

Texto curto explicando: "A diferença saudável vem apenas de ultrapassagem (multa) e do crédito/débito da Copel repassado. Se o residual for relevante, revisar Fatura Copel, lançamentos ou demanda contratada."

### 3) `FaturaOficial` — corrigir PIS/COFINS e ICMS da demanda

Hoje:
```ts
piscofDemandaSum = sum('piscof_demanda') + sum('piscof_demanda_isenta')   // ← módulo
icmsDemandaSum   = sum('icms_demanda')                                     // ← módulo
```

Passar a calcular a partir dos valores recomputados por cliente:
```ts
piscofDemandaUsd    = rsDemandaUsd     * (1 - icms_pct) * piscofPct
piscofDemandaIsenta = rsDemandaIsenta  * piscofPct        // sem ICMS para deduzir
icmsDemandaCalc     = rsDemandaUsd     * icms_pct         // isenta NÃO entra
```
e usar esses valores no `piscofExibido`, `icmsExibido` e nos rationales (popover do `Info`). Isso garante que o detalhamento bate com o total e que cada linha do popover é o valor real, não o do módulo.

### 4) Linha "Detalhamento dos tributos" abaixo do bloco de Impostos

Adicionar um rodapé compacto (4 colunas), antes do badge de módulos:

```text
Imposto de consumo          R$ ...   ← PIS/COFINS + ICMS do consumo (sem dizer "perdas")
Imposto da demanda usada    R$ ...   ← PIS/COFINS + ICMS da Demanda USD faturada
Demanda isenta de ICMS      R$ ...   ← PIS/COFINS da isenta — ICMS não foi deduzido
```

Cada item com texto explicativo discreto ("já embutido nas tarifas Copel, informativo").

### 5) `RateioEnergiaTab` / nova subaba "Diferenças" (opcional, se a seção do passo 2 ficar grande)

Se o bloco do passo 2 crescer, mover para uma subaba dedicada "Diferenças" dentro de `RateioEnergiaTab`, com a mesma tabela e uma quebra por cliente (Σ faturado por cliente × parcela esperada da Copel, mostrando os outliers). Decidir após implementar o passo 2; **MVP fica na própria tela de Faturas**.

### Sem mudanças

- Engine `calcularMemoria` em `src/lib/energia-rateio.ts` permanece igual (memória de cálculo continua por módulo — é a auditoria interna).
- Banco / migrations: **nenhuma**.
- Modo `planilha (combinado)` vs `exato (por posto)` continua afetando só perdas; KPIs passam a refletir o modo selecionado automaticamente porque são recalculados a partir das linhas atuais.

## Validação esperada

- Card "Total faturado" = Σ dos totais das Faturas Oficiais (bate ao centavo, alternando entre Exato/Planilha).
- Card "Diferença" + tabela: residual ≈ R$ 0 após descontar ultrapassagem + crédito/débito.
- Popover PIS/COFINS e ICMS: cada linha (Consumo / Demanda USD / Demanda Isenta) soma exatamente o total exibido.
- Rodapé de tributos: 3 valores que somam PIS/COFINS + ICMS exibidos no bloco de Impostos.
