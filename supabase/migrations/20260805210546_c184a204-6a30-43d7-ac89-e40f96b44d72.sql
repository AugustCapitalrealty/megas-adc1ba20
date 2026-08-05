ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS valor_mensal numeric,
  ADD COLUMN IF NOT EXISTS data_dd date,
  ADD COLUMN IF NOT EXISTS data_vencimento date,
  ADD COLUMN IF NOT EXISTS criticidade_dd text,
  ADD COLUMN IF NOT EXISTS renovacao_automatica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_contratacao text,
  ADD COLUMN IF NOT EXISTS tem_sla boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS area_atendida text,
  ADD COLUMN IF NOT EXISTS detalhamento text,
  ADD COLUMN IF NOT EXISTS ultima_medicao date;

CREATE TABLE IF NOT EXISTS public.contrato_escopo_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL REFERENCES public.contrato_categorias(id) ON DELETE CASCADE,
  escopo text NOT NULL,
  item text,
  tipo text,
  frequencia text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_escopo_padrao TO authenticated;
GRANT ALL ON public.contrato_escopo_padrao TO service_role;

ALTER TABLE public.contrato_escopo_padrao ENABLE ROW LEVEL SECURITY;

CREATE POLICY escopo_padrao_select ON public.contrato_escopo_padrao
  FOR SELECT TO authenticated USING (has_app_access(auth.uid(), 'contratos'::app_key));
CREATE POLICY escopo_padrao_insert ON public.contrato_escopo_padrao
  FOR INSERT TO authenticated WITH CHECK (is_app_at_least(auth.uid(), 'contratos'::app_key, 'editor'::app_role_level));
CREATE POLICY escopo_padrao_update ON public.contrato_escopo_padrao
  FOR UPDATE TO authenticated USING (is_app_at_least(auth.uid(), 'contratos'::app_key, 'editor'::app_role_level));
CREATE POLICY escopo_padrao_delete ON public.contrato_escopo_padrao
  FOR DELETE TO authenticated USING (is_app_at_least(auth.uid(), 'contratos'::app_key, 'editor'::app_role_level));

CREATE TRIGGER trg_escopo_padrao_updated_at
  BEFORE UPDATE ON public.contrato_escopo_padrao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS contrato_escopo_padrao_uniq
  ON public.contrato_escopo_padrao (categoria_id, escopo, coalesce(item, ''));

INSERT INTO public.contrato_escopo_padrao (categoria_id, escopo, item, tipo, frequencia, ordem)
SELECT DISTINCT ON (c.categoria_id, e.escopo, coalesce(e.item, ''))
  c.categoria_id, e.escopo, e.item, e.tipo, e.frequencia, e.ordem
FROM public.contrato_escopos e
JOIN public.contratos c ON c.id = e.contrato_id
WHERE e.ativo
ORDER BY c.categoria_id, e.escopo, coalesce(e.item, ''), e.ordem
ON CONFLICT DO NOTHING;