DROP POLICY IF EXISTS "Users can respond to OC on their own solicitacoes" ON public.solicitacoes;

CREATE POLICY "Users can respond to OC on their own solicitacoes"
ON public.solicitacoes
FOR UPDATE
TO public
USING ((auth.uid() = user_id) AND (status = 'aguardando_aceite'::request_status))
WITH CHECK ((auth.uid() = user_id) AND (status = ANY (ARRAY['liberado_fornecedor'::request_status, 'em_processamento'::request_status, 'recebido'::request_status])));