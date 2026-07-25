
## Objetivo

Replicar no app o comportamento exato da planilha `MEMÓRIA DE CÁLCULO` + `RESUMO` + `FATURAS CLIENTES` (Mega Curitiba 06/2026). Hoje o app diverge em várias regras — abaixo estão as mudanças, agrupadas por camada.

## Divergências confirmadas planilha × app

1. **Perdas técnicas**: planilha ratea `perdas = (Copel − soma medidores) + perdas identificadas manualmente`, por consumo **ponta e fora ponta separadamente**. App usa modo "Exato/Planilha" mas não separa os dois componentes (diferença Copel vs. perdas identificadas).
2. **Bandeira tarifária**: base = `(consumo medido + perdas) / 100 × valor bandeira`, calculada por módulo. App deriva `bandeira_valor` global e aplica sobre kWh — precisa aplicar sobre consumo+perdas, ponta e fora ponta separadamente.
3. **ICMS e PIS/COFINS**: ordem correta é (a) ICMS sobre valor bruto de cada componente; (b) PIS/COFINS sobre `(bruto − ICMS)` **item a item**. Confirmar que o app segue exatamente essa ordem.
4. **Demanda**: cobra `min(contratada, medida) × tarifa_demanda`. "Isenta" = `max(0, contratada − medida)`. "Ultrapassagem" = `max(0, medida − contratada) × 2 × tarifa_demanda`. Cada uma sofre ICMS/PIS/COFINS conforme regra própria (isenta = tarifa 0; ICMS não incide sobre isenta).
5. **Iluminação Pública**: fixo R$98,17 do mês, rateado por consumo (U_modulo / U_total).
6. **Crédito/Débito Copel**: valor pequeno (ex. R$2,97) rateado por consumo. Item hoje inexistente no app.
7. **Fotovoltaico**: abate **apenas o consumo da Área Comum** (kWh, ponta e fora ponta). Saldo em R$ é redistribuído a todos os clientes por **m² da área locada**, não por consumo. App atualmente trata saldo por kWh — precisa aceitar rateio por área.
8. **Área Comum**: rateio final por m² (não por consumo). Precisa de coluna `area_m2` por módulo/cliente e agregação com SUMIFS por cliente.
9. **Fatura por cliente**: hoje o app agrega por cliente; planilha faz por módulo. Manter agregação por cliente (mais amigável), mas garantir que os totais batam com a soma dos módulos.
10. **Ultrapassagem separada**: "multa" fica fora do Total Energy e é subtraída ao comparar com Copel. Bloco "Diferenças" deve continuar isolando multas.

## Mudanças por arquivo

### Banco (nova migração)
- Adicionar em `energia_competencia_lancamentos` (ou tabela equivalente): coluna `demanda_medida_kw` (se ainda não existe separada de contratada), `area_m2` no módulo/lançamento.
- Adicionar em `energia_competencias` (ou `energia_parametros`): campos `perdas_identificadas_ponta_kwh`, `perdas_identificadas_fp_kwh`, `credito_debito_copel`, `ip_valor_fixo`.
- Adicionar em `energia_fotovoltaico_saldo_pendente` (ou nova): permitir "saldo em R$ acumulado" separado do kWh; opção de aplicar por m² à área comum.
- GRANTs + policies mantidos como hoje (mudanças aditivas).

### `src/lib/energia-rateio.ts` (motor)
- Reestruturar em passos idênticos à ordem 1→16 do relatório:
  1. Calcular por módulo: demanda (cobrada / isenta / ultrapassagem), consumo bruto R$ ponta e FP.
  2. Calcular perdas: `perdas_ponta_modulo = (U_modulo/U_total) × (diff_copel_ponta + perdas_ident_ponta)` e idem FP. Converter em R$ com as mesmas tarifas.
  3. ICMS por item (Ponta TE/TUSD, FP TE/TUSD, Demanda) sobre valor bruto; PIS/COFINS = `(bruto − ICMS) × 8,61%`. Demanda isenta: ICMS=0, PIS/COFINS incide sobre valor (mesmo 0 quando tarifa=0).
  4. IP = `(IP_fixo / U_total) × U_modulo`.
  5. Bandeira = `((Q + perdas_ponta)/100) × bandeira + ((T + perdas_fp)/100) × bandeira`.
  6. Total módulo = consumo+demanda+perdas+IP+bandeira; aplicar rateio de crédito/débito Copel `(U_modulo/U_total) × valor`.
