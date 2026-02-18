
CREATE OR REPLACE FUNCTION public.get_retrabalho_eficiencia(
  p_data_inicio timestamptz,
  p_data_fim timestamptz,
  p_empreendimento empreendimento DEFAULT NULL
)
RETURNS TABLE (retrabalho_count bigint, total_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH solicitacoes_com_doc AS (
    -- Solicitações que tiveram documento emitido no período filtrado
    SELECT DISTINCT de.solicitacao_id
    FROM documentos_emitidos de
    WHERE de.created_at >= p_data_inicio
      AND de.created_at <= p_data_fim
  ),
  solicitacoes_filtradas AS (
    -- Filtra pelo empreendimento se informado
    SELECT scd.solicitacao_id
    FROM solicitacoes_com_doc scd
    JOIN solicitacoes s ON s.id = scd.solicitacao_id
    WHERE (p_empreendimento IS NULL OR s.empreendimento = p_empreendimento)
  ),
  com_retrabalho AS (
    -- Dentre essas, quais tiveram ao menos um evento de pendente_correcao
    SELECT DISTINCT h.solicitacao_id
    FROM historico_solicitacoes h
    JOIN solicitacoes_filtradas sf ON sf.solicitacao_id = h.solicitacao_id
    WHERE h.status_novo = 'pendente_correcao'
  )
  SELECT
    (SELECT COUNT(*) FROM com_retrabalho) AS retrabalho_count,
    (SELECT COUNT(*) FROM solicitacoes_filtradas) AS total_count;
$$;
