
-- =====================================================
-- 1. PROFILES: hide email from non-self via column grants
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated can view profile rows"
  ON public.profiles FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, avatar_url, approved, created_at, updated_at, onboarding_completed_at, receber_notificacoes_email)
  ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

-- =====================================================
-- 2. FORNECEDORES: restrict sensitive columns to backoffice/admin via column grants
-- =====================================================
REVOKE SELECT ON public.fornecedores FROM authenticated;
GRANT SELECT (
  id, cnpj, razao_social, nome_fantasia, cidade, uf,
  is_mei, tipo_fornecedor, pais,
  situacao_cadastral, situacao_cadastral_descricao,
  cnae_principal_codigo, cnae_principal_descricao, cnaes_secundarios,
  data_situacao_cadastral, data_inicio_atividade,
  moeda_padrao, created_at, updated_at
) ON public.fornecedores TO authenticated;
GRANT SELECT ON public.fornecedores TO service_role;

-- RPC for backoffice/admin to fetch sensitive fornecedor data
CREATE OR REPLACE FUNCTION public.get_fornecedor_full(p_id uuid)
RETURNS public.fornecedores
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.fornecedores;
BEGIN
  IF NOT public.is_backoffice_or_admin(auth.uid()) THEN
    -- allow owners of a solicitation referencing this fornecedor
    IF NOT EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.user_id = auth.uid()
        AND (s.fornecedor_id = p_id OR s.fornecedor_concorrente_1_id = p_id OR s.fornecedor_concorrente_2_id = p_id)
    ) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  END IF;
  SELECT * INTO v_row FROM public.fornecedores WHERE id = p_id;
  RETURN v_row;
END;
$$;

-- =====================================================
-- 3. ENERGIA_CLIENTES: restrict view to backoffice/admin
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can view energia_clientes" ON public.energia_clientes;
CREATE POLICY "Backoffice/admin can view energia_clientes"
  ON public.energia_clientes FOR SELECT TO authenticated
  USING (public.is_backoffice_or_admin(auth.uid()));

-- =====================================================
-- 4. PROJURIS_REQUISICOES: restrict view to backoffice/admin
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view projuris_requisicoes" ON public.projuris_requisicoes;
CREATE POLICY "Backoffice/admin can view projuris_requisicoes"
  ON public.projuris_requisicoes FOR SELECT TO authenticated
  USING (public.is_backoffice_or_admin(auth.uid()));

-- =====================================================
-- 5. Revoke EXECUTE on SECURITY DEFINER functions from PUBLIC/anon
-- =====================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;

-- Re-grant EXECUTE to authenticated for RPCs that the client calls
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fornecedor_full(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_solicitacao_detalhes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_solicitacoes_count_by_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sla_timeline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fluig_filter_options() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_empreendimentos(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_health_cron() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_health_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_backoffice_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_solicitacao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_solicitacao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_empreendimento(uuid, empreendimento) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_fluig_empreendimento(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_numero_projuris(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_historico_admin(uuid, uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.energia_grandeza_vigente(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_sla_solicitacao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_dias_uteis(timestamptz, timestamptz) TO authenticated;

-- get_solicitacoes_backoffice, get_sla_dashboard, get_retrabalho_eficiencia have complex signatures with defaults
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_solicitacoes_backoffice','get_sla_dashboard','get_retrabalho_eficiencia')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;

-- =====================================================
-- 6. Fix mutable search_path
-- =====================================================
ALTER FUNCTION public.energia_proximo_ano_mes(text) SET search_path = public;
