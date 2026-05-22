CREATE TABLE public.monitoramento_oc_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_corte_justificativa integer NOT NULL DEFAULT 23 CHECK (dia_corte_justificativa BETWEEN 1 AND 28),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.monitoramento_oc_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view monitoramento_oc_config"
  ON public.monitoramento_oc_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Backoffice can insert monitoramento_oc_config"
  ON public.monitoramento_oc_config FOR INSERT TO authenticated
  WITH CHECK (public.is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Backoffice can update monitoramento_oc_config"
  ON public.monitoramento_oc_config FOR UPDATE TO authenticated
  USING (public.is_backoffice_or_admin(auth.uid()))
  WITH CHECK (public.is_backoffice_or_admin(auth.uid()));

INSERT INTO public.monitoramento_oc_config (dia_corte_justificativa) VALUES (23);