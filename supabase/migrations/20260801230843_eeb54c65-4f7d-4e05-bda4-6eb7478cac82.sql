
CREATE TABLE public.contrato_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icone text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_categorias TO authenticated;
GRANT ALL ON public.contrato_categorias TO service_role;
ALTER TABLE public.contrato_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_select" ON public.contrato_categorias FOR SELECT TO authenticated
  USING (public.has_app_access(auth.uid(), 'contratos'));
CREATE POLICY "categorias_write" ON public.contrato_categorias FOR INSERT TO authenticated
  WITH CHECK (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));
CREATE POLICY "categorias_update" ON public.contrato_categorias FOR UPDATE TO authenticated
  USING (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));
CREATE POLICY "categorias_delete" ON public.contrato_categorias FOR DELETE TO authenticated
  USING (public.is_app_at_least(auth.uid(), 'contratos', 'admin'));

CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL REFERENCES public.contrato_categorias(id) ON DELETE CASCADE,
  empreendimento empreendimento NOT NULL,
  fornecedor_nome text NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  numero_contrato text,
  data_inicio date,
  prazo_meses integer,
  data_fim date,
  indeterminado boolean NOT NULL DEFAULT false,
  quantidade numeric,
  unidade text NOT NULL DEFAULT 'equipamentos',
  valor_contrato numeric,
  valor_por_unidade numeric,
  indice_reajuste text,
  mes_reajuste text,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
CREATE UNIQUE INDEX contratos_dedup_idx
  ON public.contratos (categoria_id, empreendimento, COALESCE(numero_contrato, fornecedor_nome));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contratos_select" ON public.contratos FOR SELECT TO authenticated
  USING (public.has_app_access(auth.uid(), 'contratos'));
CREATE POLICY "contratos_insert" ON public.contratos FOR INSERT TO authenticated
  WITH CHECK (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));
CREATE POLICY "contratos_update" ON public.contratos FOR UPDATE TO authenticated
  USING (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));
CREATE POLICY "contratos_delete" ON public.contratos FOR DELETE TO authenticated
  USING (public.is_app_at_least(auth.uid(), 'contratos', 'admin'));

CREATE TABLE public.contrato_escopos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  escopo text NOT NULL,
  item text,
  tipo text,
  frequencia text,
  observacao text,
  sla_horas numeric,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contrato_escopos_contrato_idx ON public.contrato_escopos(contrato_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_escopos TO authenticated;
GRANT ALL ON public.contrato_escopos TO service_role;
ALTER TABLE public.contrato_escopos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escopos_select" ON public.contrato_escopos FOR SELECT TO authenticated
  USING (public.has_app_access(auth.uid(), 'contratos'));
CREATE POLICY "escopos_insert" ON public.contrato_escopos FOR INSERT TO authenticated
  WITH CHECK (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));
CREATE POLICY "escopos_update" ON public.contrato_escopos FOR UPDATE TO authenticated
  USING (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));
CREATE POLICY "escopos_delete" ON public.contrato_escopos FOR DELETE TO authenticated
  USING (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));

CREATE TABLE public.contrato_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  escopo_id uuid NOT NULL REFERENCES public.contrato_escopos(id) ON DELETE CASCADE,
  competencia text NOT NULL,
  data_prevista date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  data_execucao date,
  responsavel text,
  observacao text,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX contrato_execucoes_unica ON public.contrato_execucoes(escopo_id, data_prevista);
CREATE INDEX contrato_execucoes_contrato_idx ON public.contrato_execucoes(contrato_id, competencia);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_execucoes TO authenticated;
GRANT ALL ON public.contrato_execucoes TO service_role;
ALTER TABLE public.contrato_execucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "execucoes_select" ON public.contrato_execucoes FOR SELECT TO authenticated
  USING (public.has_app_access(auth.uid(), 'contratos'));
CREATE POLICY "execucoes_insert" ON public.contrato_execucoes FOR INSERT TO authenticated
  WITH CHECK (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));
CREATE POLICY "execucoes_update" ON public.contrato_execucoes FOR UPDATE TO authenticated
  USING (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));
CREATE POLICY "execucoes_delete" ON public.contrato_execucoes FOR DELETE TO authenticated
  USING (public.is_app_at_least(auth.uid(), 'contratos', 'admin'));

CREATE TABLE public.contrato_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id uuid NOT NULL REFERENCES public.contrato_execucoes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'relatorio',
  nome_arquivo text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  tamanho_bytes integer,
  enviado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contrato_evidencias_execucao_idx ON public.contrato_evidencias(execucao_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_evidencias TO authenticated;
GRANT ALL ON public.contrato_evidencias TO service_role;
ALTER TABLE public.contrato_evidencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidencias_select" ON public.contrato_evidencias FOR SELECT TO authenticated
  USING (public.has_app_access(auth.uid(), 'contratos'));
CREATE POLICY "evidencias_insert" ON public.contrato_evidencias FOR INSERT TO authenticated
  WITH CHECK (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));
CREATE POLICY "evidencias_delete" ON public.contrato_evidencias FOR DELETE TO authenticated
  USING (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));

CREATE TABLE public.contrato_importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_nome text NOT NULL,
  resumo jsonb NOT NULL DEFAULT '{}'::jsonb,
  importado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.contrato_importacoes TO authenticated;
GRANT ALL ON public.contrato_importacoes TO service_role;
ALTER TABLE public.contrato_importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "importacoes_select" ON public.contrato_importacoes FOR SELECT TO authenticated
  USING (public.has_app_access(auth.uid(), 'contratos'));
CREATE POLICY "importacoes_insert" ON public.contrato_importacoes FOR INSERT TO authenticated
  WITH CHECK (public.is_app_at_least(auth.uid(), 'contratos', 'editor'));

CREATE TRIGGER trg_contrato_categorias_updated BEFORE UPDATE ON public.contrato_categorias
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_contratos_updated BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_contrato_escopos_updated BEFORE UPDATE ON public.contrato_escopos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_contrato_execucoes_updated BEFORE UPDATE ON public.contrato_execucoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.user_app_access (user_id, app, papel)
SELECT ur.user_id, 'contratos'::app_key, 'admin'::app_role_level
FROM public.user_roles ur
WHERE ur.role IN ('admin','super_admin')
ON CONFLICT DO NOTHING;
