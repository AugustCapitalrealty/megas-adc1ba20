## Objetivo

Permitir que o solicitante adicione/edite a **Garantia** quando a solicitação volta como `pendente_correcao` (ou `aguardando_informacoes`), exatamente como acontece hoje no fluxo de Nova Solicitação. Caso de uso: protocolo `2026000588`, onde o backoffice devolveu para o solicitante preencher a garantia.

## Mudanças

### 1. `src/pages/MinhasSolicitacoes.tsx`
- Adicionar 4 estados no componente: `editTipoGarantia`, `editDiasGarantia`, `editDiasGarantiaServico`, `editDiasGarantiaProduto`.
- Em `openEditModal`: pré-carregar os valores atuais a partir de `sol.tipo_garantia`, `sol.dias_garantia`, `sol.dias_garantia_servico`, `sol.dias_garantia_produto` (defaults: `'nenhuma'` / `''`).
- Em `handleResubmit`: incluir no `updateData` os campos `tipo_garantia`, `dias_garantia`, `dias_garantia_servico`, `dias_garantia_produto` (convertendo strings vazias para `null` e números via `parseInt`). Para `tipo_garantia === 'ambos'` salvar serviço/produto e zerar `dias_garantia`; para `'servico'` ou `'produto'` salvar `dias_garantia` e zerar os outros; para `'nenhuma'` zerar todos.
- Passar os novos estados/setters como props para `EditModal`.

### 2. `src/components/solicitante/SolicitanteModals.tsx`
- Estender `EditModalProps` com os 4 estados/setters de garantia.
- Renderizar um novo bloco "Garantia" dentro do `EditModal` (visível apenas quando `status` for `pendente_correcao` ou `aguardando_informacoes`), reutilizando o mesmo visual amber do `GarantiaBlock` do fluxo de Nova Solicitação:
  - Select com `TIPO_GARANTIA_LABELS`.
  - Quando `servico` ou `produto`: input "Dias de Garantia".
  - Quando `ambos`: dois inputs (Serviço / Produto).
- Posicionar o bloco logo após Natureza Orçamentária / Escopo Detalhado e antes do bloco de fornecedor.

### 3. Sem mudanças de banco
Os campos `tipo_garantia`, `dias_garantia`, `dias_garantia_servico`, `dias_garantia_produto` já existem em `solicitacoes` e o tipo `Solicitacao` já os expõe.

## Validação
- Abrir `2026000588` em "Minhas Solicitações" → Corrigir → preencher Garantia → Reenviar.
- Conferir no detalhe da solicitação (backoffice) que a garantia ficou registrada.
