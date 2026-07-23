CREATE OR REPLACE FUNCTION public.solicitacao_missing_anexos(sol solicitacoes)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  required text[] := ARRAY[]::text[];
  present text[];
  missing text[];
  is_agua_energia boolean;
  MODULO_VAGO_ID constant uuid := '83739dae-d131-41df-8c15-a6fa1cead116';
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

  -- Comunicado ao Cliente só é exigido quando o custo é rateado para um cliente real.
  -- Módulo Vago não é cliente real, então não precisa de comunicado.
  IF sol.origem_custo = 'cliente' AND sol.cliente_id IS DISTINCT FROM MODULO_VAGO_ID THEN
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
$function$;