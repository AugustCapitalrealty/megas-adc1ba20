-- Política para permitir usuários verem solicitações dos empreendimentos aos quais estão vinculados
CREATE POLICY "Users can view solicitacoes from their empreendimento"
ON public.solicitacoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_empreendimentos ue
    WHERE ue.user_id = auth.uid()
    AND (ue.empreendimento = solicitacoes.empreendimento OR ue.empreendimento = 'todos')
  )
);