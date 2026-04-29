-- 1) Valor da requisição (opcional)
ALTER TABLE public.projuris_requisicoes
  ADD COLUMN IF NOT EXISTS valor numeric;

-- 2) Histórico de ações do backoffice
CREATE TABLE IF NOT EXISTS public.projuris_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id uuid NOT NULL REFERENCES public.projuris_requisicoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  acao text NOT NULL,
  observacao text,
  status_anterior text,
  status_novo text,
  proxima_revisao date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projuris_acoes_req_created
  ON public.projuris_acoes (requisicao_id, created_at DESC);

ALTER TABLE public.projuris_acoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Backoffice can view all projuris_acoes" ON public.projuris_acoes;
CREATE POLICY "Backoffice can view all projuris_acoes"
  ON public.projuris_acoes FOR SELECT TO authenticated
  USING (public.is_backoffice_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Backoffice can insert projuris_acoes" ON public.projuris_acoes;
CREATE POLICY "Backoffice can insert projuris_acoes"
  ON public.projuris_acoes FOR INSERT TO authenticated
  WITH CHECK (public.is_backoffice_or_admin(auth.uid()) AND auth.uid() = user_id);