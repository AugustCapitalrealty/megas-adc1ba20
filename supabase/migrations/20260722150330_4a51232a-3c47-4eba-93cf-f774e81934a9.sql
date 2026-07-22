
-- Função que devolve tipos de anexos obrigatórios ausentes para uma solicitação.
CREATE OR REPLACE FUNCTION public.solicitacao_missing_anexos(sol public.solicitacoes)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  required text[] := ARRAY[]::text[];
  present text[];
  missing text[];
  is_agua_energia boolean;
BEGIN
  is_agua_energia := sol.natureza_orcamentaria IN ('agua','energia_eletrica');

  IF sol.tipo = 'OC' THEN
    IF is_agua_energia THEN
      required := array_append(required, 'fatura_agua_energia');
    ELSE
      required := array_append(required, 'orcamento_escolhido');
    END IF;
  ELSIF sol.tipo = 'AC' THEN
    IF sol.emergencial THEN
      required := array_append(required, 'orcamento_escolhido');
    ELSE
      required := array_append(required, 'orcamento_escolhido');
      IF sol.justificativa_sem_memorial IS NULL OR btrim(sol.justificativa_sem_memorial) = '' THEN
        required := array_append(required, 'escopo_detalhado');
      END IF;
      IF COALESCE(sol.excecao_fornecedores, false) OR COALESCE(sol.fornecimento_exclusivo, false) THEN
        required := array_append(required, 'justificativa_anexo');
      ELSE
        required := required
          || ARRAY['orcamento_concorrente_1','orcamento_concorrente_2','mapa_cotacao'];
      END IF;
    END IF;
    IF is_agua_energia THEN
      required := array_append(required, 'fatura_agua_energia');
    END IF;
  END IF;

  IF sol.origem_custo = 'cliente' THEN
    required := array_append(required, 'comunicado_cliente');
  END IF;

  SELECT COALESCE(array_agg(DISTINCT tipo), ARRAY[]::text[])
    INTO present
    FROM public.anexos
   WHERE solicitacao_id = sol.id;

  SELECT COALESCE(array_agg(r), ARRAY[]::text[])
    INTO missing
    FROM unnest(required) AS r
   WHERE r <> ALL(present);

  RETURN missing;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.solicitacao_missing_anexos(public.solicitacoes) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solicitacao_missing_anexos(public.solicitacoes) TO authenticated, service_role;

-- Trigger que impede uma solicitação de virar "ativa" sem os anexos obrigatórios.
-- Roda em BEFORE INSERT (quando já entra ativa) e BEFORE UPDATE (promoção de rascunho).
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
  -- Só valida na transição para status ativos (fora de rascunho).
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'rascunho'::request_status THEN
      should_check := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
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

DROP TRIGGER IF EXISTS trg_enforce_solicitacao_anexos_ins ON public.solicitacoes;
DROP TRIGGER IF EXISTS trg_enforce_solicitacao_anexos_upd ON public.solicitacoes;

CREATE TRIGGER trg_enforce_solicitacao_anexos_ins
BEFORE INSERT ON public.solicitacoes
FOR EACH ROW EXECUTE FUNCTION public.enforce_solicitacao_anexos();

CREATE TRIGGER trg_enforce_solicitacao_anexos_upd
BEFORE UPDATE OF status ON public.solicitacoes
FOR EACH ROW EXECUTE FUNCTION public.enforce_solicitacao_anexos();
