-- Create messages table for solicitation comments/messages
CREATE TABLE public.solicitacao_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solicitacao_mensagens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages on their own solicitations
CREATE POLICY "Users can view messages on own solicitacoes"
ON public.solicitacao_mensagens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM solicitacoes s
    WHERE s.id = solicitacao_mensagens.solicitacao_id
    AND s.user_id = auth.uid()
  )
);

-- Policy: Backoffice can view all messages
CREATE POLICY "Backoffice can view all messages"
ON public.solicitacao_mensagens
FOR SELECT
USING (is_backoffice_or_admin(auth.uid()));

-- Policy: Users can insert messages on their own solicitations
CREATE POLICY "Users can insert messages on own solicitacoes"
ON public.solicitacao_mensagens
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM solicitacoes s
    WHERE s.id = solicitacao_mensagens.solicitacao_id
    AND s.user_id = auth.uid()
  )
);

-- Policy: Backoffice can insert messages on any solicitation
CREATE POLICY "Backoffice can insert messages"
ON public.solicitacao_mensagens
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  is_backoffice_or_admin(auth.uid())
);

-- Create index for performance
CREATE INDEX idx_solicitacao_mensagens_solicitacao_id ON public.solicitacao_mensagens(solicitacao_id);
CREATE INDEX idx_solicitacao_mensagens_created_at ON public.solicitacao_mensagens(created_at);