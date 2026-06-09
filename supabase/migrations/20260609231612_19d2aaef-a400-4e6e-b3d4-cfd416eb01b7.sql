
-- 1) Clientes: adicionar CNPJ e dados fiscais
ALTER TABLE public.energia_clientes
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS uf text;

CREATE UNIQUE INDEX IF NOT EXISTS energia_clientes_cnpj_uniq
  ON public.energia_clientes (cnpj) WHERE cnpj IS NOT NULL;

-- 2) Contratos de Energia
CREATE TABLE IF NOT EXISTS public.energia_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato text NOT NULL UNIQUE,
  cliente_id uuid NOT NULL REFERENCES public.energia_clientes(id) ON DELETE RESTRICT,
  demanda_contratada_kw numeric NOT NULL DEFAULT 0,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  termo_demanda_path text,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.energia_contratos TO authenticated;
GRANT ALL ON public.energia_contratos TO service_role;

ALTER TABLE public.energia_contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view energia_contratos"
  ON public.energia_contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage energia_contratos"
  ON public.energia_contratos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_energia_contratos_updated_at
  BEFORE UPDATE ON public.energia_contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_energia_contratos_cliente ON public.energia_contratos(cliente_id);

-- 3) Vínculo Contrato × Módulos com vigência
CREATE TABLE IF NOT EXISTS public.energia_contrato_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.energia_contratos(id) ON DELETE CASCADE,
  modulo_id uuid NOT NULL REFERENCES public.energia_modulos(id) ON DELETE CASCADE,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.energia_contrato_modulos TO authenticated;
GRANT ALL ON public.energia_contrato_modulos TO service_role;

ALTER TABLE public.energia_contrato_modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view energia_contrato_modulos"
  ON public.energia_contrato_modulos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage energia_contrato_modulos"
  ON public.energia_contrato_modulos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_energia_contrato_modulos_updated_at
  BEFORE UPDATE ON public.energia_contrato_modulos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ecm_modulo ON public.energia_contrato_modulos(modulo_id);
CREATE INDEX IF NOT EXISTS idx_ecm_contrato ON public.energia_contrato_modulos(contrato_id);

-- Trigger anti-sobreposição: mesmo módulo não pode ter 2 vínculos com janelas sobrepostas
CREATE OR REPLACE FUNCTION public.check_energia_contrato_modulos_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.energia_contrato_modulos x
    WHERE x.modulo_id = NEW.modulo_id
      AND x.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND daterange(x.vigencia_inicio, COALESCE(x.vigencia_fim, 'infinity'::date), '[]')
          && daterange(NEW.vigencia_inicio, COALESCE(NEW.vigencia_fim, 'infinity'::date), '[]')
  ) THEN
    RAISE EXCEPTION 'Vínculo sobreposto: módulo já tem outro contrato ativo neste período';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ecm_no_overlap
  BEFORE INSERT OR UPDATE ON public.energia_contrato_modulos
  FOR EACH ROW EXECUTE FUNCTION public.check_energia_contrato_modulos_overlap();

-- 4) Storage policies para bucket privado energia-contratos
CREATE POLICY "Admins read energia-contratos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'energia-contratos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert energia-contratos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'energia-contratos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update energia-contratos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'energia-contratos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete energia-contratos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'energia-contratos' AND has_role(auth.uid(), 'admin'::app_role));
