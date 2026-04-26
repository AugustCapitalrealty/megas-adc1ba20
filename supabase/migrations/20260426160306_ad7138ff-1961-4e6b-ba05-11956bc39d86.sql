-- Tabela error_logs para captura tipo Sentry (sem dependência externa)
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  stack text,
  source text,
  url text,
  user_agent text,
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('error','warning','fatal')),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  fingerprint text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON public.error_logs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON public.error_logs(user_id);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode inserir seu próprio erro (ou erro anônimo se user_id null)
CREATE POLICY "Anyone can insert error logs"
  ON public.error_logs FOR INSERT
  TO authenticated, anon
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Apenas admins veem
CREATE POLICY "Admins can view error logs"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Apenas admins resolvem
CREATE POLICY "Admins can update error logs"
  ON public.error_logs FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
