-- Fix RLS policy to allow status change when resubmitting corrections
DROP POLICY IF EXISTS "Users can update own pending solicitacoes" ON public.solicitacoes;

CREATE POLICY "Users can update own pending solicitacoes" ON public.solicitacoes
  FOR UPDATE 
  USING (
    auth.uid() = user_id 
    AND status IN ('pendente_correcao', 'aguardando_informacoes')
  )
  WITH CHECK (
    auth.uid() = user_id
  );