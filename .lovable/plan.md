## Objetivo

Evoluir o módulo Rateio de Energia com três blocos novos: **Grandezas Contratadas** (aba global em Parâmetros), **Comparativo Copel** (bloco completo da fatura para conferência) e **Saldo Fotovoltaico com carry-over automático** entre competências.

---

## 1. Grandezas Contratadas (Parâmetros — aba global)

Nova aba `Grandezas Contratadas` dentro de `EnergiaCadastrosTab.tsx`, ao lado de Parâmetros (tributos). Guarda o "contrato vigente" com a Copel — valores que mudam pouco e servem de default para cada competência nova.

**Tabela nova `energia_grandezas_contratadas`** (com histórico por vigência):
- `vigencia_inicio` (date, not null), `vigencia_fim` (date, null = vigente)
- Demanda: `demanda_contratada_kw`, `tarifa_demanda_usd`, `tarifa_demanda_isenta`, `tarifa_ultrapassagem`
- Energia: `te_ponta`, `tusd_ponta`, `te_fora`, `tusd_fora`
- Outros: `iluminacao_publica_padrao`, `bandeira_valor_padrao`
- `observacao`, auditoria padrão

UI: lista de vigências (badge "Vigente" na linha sem `vigencia_fim`), botão "Nova Vigência" abre modal com todos os campos. Ao encerrar uma vigência, sugere data de início da próxima.

**Integração com competência:** ao criar uma competência, `energia_competencia_tarifas` é pré-preenchida com a grandeza vigente naquela data. Botão "Recarregar do Contrato" disponível na aba de Tarifas da competência.

---

## 2. Comparativo Copel (Memória de Cálculo)

Novo bloco no topo de `MemoriaCalculoTab.tsx` — "Fatura Copel (referência)". Permite digitar os totais que vieram impressos na conta da Copel e compara com a soma calculada pelo sistema.

**Colunas adicionadas em `energia_competencia_tarifas`** (mesma linha que já guarda tarifas da competência):
- `copel_demanda_kw`, `copel_consumo_ponta_kwh`, `copel_consumo_fora_kwh`
- `copel_valor_te_ponta`, `copel_valor_tusd_ponta`, `copel_valor_te_fora`, `copel_valor_tusd_fora`
- `copel_valor_demanda`, `copel_valor_ultrapassagem`
- `copel_valor_icms`, `copel_valor_pis_cofins`
- `copel_valor_bandeira`, `copel_valor_iluminacao_publica`
- `copel_cred_deb`, `copel_valor_total`

UI: card "Conferência com a Fatura Copel" — coluna esquerda = digitado na fatura, coluna direita = calculado pelo sistema (totais derivados de `calcularMemoria`), coluna delta com badge verde (<R$ 1) / amarelo (<1%) / vermelho. Edição inline dos campos da Copel.

---

## 3. Saldo Fotovoltaico com carry-over automático

Hoje `fotovoltaico_geracao_ponta/fora` e `fotovoltaico_saldo_ponta/fora` já existem em `energia_competencia_tarifas`. Falta a lógica de saldo remanescente e carry-over.

**Mudanças em `energia_competencia_tarifas`:**
- Renomear conceitualmente os campos atuais:
  - `fotovoltaico_geracao_ponta/fora` = geração do mês (input)
  - `fotovoltaico_saldo_inicial_ponta/fora` (novos) = saldo herdado do mês anterior (auto-preenchido, somente leitura)
- Adicionar `fotovoltaico_saldo_final_ponta/fora` (gerado) = `saldo_inicial + geração − consumido_area_comum` (mínimo 0)

**Lógica no engine (`src/lib/energia-rateio.ts`):**
- Disponível para abatimento = `saldo_inicial + geração`
- Aplicar à linha Área Comum até esgotar (ponta e fora separados)
- Saldo final exposto no resultado para a UI gravar

**Carry-over automático:** ao **fechar** uma competência (`status = 'fechada'`), trigger `after update on energia_competencias` copia `saldo_final_*` da competência fechada para `saldo_inicial_*` da próxima competência (`ano_mes` seguinte). Se a próxima ainda não existir, grava em tabela auxiliar `energia_fotovoltaico_saldo_pendente` (cliente_id, ano_mes, saldo_ponta, saldo_fora) que é consumida quando a competência é criada.

**UI em MemoriaCalculoTab:** card "Fotovoltaico" mostrando — Saldo inicial (read-only com link à competência anterior) · Geração do mês (editável) · Consumido pela Área Comum (calculado) · **Saldo final** (destaque). Tooltip explicando o carry-over.

---

## Detalhes Técnicos

### Migrations (SQL)
1. `CREATE TABLE energia_grandezas_contratadas` + GRANT authenticated/service_role + RLS (admin/backoffice) + trigger `touch_updated_at`.
2. `ALTER TABLE energia_competencia_tarifas` adicionar 15 colunas `copel_*`, 2 `fotovoltaico_saldo_inicial_*`, 2 `fotovoltaico_saldo_final_*`.
3. `CREATE TABLE energia_fotovoltaico_saldo_pendente` (chave: ano_mes) + grants/RLS.
4. Função `apply_fotovoltaico_carryover()` + trigger em `energia_competencias` (fechamento) e em INSERT (consumir pendente).
5. Função `get_grandeza_vigente(p_data date)` SECURITY DEFINER.

### Frontend
- `EnergiaCadastrosTab.tsx`: nova aba "Grandezas Contratadas" com lista + modal de vigência.
- `MemoriaCalculoTab.tsx`: blocos "Fatura Copel" e "Fotovoltaico" reformulado; integrar saldo inicial na exibição.
- `src/lib/energia-rateio.ts`: ajustar `EnergiaTarifas` para incluir `saldo_inicial_*`, retornar `saldo_final_*` em `MemoriaResultado`.
- Botão "Recarregar do Contrato" na aba tarifas (chama `get_grandeza_vigente`).

### Sem mudança de comportamento existente
Cálculo de rateio continua determinístico; apenas o abatimento fotovoltaico passa a usar `saldo_inicial + geracao` no lugar de `max(saldo, geracao*tarifa)`.

---

## Validação
1. Cadastrar uma Grandeza vigente em 06/2026; criar competência 06/2026 → tarifas pré-preenchidas.
2. Digitar valores da fatura Copel em uma competência aberta → ver deltas zerados quando consistente.
3. Fechar competência 05/2026 com saldo fotovoltaico > 0 → abrir 06/2026 e ver saldo inicial preenchido automaticamente.