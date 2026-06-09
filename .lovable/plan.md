# Rateio de Energia v3 — Cadastro por CNPJ + Contratos

## 1. Cadastro de Clientes por CNPJ

Atualizar `energia_clientes`:
- Novos campos: `cnpj` (text, único quando preenchido), `razao_social`, `nome_fantasia`, `cidade`, `uf`.
- O campo `nome` passa a ser derivado da razão social (mantido por compat).
- Reuso do hook `useCNPJ` (mesma API/cache de fornecedores) para autopreencher: digita CNPJ → busca → preenche razão social, fantasia, cidade/UF.
- UI: substituir o input simples por um formulário com CNPJ + botão "Buscar", exibindo dados retornados antes de salvar. Validação de CNPJ no client.

## 2. Nova entidade: Contrato de Energia

Nova tabela `energia_contratos`:
- `numero_contrato` (text, único)
- `cliente_id` → `energia_clientes`
- `demanda_contratada_kw` (numeric) — **fonte única** da demanda
- `vigencia_inicio` (date), `vigencia_fim` (date, opcional)
- `termo_demanda_path` (text) — anexo no bucket privado `energia-contratos`
- `ativo` (bool)
- `observacao` (text)

Tabela de vínculo `energia_contrato_modulos` (1 contrato → N módulos, com vigência por vínculo):
- `contrato_id`, `modulo_id`
- `vigencia_inicio`, `vigencia_fim` (nullable)
- Constraint: para o mesmo módulo, não pode haver dois vínculos com janelas sobrepostas (validado por trigger).

## 3. Migração da Demanda do Módulo → Contrato

- Remover do uso `energia_modulos.demanda_contratada_kw` (coluna mantida como legado para não quebrar dados, mas UI deixa de editá-la).
- A Memória de Cálculo passa a resolver a demanda assim, para cada módulo em uma competência (`ano_mes`):
  1. Busca o vínculo ativo `energia_contrato_modulos` cuja vigência cobre o mês.
  2. Pega `demanda_contratada_kw` do contrato vinculado.
  3. Se nenhum contrato vigente, exibe alerta "Sem contrato vigente" e usa 0.
- Atualizar `EnergiaCadastrosTab` (remover coluna Demanda) e `MemoriaCalculoTab` (coluna Demanda passa a ser somente leitura, vinda do contrato).

## 4. Storage

- Bucket privado `energia-contratos` via `storage_create_bucket`.
- RLS em `storage.objects`: SELECT/INSERT/UPDATE/DELETE apenas para `admin`.
- Upload do termo na criação/edição do contrato (PDF, máx 10MB).

## 5. UI — Nova sub-aba "Contratos"

Dentro de `RateioEnergiaTab`, adicionar sub-aba **Contratos** (entre Memória e Cadastros):
- Lista com: nº contrato, cliente, demanda kW, vigência, módulos vinculados (chips), status ativo, anexo (ícone download).
- Filtro por cliente e por status.
- Modal "Novo/Editar contrato":
  - Número do contrato
  - Select de cliente (somente ativos)
  - Demanda contratada (kW)
  - Vigência início / fim
  - Upload do Termo de Demanda
  - Multi-select de módulos com data de início (e fim opcional) por módulo
  - Toggle ativo/inativo

## 6. Escopo / fora de escopo

Dentro: tudo acima, apenas para admin (mesmas policies das demais tabelas energia_*).
Fora: edição em lote de contratos, versionamento histórico do termo (1 anexo por contrato), notificações de vencimento de contrato.

## Detalhes técnicos

- Migração SQL única com: ALTER em `energia_clientes`, CREATE `energia_contratos`, CREATE `energia_contrato_modulos`, GRANTs, RLS (admin-only via `has_role`), trigger anti-sobreposição, trigger `touch_updated_at`.
- Bucket `energia-contratos` criado via tool dedicada; policies via migration.
- Engine `src/lib/energia-rateio.ts` ganha parâmetro `contratosVigentes: Map<modulo_id, demanda_kw>` resolvido na UI via query.
- Novo componente `src/components/admin/energia/ContratosTab.tsx`.
- `EnergiaCadastrosTab.tsx` ajustado (CNPJ + remoção coluna Demanda).
- `MemoriaCalculoTab.tsx` ajustado para ler demanda do contrato.
