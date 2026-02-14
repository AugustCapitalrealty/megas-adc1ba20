
-- Tabela de log de transferências de titularidade
CREATE TABLE public.solicitacao_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  motivo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

ALTER TABLE public.solicitacao_transfers ENABLE ROW LEVEL SECURITY;

-- Backoffice e admin podem ver todos os logs
CREATE POLICY "Backoffice can view all transfers"
  ON public.solicitacao_transfers FOR SELECT
  TO authenticated
  USING (is_backoffice_or_admin(auth.uid()));

-- Usuarios podem ver transfers de suas solicitacoes
CREATE POLICY "Users can view own transfers"
  ON public.solicitacao_transfers FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Inserir: quem tem acesso a solicitacao pode transferir
CREATE POLICY "Authorized users can insert transfers"
  ON public.solicitacao_transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND (
      is_backoffice_or_admin(auth.uid())
      OR user_can_access_solicitacao(solicitacao_id)
    )
  );

-- Política para permitir transferência de titularidade (update do user_id)
-- Admin/backoffice ou usuarios com acesso ao empreendimento podem transferir
CREATE POLICY "Transfer ownership of solicitacoes"
  ON public.solicitacoes FOR UPDATE
  TO authenticated
  USING (
    user_can_access_solicitacao(id)
  )
  WITH CHECK (true);
