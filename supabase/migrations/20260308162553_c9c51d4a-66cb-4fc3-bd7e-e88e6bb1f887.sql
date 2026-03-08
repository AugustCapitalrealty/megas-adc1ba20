
-- Create acompanhamento_juridico table
CREATE TABLE public.acompanhamento_juridico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  etapa text NOT NULL,
  observacao text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.acompanhamento_juridico ENABLE ROW LEVEL SECURITY;

-- Backoffice/admin can insert
CREATE POLICY "Backoffice can insert acompanhamento_juridico"
  ON public.acompanhamento_juridico
  FOR INSERT
  TO authenticated
  WITH CHECK (is_backoffice_or_admin(auth.uid()) AND auth.uid() = user_id);

-- Backoffice/admin can view all
CREATE POLICY "Backoffice can view all acompanhamento_juridico"
  ON public.acompanhamento_juridico
  FOR SELECT
  TO authenticated
  USING (is_backoffice_or_admin(auth.uid()));

-- Users can view from their own solicitacoes
CREATE POLICY "Users can view own acompanhamento_juridico"
  ON public.acompanhamento_juridico
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.solicitacoes s
    WHERE s.id = acompanhamento_juridico.solicitacao_id AND s.user_id = auth.uid()
  ));

-- Users can view from their empreendimento
CREATE POLICY "Users can view acompanhamento_juridico from empreendimento"
  ON public.acompanhamento_juridico
  FOR SELECT
  TO authenticated
  USING (user_can_access_solicitacao(solicitacao_id));
