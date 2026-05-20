# Fornecedores Internacionais

Hoje o cadastro de fornecedor depende 100% de CNPJ (busca BrasilAPI, validação dos 14 dígitos, coluna `cnpj NOT NULL`). Para uma compra internacional como a Invoice da Lovable Labs (US, VAT EU/GB, sem CNPJ) precisamos de um fluxo paralelo de cadastro manual.

## 1. Banco (migration)

Tabela `fornecedores`:
- `tipo_fornecedor text NOT NULL DEFAULT 'nacional'` — valores: `nacional` | `internacional`.
- Tornar `cnpj` nullable; adicionar índice único parcial `(cnpj) WHERE cnpj IS NOT NULL`.
- Novos campos para internacionais:
  - `pais text` (ISO-3166 alpha-2, ex.: `US`)
  - `identificador_fiscal text` (VAT, EIN, TAX ID...)
  - `tipo_identificador_fiscal text` (`VAT`, `EIN`, `TAX_ID`, `OTHER`)
  - `moeda_padrao text` (ISO-4217, ex.: `USD`, `EUR`)
- Constraint: nacional exige `cnpj`; internacional exige `pais` + `identificador_fiscal`.
- Backfill `tipo_fornecedor = 'nacional'` para registros existentes.

RLS: manter políticas atuais (já cobrem insert/select por usuários aprovados).

## 2. Tipos e helpers

- `src/types/index.ts`: adicionar campos opcionais em `Fornecedor` (`tipo_fornecedor`, `pais`, `identificador_fiscal`, `tipo_identificador_fiscal`, `moeda_padrao`).
- `src/hooks/useCNPJ.ts`: `dbRowToFornecedor` propaga novos campos (sem mudar lógica nacional).
- Novo `src/lib/paises.ts`: lista curta de países (label + ISO + moeda default) para o select.

## 3. UI — `SupplierSearch`

- Adicionar toggle no topo do componente (quando `value` é null):
  - "Nacional (CNPJ)" — fluxo atual intacto.
  - "Internacional" — abre formulário manual.
- Botão secundário "Cadastrar fornecedor internacional" também aparece no estado "nenhum resultado".

Novo `src/components/InternationalSupplierForm.tsx`:
- Campos: Razão social *, Nome fantasia, País * (select), Tipo de ID fiscal (VAT/EIN/TAX_ID/OTHER), Identificador fiscal *, Moeda padrão (auto pelo país, editável), Endereço, Cidade, Email, Telefone.
- Submit: insere em `fornecedores` com `tipo_fornecedor='internacional'`, `cnpj=null`, `ultima_atualizacao_api=null` e devolve o registro via `onChange`.
- Validação leve: identificador fiscal não vazio + país obrigatório. Sem chamadas BrasilAPI.

Busca existente (`SupplierSearch`):
- Expandir filtro para também buscar por `identificador_fiscal ilike` quando o termo não parece CNPJ.
- Resultados mostram badge "Internacional" + país no `FornecedorCard`.

## 4. Card e exibição

`src/components/FornecedorCard.tsx`:
- Se `tipo_fornecedor='internacional'`: ocultar CNPJ/CNAE/Situação Cadastral; exibir País (bandeira/UF), `tipo_identificador_fiscal: identificador_fiscal`, moeda.
- Esconder botão "Atualizar dados da Receita Federal" e alertas MEI/CNAE para internacionais.

`FornecedorStep.tsx`: pular `CNAECompatibilityBadge` e `MEIAlertBadge` quando internacional.

## 5. Regras de negócio relacionadas

- `requires3CNPJs` / exceção fornecedores: manter, mas a UI passa a aceitar concorrentes internacionais (sem mudança lógica — `Fornecedor.id` continua sendo a chave).
- Validações de retenção/MEI/Receita são puladas para internacionais (já não se aplicam).
- Documentos fiscais: nenhuma mudança nesta fase — invoice é anexada normalmente.

## 6. Fora de escopo (a confirmar)

- Conversão de moeda USD→BRL automática.
- Importação automática dos campos via parsing do PDF da invoice.
- Workflow Fluig específico para importação.

Se quiser, adiciono qualquer um destes em uma segunda etapa.

## Arquivos

- Migration nova em `supabase/migrations/`.
- Editar: `src/types/index.ts`, `src/hooks/useCNPJ.ts`, `src/components/SupplierSearch.tsx`, `src/components/FornecedorCard.tsx`, `src/components/nova-solicitacao/steps/FornecedorStep.tsx`.
- Criar: `src/components/InternationalSupplierForm.tsx`, `src/lib/paises.ts`.
