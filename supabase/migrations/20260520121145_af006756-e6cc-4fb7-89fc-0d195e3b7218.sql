
CREATE TABLE public.solicitacao_draft_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL,
  user_id uuid NOT NULL,
  evento text NOT NULL,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_draft_audit_solicitacao ON public.solicitacao_draft_audit(solicitacao_id);
CREATE INDEX idx_draft_audit_user ON public.solicitacao_draft_audit(user_id);
CREATE INDEX idx_draft_audit_evento ON public.solicitacao_draft_audit(evento);

ALTER TABLE public.solicitacao_draft_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own draft audit"
ON public.solicitacao_draft_audit
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own draft audit"
ON public.solicitacao_draft_audit
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Backoffice can view all draft audit"
ON public.solicitacao_draft_audit
FOR SELECT
TO authenticated
USING (is_backoffice_or_admin(auth.uid()));
