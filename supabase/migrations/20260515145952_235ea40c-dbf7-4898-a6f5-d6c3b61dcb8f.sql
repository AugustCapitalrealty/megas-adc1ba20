
-- 1. Tornar colunas nullable para permitir rascunho parcial
ALTER TABLE public.solicitacoes ALTER COLUMN descricao DROP NOT NULL;
ALTER TABLE public.solicitacoes ALTER COLUMN valor DROP NOT NULL;
ALTER TABLE public.solicitacoes ALTER COLUMN tipo DROP NOT NULL;
ALTER TABLE public.solicitacoes ALTER COLUMN natureza_orcamentaria DROP NOT NULL;

-- 2. Trigger set_protocolo: não gerar protocolo para rascunho
CREATE OR REPLACE FUNCTION public.set_protocolo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Rascunho não recebe protocolo
  IF NEW.status = 'rascunho'::request_status THEN
    RETURN NEW;
  END IF;
  -- Sempre gerar protocolo se vier nulo ou vazio
  IF NEW.protocolo IS NULL OR btrim(NEW.protocolo) = '' THEN
    NEW.protocolo := public.generate_protocolo();
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Trigger notify_new_solicitacao: pular rascunho
CREATE OR REPLACE FUNCTION public.notify_new_solicitacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'rascunho'::request_status THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
  VALUES (
    NEW.user_id,
    'info',
    'Solicitação Criada',
    'Sua solicitação ' || NEW.protocolo || ' foi criada e está sendo processada.',
    NEW.id
  );
  RETURN NEW;
END;
$function$;

-- 4. Quando rascunho vira "recebido", gerar protocolo e notificar criação
CREATE OR REPLACE FUNCTION public.handle_rascunho_envio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'rascunho'::request_status AND NEW.status <> 'rascunho'::request_status THEN
    IF NEW.protocolo IS NULL OR btrim(NEW.protocolo) = '' THEN
      NEW.protocolo := public.generate_protocolo();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_handle_rascunho_envio ON public.solicitacoes;
CREATE TRIGGER trg_handle_rascunho_envio
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_rascunho_envio();

-- 5. RLS: ocultar rascunhos do empreendimento (dono continua vendo via "Users can view own solicitacoes")
DROP POLICY IF EXISTS "Users can view solicitacoes from their empreendimento" ON public.solicitacoes;
CREATE POLICY "Users can view solicitacoes from their empreendimento"
  ON public.solicitacoes
  FOR SELECT
  USING (
    status <> 'rascunho'::request_status
    AND EXISTS (
      SELECT 1 FROM user_empreendimentos ue
      WHERE ue.user_id = auth.uid()
        AND (ue.empreendimento = solicitacoes.empreendimento OR ue.empreendimento = 'todos'::empreendimento)
    )
  );

-- 6. RLS: ocultar rascunhos do backoffice
DROP POLICY IF EXISTS "Backoffice can view all solicitacoes" ON public.solicitacoes;
CREATE POLICY "Backoffice can view all solicitacoes"
  ON public.solicitacoes
  FOR SELECT
  USING (is_backoffice_or_admin(auth.uid()) AND status <> 'rascunho'::request_status);

-- 7. RLS: dono pode atualizar e deletar seu rascunho
DROP POLICY IF EXISTS "Users can update own rascunho" ON public.solicitacoes;
CREATE POLICY "Users can update own rascunho"
  ON public.solicitacoes
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'rascunho'::request_status)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own rascunho" ON public.solicitacoes;
CREATE POLICY "Users can delete own rascunho"
  ON public.solicitacoes
  FOR DELETE
  USING (auth.uid() = user_id AND status = 'rascunho'::request_status);

-- 8. Anexos: dono pode deletar anexos do próprio rascunho (já existe DELETE policy do dono — confirmando)
-- (sem alteração necessária)

-- 9. RPC backoffice: ignorar rascunhos
DROP FUNCTION IF EXISTS public.get_solicitacoes_backoffice(request_status, empreendimento, text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_solicitacoes_backoffice(
  p_status request_status DEFAULT NULL::request_status,
  p_empreendimento empreendimento DEFAULT NULL::empreendimento,
  p_search text DEFAULT NULL::text,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, protocolo text, tipo text, status request_status, empreendimento empreendimento,
  valor numeric, created_at timestamp with time zone, updated_at timestamp with time zone,
  descricao text, emergencial boolean, numero_chamado_fluig text, numero_projuris text,
  fornecedor_cnpj text, fornecedor_razao text, solicitante_nome text, solicitante_email text,
  cliente_nome text, total_anexos bigint, total_docs_fiscais bigint, total_docs_emitidos bigint,
  ultima_atualizacao_status timestamp with time zone, data_pendente_correcao timestamp with time zone,
  fornecedor_email_contato text, fornecedor_telefone_contato text, data_execucao_servico date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    s.id, s.protocolo, s.tipo::TEXT, s.status, s.empreendimento, s.valor, s.created_at, s.updated_at,
    LEFT(s.descricao, 200) as descricao, s.emergencial, s.numero_chamado_fluig, s.numero_projuris,
    f.cnpj as fornecedor_cnpj, COALESCE(f.nome_fantasia, f.razao_social) as fornecedor_razao,
    p.full_name as solicitante_nome, p.email as solicitante_email, c.nome as cliente_nome,
    (SELECT COUNT(*) FROM anexos a WHERE a.solicitacao_id = s.id) as total_anexos,
    (SELECT COUNT(*) FROM documentos_fiscais df WHERE df.solicitacao_id = s.id) as total_docs_fiscais,
    (SELECT COUNT(*) FROM documentos_emitidos de WHERE de.solicitacao_id = s.id) as total_docs_emitidos,
    (SELECT MAX(h.created_at) FROM historico_solicitacoes h WHERE h.solicitacao_id = s.id) as ultima_atualizacao_status,
    s.data_pendente_correcao, s.fornecedor_email_contato, s.fornecedor_telefone_contato, s.data_execucao_servico
  FROM solicitacoes s
  LEFT JOIN fornecedores f ON s.fornecedor_id = f.id
  LEFT JOIN profiles p ON s.user_id = p.id
  LEFT JOIN clientes c ON s.cliente_id = c.id
  WHERE
    s.status <> 'rascunho'::request_status
    AND (p_status IS NULL OR s.status = p_status)
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
  LIMIT p_limit OFFSET p_offset;
$function$;

-- 10. RPC contagens: ignorar rascunhos
CREATE OR REPLACE FUNCTION public.get_solicitacoes_count_by_status()
RETURNS TABLE (status public.request_status, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT status, COUNT(*) as count
  FROM solicitacoes
  WHERE status <> 'rascunho'::request_status
  GROUP BY status;
$$;
