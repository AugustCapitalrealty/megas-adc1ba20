-- 1) Atualiza a função para normalizar e tratar "0"/vazio como remoção
create or replace function public.update_numero_projuris(
  p_solicitacao_id uuid,
  p_numero_projuris text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
  v_status request_status;
  v_owner uuid;
  v_new text;
  v_acao text;
  v_motivo text;
begin
  select numero_projuris, status, user_id
    into v_old, v_status, v_owner
  from public.solicitacoes
  where id = p_solicitacao_id;

  if v_owner is null then
    raise exception 'Solicitação não encontrada';
  end if;

  if not (auth.uid() = v_owner or public.is_backoffice_or_admin(auth.uid())) then
    raise exception 'Sem permissão para alterar o número Projuris';
  end if;

  -- Normaliza: trim, remove zeros à esquerda, trata "0" e vazio como NULL
  v_new := nullif(trim(coalesce(p_numero_projuris, '')), '');
  if v_new is not null then
    -- remove zeros à esquerda apenas se for puramente numérico
    if v_new ~ '^[0-9]+$' then
      v_new := ltrim(v_new, '0');
      if v_new = '' then
        v_new := null; -- "0", "00", etc => remoção
      end if;
    end if;
  end if;

  if v_new is not distinct from v_old then
    return;
  end if;

  update public.solicitacoes
     set numero_projuris = v_new
   where id = p_solicitacao_id;

  if v_old is null and v_new is not null then
    v_acao := 'numero_projuris_adicionado';
    v_motivo := 'Número Projuris ' || v_new || ' adicionado';
  elsif v_old is not null and v_new is null then
    v_acao := 'numero_projuris_removido';
    v_motivo := 'Número Projuris ' || v_old || ' removido';
  else
    v_acao := 'numero_projuris_alterado';
    v_motivo := 'Número Projuris alterado de ' || v_old || ' para ' || v_new;
  end if;

  insert into public.historico_solicitacoes (
    solicitacao_id, user_id, acao, motivo, status_anterior, status_novo
  ) values (
    p_solicitacao_id, auth.uid(), v_acao, v_motivo, v_status, v_status
  );
end;
$$;

revoke execute on function public.update_numero_projuris(uuid, text) from public;
revoke execute on function public.update_numero_projuris(uuid, text) from anon;
grant execute on function public.update_numero_projuris(uuid, text) to authenticated;

-- 2) Limpeza dos registros existentes com Projuris inválido ('0', '00', vazio, espaços)
update public.solicitacoes
   set numero_projuris = null
 where numero_projuris is not null
   and (
        trim(numero_projuris) = ''
     or numero_projuris ~ '^0+$'
   );