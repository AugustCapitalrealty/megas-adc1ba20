-- Fix historical vacation-transfer assignments and optimize backoffice listing

-- 1) Correct previously inserted historico rows that used the admin user_id
UPDATE public.historico_solicitacoes h
SET user_id = t.to_user_id
FROM public.solicitacao_transfers t
WHERE t.solicitacao_id = h.solicitacao_id
  AND t.motivo = h.motivo
  AND h.acao = 'Assumido pelo backoffice'
  AND h.user_id = t.created_by
  AND h.created_at BETWEEN t.created_at - INTERVAL '5 minutes'
                       AND t.created_at + INTERVAL '5 minutes';

-- 2) Push responsible-user resolution into the RPC so the client does not need
--    to fetch and enrich hundreds of rows with separate historico/profile queries.
DROP FUNCTION IF EXISTS public.get_solicitacoes_backoffice(request_status, empreendimento, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_solicitacoes_backoffice(
  p_status request_status DEFAULT NULL::request_status,
  p_empreendimento empreendimento DEFAULT NULL::empreendimento,
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_responsavel_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  id uuid,
  protocolo text,
  tipo text,
  status request_status,
  empreendimento empreendimento,
  valor numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  descricao text,
  emergencial boolean,
  numero_chamado_fluig text,
  numero_projuris text,
  fornecedor_cnpj text,
  fornecedor_razao text,
  solicitante_nome text,
  solicitante_email text,
  cliente_nome text,
  total_anexos bigint,
  total_docs_fiscais bigint,
  total_docs_emitidos bigint,
  ultima_atualizacao_status timestamp with time zone,
  data_pendente_correcao timestamp with time zone,
  fornecedor_email_contato text,
  fornecedor_telefone_contato text,
  data_execucao_servico date,
  responsavel_id uuid,
  responsavel_nome text,
  data_aprovacao timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    s.id,
    s.protocolo,
    s.tipo::TEXT,
    s.status,
    s.empreendimento,
    s.valor,
    s.created_at,
    s.updated_at,
    LEFT(s.descricao, 200) as descricao,
    s.emergencial,
    s.numero_chamado_fluig,
    s.numero_projuris,
    f.cnpj as fornecedor_cnpj,
    COALESCE(f.nome_fantasia, f.razao_social) as fornecedor_razao,
    p.full_name as solicitante_nome,
    p.email as solicitante_email,
    c.nome as cliente_nome,
    (SELECT COUNT(*) FROM anexos a WHERE a.solicitacao_id = s.id) as total_anexos,
    (SELECT COUNT(*) FROM documentos_fiscais df WHERE df.solicitacao_id = s.id) as total_docs_fiscais,
    (SELECT COUNT(*) FROM documentos_emitidos de WHERE de.solicitacao_id = s.id) as total_docs_emitidos,
    (SELECT MAX(h.created_at) FROM historico_solicitacoes h WHERE h.solicitacao_id = s.id) as ultima_atualizacao_status,
    s.data_pendente_correcao,
    s.fornecedor_email_contato,
    s.fornecedor_telefone_contato,
    s.data_execucao_servico,
    bo.responsavel_id,
    COALESCE(rp.full_name, rp.email) as responsavel_nome,
    bo.data_aprovacao
  FROM solicitacoes s
  LEFT JOIN fornecedores f ON s.fornecedor_id = f.id
  LEFT JOIN profiles p ON s.user_id = p.id
  LEFT JOIN clientes c ON s.cliente_id = c.id
  LEFT JOIN LATERAL (
    SELECT
      h.user_id as responsavel_id,
      h.created_at as data_aprovacao
    FROM historico_solicitacoes h
    WHERE h.solicitacao_id = s.id
      AND h.acao = 'Assumido pelo backoffice'
    ORDER BY h.created_at DESC
    LIMIT 1
  ) bo ON true
  LEFT JOIN profiles rp ON rp.id = bo.responsavel_id
  WHERE
    (p_status IS NULL OR s.status = p_status)
    AND (p_empreendimento IS NULL OR s.empreendimento = p_empreendimento)
    AND (p_responsavel_id IS NULL OR bo.responsavel_id = p_responsavel_id)
    AND (
      p_search IS NULL
      OR s.protocolo ILIKE '%' || p_search || '%'
      OR s.descricao ILIKE '%' || p_search || '%'
      OR f.razao_social ILIKE '%' || p_search || '%'
      OR f.nome_fantasia ILIKE '%' || p_search || '%'
      OR f.cnpj ILIKE '%' || p_search || '%'
    )
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$function$;
