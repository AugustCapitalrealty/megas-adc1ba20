
-- RPC: get_fluig_filter_options
-- Returns distinct values for each filter field, avoiding full table scan
CREATE OR REPLACE FUNCTION public.get_fluig_filter_options()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'empreendimentos', (SELECT COALESCE(json_agg(DISTINCT empreendimento ORDER BY empreendimento), '[]'::json) FROM fluig_painel_snapshot WHERE empreendimento IS NOT NULL),
    'situacoes', (SELECT COALESCE(json_agg(DISTINCT situacao ORDER BY situacao), '[]'::json) FROM fluig_painel_snapshot WHERE situacao IS NOT NULL),
    'localizacoes', (SELECT COALESCE(json_agg(DISTINCT localizacao ORDER BY localizacao), '[]'::json) FROM fluig_painel_snapshot WHERE localizacao IS NOT NULL),
    'responsaveis', (SELECT COALESCE(json_agg(DISTINCT responsavel_atual ORDER BY responsavel_atual), '[]'::json) FROM fluig_painel_snapshot WHERE responsavel_atual IS NOT NULL)
  );
$$;
