-- Energia Rateio: monthly competências, tarifas snapshot, and per-module lançamentos

CREATE TABLE public.energia_competencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano_mes text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'rascunho',
  observacao text,
  fechada_em timestamptz,
  fechada_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT energia_competencias_status_chk CHECK (status IN ('rascunho','fechada')),
  CONSTRAINT energia_competencias_ano_mes_chk CHECK (ano_mes ~ '^[0-9]{4}-[0-9]{2}$')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energia_competencias TO authenticated;
GRANT ALL ON public.energia_competencias TO service_role;
ALTER TABLE public.energia_competencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view energia_competencias" ON public.energia_competencias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage energia_competencias" ON public.energia_competencias
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_energia_competencias_updated_at BEFORE UPDATE ON public.energia_competencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.energia_competencia_tarifas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_id uuid NOT NULL UNIQUE REFERENCES public.energia_competencias(id) ON DELETE CASCADE,
  demanda_usd numeric NOT NULL DEFAULT 0,
  demanda_isenta numeric NOT NULL DEFAULT 0,
  ultrapassagem numeric NOT NULL DEFAULT 0,
  te_ponta numeric NOT NULL DEFAULT 0,
  tusd_ponta numeric NOT NULL DEFAULT 0,
  te_fora numeric NOT NULL DEFAULT 0,
  tusd_fora numeric NOT NULL DEFAULT 0,
  iluminacao_publica numeric NOT NULL DEFAULT 0,
  pis_pct numeric NOT NULL DEFAULT 0,
  cofins_pct numeric NOT NULL DEFAULT 0,
  icms_pct numeric NOT NULL DEFAULT 0,
  bandeira_valor numeric NOT NULL DEFAULT 0,
  perdas_copel_ponta_kwh numeric NOT NULL DEFAULT 0,
  perdas_copel_fora_kwh numeric NOT NULL DEFAULT 0,
  perdas_energy_ponta_kwh numeric NOT NULL DEFAULT 0,
  perdas_energy_fora_kwh numeric NOT NULL DEFAULT 0,
  cred_deb_fatura numeric NOT NULL DEFAULT 0,
  fotovoltaico_saldo_ponta numeric NOT NULL DEFAULT 0,
  fotovoltaico_geracao_ponta numeric NOT NULL DEFAULT 0,
  fotovoltaico_saldo_fora numeric NOT NULL DEFAULT 0,
  fotovoltaico_geracao_fora numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energia_competencia_tarifas TO authenticated;
GRANT ALL ON public.energia_competencia_tarifas TO service_role;
ALTER TABLE public.energia_competencia_tarifas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view energia_competencia_tarifas" ON public.energia_competencia_tarifas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage energia_competencia_tarifas" ON public.energia_competencia_tarifas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_energia_competencia_tarifas_updated_at BEFORE UPDATE ON public.energia_competencia_tarifas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.energia_competencia_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_id uuid NOT NULL REFERENCES public.energia_competencias(id) ON DELETE CASCADE,
  modulo_id uuid NOT NULL REFERENCES public.energia_modulos(id) ON DELETE CASCADE,
  demanda_contratada_kw numeric NOT NULL DEFAULT 0,
  demanda_usd_medida_kw numeric NOT NULL DEFAULT 0,
  consumo_ponta_kwh numeric NOT NULL DEFAULT 0,
  consumo_fora_kwh numeric NOT NULL DEFAULT 0,
  ajuste_manual_reais numeric NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (competencia_id, modulo_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energia_competencia_lancamentos TO authenticated;
GRANT ALL ON public.energia_competencia_lancamentos TO service_role;
ALTER TABLE public.energia_competencia_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view energia_competencia_lancamentos" ON public.energia_competencia_lancamentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage energia_competencia_lancamentos" ON public.energia_competencia_lancamentos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_energia_competencia_lancamentos_updated_at BEFORE UPDATE ON public.energia_competencia_lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_energia_lanc_comp ON public.energia_competencia_lancamentos(competencia_id);
CREATE INDEX idx_energia_lanc_mod ON public.energia_competencia_lancamentos(modulo_id);