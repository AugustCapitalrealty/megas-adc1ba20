-- Permitir que o dono da solicitação aceite a OC (mude de aguardando_aceite para liberado_fornecedor)
CREATE POLICY "Users can accept OC on their own solicitacoes"
ON public.solicitacoes
FOR UPDATE
TO public
USING (
  auth.uid() = user_id 
  AND status = 'aguardando_aceite'::request_status
)
WITH CHECK (
  auth.uid() = user_id
);