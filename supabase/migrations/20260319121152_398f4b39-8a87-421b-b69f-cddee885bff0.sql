CREATE OR REPLACE FUNCTION public.insert_historico_admin(
  p_solicitacao_id uuid,
  p_user_id uuid,
  p_acao text,
  p_status_anterior text DEFAULT NULL,
  p_status_novo text DEFAULT NULL,
  p_motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_backoffice_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  INSERT INTO historico_solicitacoes (solicitacao_id, user_id, acao, status_anterior, status_novo, motivo)
  VALUES (p_solicitacao_id, p_user_id, p_acao, p_status_anterior::request_status, p_status_novo::request_status, p_motivo);
END;
$$;