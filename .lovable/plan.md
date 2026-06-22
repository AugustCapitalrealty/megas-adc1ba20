## Diagnóstico

Na competência atual a seção "Valores R$" da Memória de Cálculo soma **R$ 24.404,17** (TE/TUSD Ponta + TE/TUSD Fora + Demanda + Ultrapassagem), mas o **TOTAL Fatura** mostra **R$ 24.914,63** — uma diferença de **R$ 510,46**.

Origem provável: nas últimas mudanças, o engine `calcularMemoria` (`src/lib/energia-rateio.ts`) passou a ler `preco_unit` da Fatura Copel (preço **bruto**, com tributos embutidos) em vez de `tarifa_unit` (líquido). Os valores `W, X, Z, AA, J` agora já contêm ICMS+PIS/COFINS, mas a função continua calculando:

```text
BA = (W+X+Z+AA+J) × icms_pct          -- ICMS sobre valores que já têm ICMS
BI = (W+X+Z+AA+J) líquidos × piscof  -- idem PIS/COFINS
BQ = AT + BK + BO                     -- soma valores + perdas + iluminação + bandeira
CA = BQ + créd/déb + ajuste − ultrapassagem
```

Os tributos calculados (BA, BI) **não entram diretamente em CA**, então não é dupla cobrança direta de ICMS. O delta de R$ 510 vem na verdade de:
- **Iluminação pública (BK)** — rateio proporcional do valor fixo da fatura Copel.
- **Bandeira (BO)** — `(consumo + perdas)/100 × bandeira_valor`.
- **Perdas (AP)** — perdas Energy aplicadas às tarifas.
- **Créd/Déb / Fotovoltaico / Ajuste manual**.

Precisa-se identificar qual desses componentes está gerando os R$ 510 indevidos no seu caso.

## Plano

1. **Inspecionar a memória da competência aberta** — rodar uma consulta para obter, do `totais` da memória:
   - `iluminacao_publica` (BK)
   - `bandeira_total` (BO)
   - `rs_perdas` (AP)
   - `cred_deb_rateado` (BS)
   - `fotovoltaico` (BU)
   - `ajuste_manual` (BW)
   - `rs_ultrapassagem` (L)

   Soma esperada para o delta: `BK + BO + AP + BS + BU + BW − L = 510,46`.

2. **Identificar o culpado** — verificar se algum desses é inesperadamente diferente de zero (ex.: bandeira não deveria estar acionada, ou iluminação está vindo da Fatura Copel quando já está em "Valores R$").

3. **Confirmar com o usuário** — apresentar o breakdown e perguntar:
   - "Você espera bandeira/iluminação/perdas no TOTAL Fatura?" ou
   - "O TOTAL Fatura deve somar apenas os 6 Valores R$ (e os tributos/extras ficarem em linhas separadas, sem entrar no total)?"

4. **Aplicar a correção** dependendo da resposta:
   - **Opção A** (cálculo bate com Copel): remover do `total_fatura_copel` os componentes que o usuário não quer somar (ex.: zerar BK/BO/AP no `CA` se já estão embutidos no preço Copel).
   - **Opção B** (TOTAL = soma dos valores apenas): redefinir `CA = AF + L` (ou `AF` sem ultrapassagem) e mover bandeira/iluminação/tributos para colunas informativas separadas.

5. **Validar** — recarregar a Memória de Cálculo da competência 2026-06 e confirmar que TOTAL Fatura passa a exibir **R$ 24.404,17** (ou o valor acordado), e que o badge "Bate com fatura" continua funcionando para outras competências.

## Arquivos afetados (técnico)

- `src/lib/energia-rateio.ts` — função `calcularMemoria`, fórmulas BK/BO/AP/CA.
- `src/components/admin/energia/MemoriaCalculoTab.tsx` — apenas se for necessário reordenar as linhas exibidas; o `getCalc` continuará lendo `totais.total_fatura_copel`.

Nenhuma migração de schema é necessária — é apenas correção de fórmula.