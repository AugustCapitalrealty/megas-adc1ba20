## Objetivo

Duas melhorias relacionadas ao acompanhamento das solicitações:

1. **Edição do número Projuris** — permitir tanto solicitante quanto backoffice editarem o nº Projuris (hoje só backoffice tem ação direta), seguindo exatamente o padrão já existente do nº Fluig (modal + histórico).
2. **Backoffice "Reverter Liberação"** — na aba *Liberadas*, permitir que o backoffice volte uma solicitação para `aguardando_aceite` quando o solicitante liberou por engano ou quando a OC precisa ser refeita.

---

## 1. Edição de Nº Projuris (solicitante + backoffice)

### Backoffice
Já existe `openEditProjuris` / `handleSaveProjuris` em `Backoffice.tsx` (linhas ~801–830) e o modal correspondente em `BackofficeModals.tsx`. **Verificar/garantir** que:
- O modal grava no histórico (`historico_solicitacoes`) com ações `numero_projuris_adicionado / alterado / removido`, no mesmo padrão do Fluig (linhas 757–780 de `Backoffice.tsx`).
- O botão "Editar Projuris" aparece em **todos** os status onde já há nº Projuris (não só em alguns), via dropdown secundário no `BackofficeSolicitacaoCard`.

### Solicitante (NOVO)
- No `SolicitanteSolicitacaoCard.tsx`, ao lado do `ProjurisStatusCard` (atual linha 332), adicionar um botão pequeno de lápis "Editar nº Projuris".
- Criar um modal simples `EditProjurisSolicitanteModal` (ou reaproveitar via `StandardModal`) que:
  - Mostra o número atual.
  - Aceita novo número (texto livre, trim).
  - Mostra um aviso: *"O número será atualizado e o histórico ficará registrado."*
- Handler chama `supabase.from('solicitacoes').update({ numero_projuris }).eq('id', sol.id)` e em seguida insere em `historico_solicitacoes` com `acao = 'numero_projuris_alterado'`, `motivo = 'Número alterado de X para Y'`, mantendo `status_anterior = status_novo = sol.status`.

### RLS
A policy "Users can update own pending solicitacoes" só permite edição em `pendente_correcao` / `aguardando_informacoes`. Como o usuário pode precisar corrigir o Projuris em qualquer momento, será necessária uma **nova policy** restrita ao próprio dono e ao próprio campo `numero_projuris`. Como o PostgREST não filtra por coluna, faremos via **RPC `SECURITY DEFINER`**:

```sql
create or replace function public.update_numero_projuris(
  p_solicitacao_id uuid,
  p_numero_projuris text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_old text; v_status request_status; v_owner uuid;
begin
  select numero_projuris, status, user_id
    into v_old, v_status, v_owner
  from solicitacoes where id = p_solicitacao_id;

  if v_owner is null then raise exception 'Solicitação não encontrada'; end if;

  -- Permite: dono OU backoffice/admin
  if not (auth.uid() = v_owner or public.is_backoffice_or_admin(auth.uid())) then
    raise exception 'Sem permissão';
  end if;

  update solicitacoes
     set numero_projuris = nullif(trim(p_numero_projuris), '')
   where id = p_solicitacao_id;

  insert into historico_solicitacoes (
    solicitacao_id, user_id, acao, motivo, status_anterior, status_novo
  ) values (
    p_solicitacao_id, auth.uid(),
    case
      when v_old is null and p_numero_projuris is not null then 'numero_projuris_adicionado'
      when v_old is not null and (nullif(trim(p_numero_projuris),'')) is null then 'numero_projuris_removido'
      else 'numero_projuris_alterado'
    end,
    case
      when v_old is null then 'Número Projuris ' || coalesce(p_numero_projuris,'') || ' adicionado'
      when nullif(trim(p_numero_projuris),'') is null then 'Número Projuris ' || v_old || ' removido'
      else 'Número alterado de ' || v_old || ' para ' || p_numero_projuris
    end,
    v_status, v_status
  );
end; $$;
```

Tanto o handler do backoffice (refator) quanto o do solicitante chamarão `supabase.rpc('update_numero_projuris', ...)`.

---

## 2. Backoffice "Reverter Liberação" na aba Liberadas

### UI
Em `BackofficeSolicitacaoCard.tsx`, no bloco `if (sol.status === 'liberado_fornecedor')` (linha 259) e também em `aguardando_execucao` (linha 266), adicionar **ação secundária** no dropdown:

- Item "↩ Reverter Liberação" (ícone `Undo2`) — abre `AlertDialog` de confirmação:
  > "Isso retornará a solicitação para 'Aguardando Aceite' e o solicitante precisará liberar novamente. Deseja continuar?"
  > Campo opcional: motivo (textarea).

### Handler em `Backoffice.tsx`
```ts
const handleReverterLiberacao = async (sol, motivo?: string) => {
  await supabase.from('solicitacoes').update({
    status: 'aguardando_aceite',
    data_liberado_fornecedor: null,
    liberado_fornecedor_por: null,
  }).eq('id', sol.id);

  await supabase.from('historico_solicitacoes').insert({
    solicitacao_id: sol.id,
    user_id: user.id,
    acao: 'reversao_liberacao',
    motivo: motivo || 'Backoffice reverteu a liberação',
    status_anterior: sol.status,
    status_novo: 'aguardando_aceite',
  });

  // Notifica solicitante (mensagem interna + email opcional)
  fetchSolicitacoes();
};
```

### Status visíveis
A ação deve aparecer apenas para `liberado_fornecedor` e `aguardando_execucao` (ambos contidos na aba *Liberadas*). Não disponível em `enviado_fornecedor` (já está em mãos do fornecedor — risco operacional).

### RLS
A policy "Backoffice can update all solicitacoes" já cobre. Sem migration adicional para esta parte.

---

## Detalhes técnicos / arquivos afetados

```text
supabase/migrations/<timestamp>_update_numero_projuris.sql   (NOVO — RPC)
src/pages/Backoffice.tsx                                     (refator handleSaveProjuris p/ usar RPC; novo handleReverterLiberacao)
src/components/backoffice/BackofficeSolicitacaoCard.tsx      (item dropdown "Reverter Liberação")
src/components/backoffice/BackofficeModals.tsx               (AlertDialog de confirmação)
src/components/solicitante/SolicitanteSolicitacaoCard.tsx    (botão lápis ao lado do ProjurisStatusCard)
src/components/solicitante/SolicitanteModals.tsx             (novo modal EditProjuris)
src/pages/MinhasSolicitacoes.tsx                             (state + wiring do modal)
```

### Fora do escopo
- Validação do formato do número Projuris (texto livre, igual ao Fluig).
- Notificação por e-mail/GChat ao solicitante quando o backoffice reverter (pode ser adicionado depois — por ora, apenas histórico/notification interna).