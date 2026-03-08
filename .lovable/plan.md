

# Diferenciar visualmente Fluig de Cadastro vs Fluig de Aprovação

## Problema
Os dois tipos de Fluig (cadastro contábil e aprovação da solicitação) usam ícones, cores e labels muito similares na timeline e nos badges, causando confusão.

## Solução

### 1. Timeline (`src/components/SolicitacaoTimeline.tsx`)
- **Fluig de cadastro** (`fluig_cadastro_adicionado`): trocar ícone para `Package` e cor para `bg-emerald-600` (verde). Label para backoffice: "Fluig de cadastro contábil adicionado". Label para solicitante: "Cadastro solicitado à Contabilidade" (mantém).
- **Fluig de aprovação** (`numero_fluig_adicionado`, `numero_fluig_alterado`): manter ícone `RefreshCw` e cor `bg-blue-500`. Alterar label para "Fluig de **aprovação** adicionado/alterado" para explicitar a diferença.
- Badge de contexto no timeline: cadastro usa badge verde "Cadastro Contábil"; aprovação usa badge azul "Fluig Aprovação".

### 2. Modais do Backoffice (`src/pages/Backoffice.tsx`)
- **Modal Fluig de Cadastro**: adicionar um alerta/banner no topo: "Este é o Fluig do cadastro contábil (separado do Fluig de aprovação)." com ícone `Package` e fundo verde claro.
- **Modal Fluig/RM (aprovação)**: adicionar banner: "Este é o Fluig/RM de aprovação da solicitação." com ícone `RefreshCw` e fundo azul claro.
- Títulos dos modais mais explícitos: "Fluig — Cadastro Contábil" vs "Fluig/RM — Aprovação"

### 3. Badges nos cards do Backoffice (`src/pages/Backoffice.tsx`)
- Onde o badge de Fluig de aprovação aparece (banner "AGUARDANDO EMISSÃO DE OC"), manter azul.
- O botão/badge de "Solicitar Cadastro" / "Cadastro OK" já usa verde — manter consistente.

**2 arquivos alterados:** `SolicitacaoTimeline.tsx`, `Backoffice.tsx`. Mudanças puramente visuais (cores, ícones, labels).