- Fotovoltaico: aplicar redução em kWh no módulo "Área Comum" (ponta e FP). Saldo residual em R$ = valor da área comum líquido. Ratear esse valor por m² a todos os clientes.
- Manter função pura, sem side effects, com testes.

### `src/lib/energia-rateio.test.ts` (novo)
- Casos-espelho da planilha (módulo VELOZ e cliente SODEXO conforme exemplos §11–§12) com asserts em centavos, incluindo demanda com/sem ultrapassagem, bandeira amarela, perdas separadas.

### `src/components/admin/energia/FaturaCopelTab.tsx`
- Adicionar campos: `perdas_identificadas_ponta`, `perdas_identificadas_fp`, `credito_debito_copel`, `ip_valor_fixo`.
- Bloco de conferência: mostrar `diferença Copel = consumo_copel − soma_medidores` (ponta e FP separado) e `% perdas totais`.

### `src/components/admin/energia/MemoriaCalculoTab.tsx`
- Coluna nova por módulo: `area_m2` (input), `demanda_isenta`, `ultrapassagem`, `perdas_ponta`, `perdas_fp`, `IP_rateado`, `bandeira_ponta`, `bandeira_fp`, `credito_debito_rateado`.
- Retirar campo `bandeira_valor` manual — passa a ser derivado da Fatura Copel (já é hoje) e aplicado item a item.
- Remover o toggle "Exato/Planilha" — modo único = fórmula da planilha.

### `src/components/admin/energia/FaturasTab.tsx`
- Agregar por cliente via SUMIFS (soma dos módulos). Área Comum entra como linha adicional rateada por m².
- Bloco de auditoria: refletir a nova estrutura (ICMS item a item, PIS/COFINS pós-ICMS, bandeira sobre consumo+perdas).
- Diferenças Copel × Faturado deve continuar isolando ultrapassagem/multas.

### `src/components/admin/energia/EnergiaPainelTab.tsx`
- Checklist de fechamento: adicionar "perdas identificadas preenchidas", "crédito/débito Copel", "áreas m² preenchidas".

## Detalhes técnicos importantes

- **Ordem tributária** (por item de consumo/demanda):
  ```
  ICMS_item = bruto_item × 0.19
  PIS_COFINS_item = (bruto_item − ICMS_item) × 0.0861
  ```
- **Perdas por módulo**:
  ```
  perdas_ponta_m = (U_m / ΣU) × (Copel_ponta − Σmedidores_ponta + perdas_ident_ponta)
  perdas_fp_m    = (T_m / ΣT) × (Copel_fp − Σmedidores_fp + perdas_ident_fp)
  ```
  Denominador correto conforme planilha: usa `U = Q+T` (total) por consistência com o rateio geral, mas ponta/FP têm perdas separadas — validar contra planilha usando o exemplo do módulo VELOZ.
- **Bandeira**: valor em R$/100kWh; multiplicar por `(kWh_medido + perdas_alocadas)/100`.
- **Fotovoltaico**: geração em kWh abate consumo da Área Comum. Saldo R$ = `(valor_area_comum_ponta/kWh_ac_ponta) × geracao_ponta + idem_fp`. Se sobrar geração (> consumo AC), acumula em saldo_pendente em kWh. Depois o valor líquido da AC é rateado por m² a todos os clientes.

## Fora de escopo
- Não mexer em regras de solicitação/anexos.
- Não alterar auth/RLS além de granular colunas novas.
- Não redesenhar UI — apenas adicionar campos/colunas necessários.

## Sequência de execução
1. Migração de banco (colunas novas + parâmetros).
2. Reescrita do motor `energia-rateio.ts` + testes contra a planilha.
3. Ajustes UI (`FaturaCopelTab`, `MemoriaCalculoTab`, `FaturasTab`, `EnergiaPainelTab`).
4. Validar visualmente com a planilha 06/2026 (módulos VELOZ e SODEXO devem bater em centavos).
