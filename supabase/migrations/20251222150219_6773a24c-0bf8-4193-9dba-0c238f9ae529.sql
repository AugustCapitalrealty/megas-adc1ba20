-- Fix RLS policy to allow users to update their own solicitacoes when status is 'aguardando_informacoes'
DROP POLICY IF EXISTS "Users can update own pending solicitacoes" ON public.solicitacoes;

CREATE POLICY "Users can update own pending solicitacoes" ON public.solicitacoes
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND status IN ('pendente_correcao', 'aguardando_informacoes')
  );