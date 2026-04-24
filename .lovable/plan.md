## Objetivo

Permitir que usuários do backoffice/admin alterem a **Natureza Orçamentária** de uma solicitação direto pelo modal de detalhes, registrando a mudança no histórico (e, por consequência, na timeline visível ao solicitante).

## Como vai funcionar

No card "Classificação Orçamentária" do modal de detalhes (BackofficeModals), o backoffice verá um botão **Editar** (ícone de lápis) ao lado do badge atual. Clicar abre um modal pequeno com um `Select` listando todas as opções de `NATUREZA_ORCAMENTARIA_LABELS`, pré-selecionado no valor atual. Ao salvar:

1. UPDATE em `solicitacoes.natureza_orcamentaria`.
2. INSERT em `historico_solicitacoes` com:
   - `acao = 'natureza_orcamentaria_alterada'`
   - `motivo = 'Natureza Orçamentária alterada de {LABEL_ANTIGO} para {LABEL_NOVO}'`
   - `status_anterior` e `status_novo` iguais ao status atual (sem mudança de status).
3. Toast de confirmação + refresh da listagem e do modal.

## Mudanças técnicas

### 1. `src/pages/Backoffice.tsx`
- Novos estados: `editNaturezaOpen`, `editNaturezaValue`, `editNaturezaLoading`.
- Novo handler `handleSaveNatureza` no mesmo padrão de `handleSaveProjuris`:
  - Valida `selectedSolicitacao` e `user`.
  - Faz `supabase.from('solicitacoes').update({ natureza_orcamentaria: novoValor }).eq('id', ...)`.
  - Se houve mudança real, insere em `historico_solicitacoes` com a ação descrita acima.
  - Atualiza `selectedSolicitacao` no estado local (para o card refletir imediatamente) e chama `fetchSolicitacoes()`.
- Encaminha as 4 props novas para `<BackofficeModals .../>`.

### 2. `src/components/backoffice/BackofficeModals.tsx`
- Adicionar à interface `BackofficeModalsProps`:
  ```ts
  editNaturezaOpen: boolean;
  setEditNaturezaOpen: (open: boolean) => void;
  editNaturezaValue: string;
  setEditNaturezaValue: (v: string) => void;
  editNaturezaLoading: boolean;
  handleSaveNatureza: () => void;
  ```
- No bloco "Classificação Orçamentária" (linhas ~526–534), adicionar um botão `Edit` (variant ghost, size icon) ao lado do `Label`, visível apenas quando o usuário é backoffice/admin. Ao clicar: pré-popular `editNaturezaValue` com `detalhes.solicitacao.natureza_orcamentaria` e abrir o modal.
- Novo `<Dialog>` `EditNaturezaModal` no mesmo padrão visual do `editProjurisOpen`, mas usando `Select` com as opções de `NATUREZA_ORCAMENTARIA_LABELS`.

### 3. `src/components/SolicitacaoTimeline.tsx` e `src/components/SlaTimelineModal.tsx`
- Mapear a nova ação `natureza_orcamentaria_alterada` para um label legível ("Classificação Orçamentária alterada") com ícone `Edit` e cor neutra (ex.: `bg-amber-500 text-white`), seguindo o mesmo estilo das ações `numero_fluig_alterado` / `numero_projuris_alterado`. O `motivo` (com de→para) já é renderizado abaixo do label automaticamente.

## Permissões e segurança

- A RLS atual de `solicitacoes` já permite `Backoffice can update all solicitacoes`, portanto o UPDATE funciona.
- A RLS atual de `historico_solicitacoes` exige `auth.uid() = user_id` no INSERT, o que é satisfeito.
- O botão Editar só será exibido se `effectiveProfile === 'backoffice'` ou `'admin'` (podemos detectar pelo hook já existente `useUserRole`/`useAuth` do projeto, conforme padrão já usado nesta tela).

## Fora do escopo

- Não alteramos schema do banco, RLS, nem Edge Functions.
- Não recalculamos `instrumento_juridico` (esse é definido por outras flags via trigger `set_instrumento_juridico` apenas no INSERT/UPDATE de campos relevantes — natureza orçamentária não dispara recálculo).
- Não enviamos notificação automática extra ao solicitante; a mudança aparecerá na timeline de histórico que ele já visualiza.
