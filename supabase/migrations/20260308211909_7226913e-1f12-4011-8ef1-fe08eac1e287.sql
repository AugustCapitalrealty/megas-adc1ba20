
-- Add lida column to track read status
ALTER TABLE public.solicitacao_mensagens 
  ADD COLUMN lida boolean DEFAULT false;

-- Index for fast unread lookups
CREATE INDEX idx_mensagens_nao_lidas 
  ON public.solicitacao_mensagens(solicitacao_id, lida) 
  WHERE lida = false;

-- Allow message recipients to mark messages as read
-- Backoffice can update all messages
CREATE POLICY "Backoffice can update mensagens lida"
  ON public.solicitacao_mensagens
  FOR UPDATE
  TO authenticated
  USING (is_backoffice_or_admin(auth.uid()))
  WITH CHECK (is_backoffice_or_admin(auth.uid()));

-- Owners can update messages on their own solicitacoes
CREATE POLICY "Users can update mensagens on own solicitacoes"
  ON public.solicitacao_mensagens
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM solicitacoes s
    WHERE s.id = solicitacao_mensagens.solicitacao_id
      AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM solicitacoes s
    WHERE s.id = solicitacao_mensagens.solicitacao_id
      AND s.user_id = auth.uid()
  ));

-- Insert notification policy: allow system-triggered inserts for any user
-- We need backoffice to insert notifications for the solicitante (not themselves)
CREATE POLICY "Backoffice can insert notifications for others"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_backoffice_or_admin(auth.uid()));
