## Memória de Cálculo — Rateio de Energia (v2)

Objetivo: reproduzir **exatamente** a aba `MEMÓRIA DE CÁLCULO` da planilha do Mega Curitiba dentro do app, em **Admin → Rateio de Energia**, gerando uma matriz mensal por módulo a partir de inputs simples (fatura Copel + leitura de demanda/consumo por módulo). Cálculos no app (não no banco), totalmente determinísticos.

---

### 1. Como a planilha funciona (o que vamos replicar)

A aba tem 4 blocos de **input** (digitados/colados a cada mês) e o resto é **derivado**:

**Inputs por competência (uma vez por mês):**
- Tarifas Copel (linhas E6–E14 da aba PARÂMETROS COPEL): demanda USD, demanda isenta, ultrapassagem, TE/TUSD ponta, TE/TUSD fora-ponta, iluminação pública, PIS, COFINS, ICMS, bandeira tarifária.
- Perdas globais (E40, E41, E45, E46): perdas ponta/fora ponta da Copel + perdas do Energy Expert.
- Créditos/débitos da fatura (E50/E51).
- Geração fotovoltaica área comum ponta/fora ponta (D45/D46 do RESUMO) — abate da área comum.

**Inputs por módulo (uma linha por módulo, por mês):**
- Demanda contratada (F), Demanda USD medida (G), Consumo ponta (Q), Consumo fora ponta (T).

**Derivados (calculados — ~75 colunas):**
Para cada módulo:
- **Demanda** (cols H–M): Isenta = max(F−G,0); Ultrapassagem = max(G−F,0); R$ Demanda = min(F,G)·E6; R$ Isenta = H·E7; R$ Ultrap = I·E8.
- **Consumo** (cols O–U): replica Q/T em ponta/fora; total = Q+T.
- **Custo bruto** (W–AF): TE/TUSD × kWh; total + demanda.
- **Perdas rateadas por % de consumo** (AH–AT): `(Umódulo / Σ Umódulos) × (perdas_ponta + perdas_fora)`, valorizadas pelas mesmas tarifas.
- **ICMS** (AV–BA): cada componente × ICMS%.
- **PIS/COFINS** (BC–BI): `(componente − ICMS) × (PIS+COFINS)%`.
- **Iluminação Pública** (BK): rateada por consumo.
- **Bandeira** (BM–BO): `((kWh + perdas) / 100) × bandeira`.
- **Cobrança total** (BQ).
- **Fotovoltaico** (BU): abate área comum (saldo anterior + geração) — só na linha ÁREA COMUM.
- **Ajustes manuais** (BW): coluna editável livre.
- **Total Fatura Energy** (BY) e **Total Fatura Copel** (CA = BY − ultrapassagem).
- **Lançamento financeiro** (CC–CK): consumo arredondado, R$/kWh, comparativo com mês anterior.
- **Validação** (CL): `BY == CA`.

E uma **linha de totais (linha 82 da planilha)** somando todas as colunas.

---

### 2. Modelo de dados (nova migração)

3 novas tabelas + 1 view; reaproveita `energia_clientes`, `energia_modulos`, `energia_parametros` já existentes.

```text
energia_competencias
  id, ano_mes (YYYY-MM, unique), status (rascunho|fechada),
  observacao, fechada_em, fechada_por

energia_competencia_tarifas       -- snapshot Copel do mês
  competencia_id (unique),
  demanda_usd, demanda_isenta, ultrapassagem,
  te_ponta, tusd_ponta, te_fora, tusd_fora,
  iluminacao_publica,
  pis_pct, cofins_pct, icms_pct,
  bandeira_valor,
  perdas_copel_ponta_kwh, perdas_copel_fora_kwh,
  perdas_energy_ponta_kwh, perdas_energy_fora_kwh,
  cred_deb_fatura,
  fotovoltaico_saldo_ponta, fotovoltaico_geracao_ponta,
  fotovoltaico_saldo_fora,  fotovoltaico_geracao_fora

energia_competencia_lancamentos   -- 1 linha por módulo
  competencia_id, modulo_id (unique juntos),
  demanda_contratada_kw, demanda_usd_medida_kw,
  consumo_ponta_kwh, consumo_fora_kwh,
  ajuste_manual_reais, observacao
```

