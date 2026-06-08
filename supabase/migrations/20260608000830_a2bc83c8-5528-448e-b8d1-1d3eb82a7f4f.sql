
-- Trigger function reuse (create if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1) energia_clientes
CREATE TABLE public.energia_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energia_clientes TO authenticated;
GRANT ALL ON public.energia_clientes TO service_role;
ALTER TABLE public.energia_clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view energia_clientes" ON public.energia_clientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage energia_clientes" ON public.energia_clientes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_energia_clientes_updated_at
  BEFORE UPDATE ON public.energia_clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) energia_modulos
CREATE TABLE public.energia_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identificador text NOT NULL,
  area_m2 numeric NOT NULL DEFAULT 0,
  cliente_id uuid REFERENCES public.energia_clientes(id) ON DELETE SET NULL,
  demanda_contratada_kw numeric NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
CREATE INDEX idx_energia_modulos_cliente ON public.energia_modulos(cliente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energia_modulos TO authenticated;
GRANT ALL ON public.energia_modulos TO service_role;
ALTER TABLE public.energia_modulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view energia_modulos" ON public.energia_modulos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage energia_modulos" ON public.energia_modulos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_energia_modulos_updated_at
  BEFORE UPDATE ON public.energia_modulos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) energia_parametros (singleton)
CREATE TABLE public.energia_parametros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  icms_pct numeric NOT NULL DEFAULT 19,
  pis_pct numeric NOT NULL DEFAULT 1.65,
  cofins_pct numeric NOT NULL DEFAULT 7.6,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT energia_parametros_singleton_chk CHECK (singleton = true)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energia_parametros TO authenticated;
GRANT ALL ON public.energia_parametros TO service_role;
ALTER TABLE public.energia_parametros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view energia_parametros" ON public.energia_parametros
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage energia_parametros" ON public.energia_parametros
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_energia_parametros_updated_at
  BEFORE UPDATE ON public.energia_parametros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.energia_parametros (singleton) VALUES (true);
