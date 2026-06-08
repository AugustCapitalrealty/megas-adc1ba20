## Rateio de Energia — v1 (somente cadastro de parâmetros)

Objetivo: criar a base de dados para o futuro cálculo de rateio de energia do Mega Curitiba. Nesta versão só cadastramos os **parâmetros estruturais** (módulos, clientes, demanda contratada, geração fotovoltaica e parâmetros Copel). O cálculo mensal e a importação ficam para uma próxima fase.

Acesso: apenas usuários com role `admin`, dentro de **Admin → aba "Rateio de Energia"**.

---

### 1. O que entra como "parâmetro" nesta v1

Baseado na planilha enviada, três blocos:

**a) Clientes de Energia** (independentes do cadastro `clientes` existente, pois aqui são razões sociais específicas: BOSCH, CALAMO, HP TRADE, NTN-SNR, SHOPEE, VELOZ, ARQUIVO CR, VAGO, etc.)
- nome
- ativo (sim/não)
- observação

**b) Módulos do Mega Curitiba** (linhas da aba LANÇAMENTOS)
- número/identificador do módulo (ex.: `1`, `MEZ 1`, `ÁREA COMUM`)
- área locada (m²)
- cliente vinculado (FK para Clientes de Energia, opcional → "VAGO")
- demanda contratada (kW)
- ordem de exibição
- ativo

**c) Parâmetros Copel / Concessionária** (cabeçalho fixo, editável)
- alíquotas tributárias padrão: ICMS %, PIS %, COFINS %
- texto livre de observações
- (saldos anteriores e tarifas mensais ficam para a fase de "lançamento mensal" — não entram agora)

---

### 2. Backend (Lovable Cloud)

Nova migração criando 3 tabelas no schema `public`, todas com RLS:

- `energia_clientes` — cadastro de clientes de energia
- `energia_modulos` — módulos do empreendimento, com FK opcional para `energia_clientes`
- `energia_parametros` — linha única (singleton) com alíquotas/observações

Regras de acesso (RLS):
- **SELECT**: qualquer usuário autenticado (para futuro uso).
- **INSERT/UPDATE/DELETE**: somente `admin` (`has_role(auth.uid(), 'admin')`).
- GRANTs explícitos para `authenticated` e `service_role`.

Campos padrão (`id`, `created_at`, `updated_at`, `updated_by`) + trigger de `updated_at`.

---

### 3. Frontend

**Novo arquivo** `src/components/admin/RateioEnergiaTab.tsx` com 3 sub-seções (cards/tabs internos):

1. **Parâmetros Copel** — formulário simples (ICMS, PIS, COFINS, observação) com botão Salvar.
2. **Clientes de Energia** — tabela com inline add/edit/inativar.
3. **Módulos** — tabela com colunas: Módulo · Área (m²) · Cliente (select) · Demanda contratada (kW) · Ativo. Permite adicionar, editar inline, reordenar e excluir.

Todas as listas usam os componentes canônicos do design system (`PageHeader` interno, `DataTable`, `StandardModal` para confirmação de exclusão) e seguem identidade Mega (laranja `#E87722`, Montserrat).

**Integração em Admin**: adicionar nova aba `"Rateio de Energia"` em `src/pages/Admin.tsx`, visível apenas para `isAdmin`. Sem entrada no menu lateral por enquanto.

---

### 4. Fora do escopo desta v1 (registrado para próxima fase)

- Lançamento mensal da fatura Copel (TE/TUSD ponta/fora, demanda, ultrapassagem, ilum. pública, créd/déb).
- Lançamento de consumo por módulo no mês.
- Geração fotovoltaica (saldo anterior, área comum ponta/fora ponta).
- Cálculo automático de % rateio, multa por ultrapassagem, perdas, valor por cliente.
- Importação do `.xlsx` mensal.
- Emissão de fatura/PDF por cliente.

---

### Detalhes técnicos

Tabelas SQL (resumo):

```text
energia_clientes(id, nome unique, ativo bool default true, observacao text)
energia_modulos(id, identificador text, area_m2 numeric, cliente_id fk null,
                demanda_contratada_kw numeric, ordem int, ativo bool)
energia_parametros(id, icms_pct numeric, pis_pct numeric, cofins_pct numeric,
                   observacao text)  -- 1 linha apenas, garantida via unique constraint
```

Seed inicial: 1 linha em `energia_parametros` com ICMS 19, PIS 1.65, COFINS 7.6 (ajustáveis).

Arquivos a criar/editar:
- `supabase/migrations/<timestamp>_energia_rateio.sql` (novo)
- `src/components/admin/RateioEnergiaTab.tsx` (novo)
- `src/components/admin/energia/EnergiaClientesCard.tsx` (novo)
- `src/components/admin/energia/EnergiaModulosCard.tsx` (novo)
- `src/components/admin/energia/EnergiaParametrosCard.tsx` (novo)
- `src/pages/Admin.tsx` (adicionar a aba)