RLS: leitura para `authenticated`, escrita só `admin` (igual às tabelas atuais). GRANTs explícitos.

---

### 3. Cálculo (frontend, TypeScript puro)

Novo arquivo `src/lib/energia-rateio.ts`:
- Função `calcularMemoria({ tarifas, lancamentos })` → array de objetos com todas as ~80 colunas + linha de totais.
- 100% determinística, sem chamadas ao banco. Reutilizada pela tela de edição e pelo futuro PDF.
- Testes em `src/lib/energia-rateio.test.ts` validando contra valores conhecidos do mês 08/2025 da planilha.

---

### 4. UI — Admin → Rateio de Energia

Adicionar **nova sub-aba "Memória de Cálculo"** no `RateioEnergiaTab.tsx`.

**Topo:** seletor de competência (combobox YYYY-MM) + botão "Nova competência" + botão "Duplicar do mês anterior" (copia tarifas/lançamentos) + badge de status (Rascunho/Fechada).

**Card "Tarifas Copel do mês":** formulário compacto com todas as tarifas/perdas/créditos da competência (16 campos). Pré-preenchido com defaults dos `energia_parametros`.

**Tabela principal "Memória de Cálculo":**
- Linhas = módulos ativos do cadastro (`energia_modulos` ordem ASC) + linha "TOTAL".
- Agrupada visualmente nos mesmos blocos da planilha: Detalhamento · Demanda · Consumo · Custo kWh/mês · Perdas · ICMS · PIS/COFINS · Iluminação · Bandeira · Total · Fotovoltaico · Ajuste · Total Energy · Total Copel · Lançamento financeiro.
- Colunas de **input** (Demanda USD, Consumo Ponta, Consumo Fora, Ajuste Manual) com fundo amarelo, editáveis inline → autosave (debounce 600 ms).
- Colunas **derivadas** somente leitura, cinza, recalculadas em memória ao digitar.
- Rolagem horizontal nativa; colunas Módulo/Cliente fixas (sticky-left).
- Indicador de validação `BY == CA` por linha (✓ verde / ⚠ vermelho).

**Ações:** "Fechar competência" (bloqueia edição), "Exportar CSV" (mesmo layout da planilha).

---

### 5. Fora de escopo desta entrega

- PDF/fatura por cliente (próxima fase).
- Importação do .xlsx mensal.
- Aba RESUMO consolidada por cliente (próxima fase — fica natural depois que a memória estiver no ar).
- Geração fotovoltaica detalhada por usina (entra como input simples só para área comum agora).

---

### Detalhes técnicos

Arquivos a criar/editar:
- `supabase/migrations/<timestamp>_energia_competencias.sql` — 3 tabelas + RLS + GRANTs + trigger updated_at.
- `src/lib/energia-rateio.ts` — engine de cálculo.
- `src/lib/energia-rateio.test.ts` — testes com valores 08/2025.
- `src/components/admin/energia/MemoriaCalculoTab.tsx` — UI principal.
- `src/components/admin/energia/TarifasCopelForm.tsx` — formulário de tarifas do mês.
- `src/components/admin/energia/MemoriaCalculoTable.tsx` — matriz inline editável.
- `src/components/admin/RateioEnergiaTab.tsx` — adicionar sub-abas internas (`Cadastros` / `Memória de Cálculo`).

Mapeamento direto célula→campo (resumo, para conferência durante a implementação):

```text
E6  → demanda_usd        E11 → te_ponta        E20 → pis+cofins
E7  → demanda_isenta     E12 → tusd_ponta      E21 → icms
E8  → ultrapassagem      E13 → te_fora         E24 → bandeira
E15 → iluminacao_publica E14 → tusd_fora
E40/E41 → perdas Copel ponta/fora
E45/E46 → perdas Energy ponta/fora
E50/E51 → cred/deb fatura
RESUMO!D45/D46/D47/D48 → fotovoltaico ponta/fora (kWh/R$)
```
