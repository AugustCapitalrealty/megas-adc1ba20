-- =====================================================
-- 1. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_solicitacoes_status_created 
ON public.solicitacoes(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_empreendimento 
ON public.solicitacoes(empreendimento);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_user_id 
ON public.solicitacoes(user_id);

CREATE INDEX IF NOT EXISTS idx_historico_solicitacao_created 
ON public.historico_solicitacoes(solicitacao_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_anexos_solicitacao 
ON public.anexos(solicitacao_id);

CREATE INDEX IF NOT EXISTS idx_documentos_fiscais_solicitacao 
ON public.documentos_fiscais(solicitacao_id);

CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_solicitacao 
ON public.documentos_emitidos(solicitacao_id);

-- =====================================================
-- 2. TABELA DE TRANSIÇÕES VÁLIDAS DE STATUS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.status_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_from public.request_status NOT NULL,
  status_to public.request_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(status_from, status_to)
);

ALTER TABLE public.status_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read transitions" ON public.status_transitions
FOR SELECT USING (true);

-- =====================================================
-- 3. FUNÇÃO DE VALIDAÇÃO DE TRANSIÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.status_transitions
    WHERE status_from = OLD.status AND status_to = NEW.status
  ) THEN
    RAISE EXCEPTION 'Transição de status inválida: % -> %', OLD.status, NEW.status
      USING HINT = 'Verifique as transições permitidas na tabela status_transitions';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_status_transition_trigger ON public.solicitacoes;
CREATE TRIGGER validate_status_transition_trigger
  BEFORE UPDATE OF status ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_status_transition();

-- =====================================================
-- 4. RPC: LISTAGEM COMPACTA PARA BACKOFFICE
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_solicitacoes_backoffice(
  p_status public.request_status DEFAULT NULL,
  p_empreendimento public.empreendimento DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  protocolo TEXT,
  tipo TEXT,
  status public.request_status,
  empreendimento public.empreendimento,
  valor NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  descricao TEXT,
  emergencial BOOLEAN,
  numero_chamado_fluig TEXT,
  fornecedor_cnpj TEXT,
  fornecedor_razao TEXT,
  solicitante_nome TEXT,
  solicitante_email TEXT,
  cliente_nome TEXT,
  total_anexos BIGINT,
  total_docs_fiscais BIGINT,
  total_docs_emitidos BIGINT,
  ultima_atualizacao_status TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    f.cnpj as fornecedor_cnpj,
    COALESCE(f.nome_fantasia, f.razao_social) as fornecedor_razao,
    p.full_name as solicitante_nome,
    p.email as solicitante_email,
    c.nome as cliente_nome,
    (SELECT COUNT(*) FROM anexos a WHERE a.solicitacao_id = s.id) as total_anexos,
    (SELECT COUNT(*) FROM documentos_fiscais df WHERE df.solicitacao_id = s.id) as total_docs_fiscais,
    (SELECT COUNT(*) FROM documentos_emitidos de WHERE de.solicitacao_id = s.id) as total_docs_emitidos,
    (SELECT MAX(h.created_at) FROM historico_solicitacoes h WHERE h.solicitacao_id = s.id) as ultima_atualizacao_status
  FROM solicitacoes s
  LEFT JOIN fornecedores f ON s.fornecedor_id = f.id
  LEFT JOIN profiles p ON s.user_id = p.id
  LEFT JOIN clientes c ON s.cliente_id = c.id
  WHERE 
    (p_status IS NULL OR s.status = p_status)
    AND (p_empreendimento IS NULL OR s.empreendimento = p_empreendimento)
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
$$;

-- =====================================================
-- 5. RPC: DETALHES COMPLETOS (SOB DEMANDA)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_solicitacao_detalhes(p_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'solicitacao', (
      SELECT row_to_json(sol) FROM (
        SELECT 
          s.*,
          f.cnpj as fornecedor_cnpj,
          f.razao_social as fornecedor_razao,
          f.nome_fantasia as fornecedor_nome_fantasia,
          f.email as fornecedor_email,
          f.telefone as fornecedor_telefone,
          f.endereco as fornecedor_endereco,
          f.cidade as fornecedor_cidade,
          f.uf as fornecedor_uf,
          f.is_mei as fornecedor_is_mei,
          fc1.cnpj as concorrente1_cnpj,
          fc1.razao_social as concorrente1_razao,
          fc2.cnpj as concorrente2_cnpj,
          fc2.razao_social as concorrente2_razao
        FROM solicitacoes s
        LEFT JOIN fornecedores f ON s.fornecedor_id = f.id
        LEFT JOIN fornecedores fc1 ON s.fornecedor_concorrente_1_id = fc1.id
        LEFT JOIN fornecedores fc2 ON s.fornecedor_concorrente_2_id = fc2.id
        WHERE s.id = p_id
      ) sol
    ),
    'solicitante', (
      SELECT row_to_json(prof) FROM (
        SELECT p.id, p.email, p.full_name, p.avatar_url
        FROM profiles p
        WHERE p.id = (SELECT user_id FROM solicitacoes WHERE id = p_id)
      ) prof
    ),
    'cliente', (
      SELECT row_to_json(cli) FROM (
        SELECT c.id, c.nome
        FROM clientes c
        WHERE c.id = (SELECT cliente_id FROM solicitacoes WHERE id = p_id)
      ) cli
    ),
    'anexos', (
      SELECT COALESCE(json_agg(row_to_json(anx) ORDER BY anx.created_at), '[]'::json)
      FROM (
        SELECT id, tipo, nome_arquivo, storage_path, mime_type, tamanho_bytes, created_at
        FROM anexos WHERE solicitacao_id = p_id
      ) anx
    ),
    'documentos_emitidos', (
      SELECT COALESCE(json_agg(row_to_json(doc) ORDER BY doc.created_at DESC), '[]'::json)
      FROM (
        SELECT de.*, p.full_name as emitido_por_nome
        FROM documentos_emitidos de
        LEFT JOIN profiles p ON de.emitido_por = p.id
        WHERE de.solicitacao_id = p_id
      ) doc
    ),
    'documentos_fiscais', (
      SELECT COALESCE(json_agg(row_to_json(df) ORDER BY df.created_at DESC), '[]'::json)
      FROM (
        SELECT df.*, p.full_name as baixa_por_nome
        FROM documentos_fiscais df
        LEFT JOIN profiles p ON df.baixa_financeiro_por = p.id
        WHERE df.solicitacao_id = p_id
      ) df
    ),
    'historico', (
      SELECT COALESCE(json_agg(row_to_json(hist) ORDER BY hist.created_at DESC), '[]'::json)
      FROM (
        SELECT h.*, p.full_name as usuario_nome
        FROM historico_solicitacoes h
        LEFT JOIN profiles p ON h.user_id = p.id
        WHERE h.solicitacao_id = p_id
      ) hist
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- =====================================================
-- 6. RPC: CONTAGEM POR STATUS (PARA CARDS)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_solicitacoes_count_by_status()
RETURNS TABLE (
  status public.request_status,
  count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, COUNT(*) as count
  FROM solicitacoes
  GROUP BY status;
$$;