CREATE OR REPLACE FUNCTION public.enforce_solicitacao_anexos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  missing text[];
  should_check boolean := false;
BEGIN
  -- Bloqueia criação direta já ativa sem anexos obrigatórios.
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'rascunho'::request_status THEN
      should_check := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Bloqueia somente a promoção inicial do rascunho para qualquer status ativo.
    -- Fluxos posteriores do Backoffice (ex.: enviado_fornecedor -> concluida) não devem
    -- ser impedidos por pendências legadas de anexos já existentes.
    IF OLD.status = 'rascunho'::request_status
       AND NEW.status IS DISTINCT FROM 'rascunho'::request_status THEN
      should_check := true;
    END IF;
  END IF;

  IF NOT should_check THEN
    RETURN NEW;
  END IF;

  missing := public.solicitacao_missing_anexos(NEW);

  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'Envio bloqueado: anexos obrigatórios ausentes: %', array_to_string(missing, ', ')
      USING ERRCODE = 'check_violation',
            HINT = 'MISSING_ANEXOS:' || array_to_string(missing, ',');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_solicitacao_anexos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_solicitacao_anexos() TO service_role;