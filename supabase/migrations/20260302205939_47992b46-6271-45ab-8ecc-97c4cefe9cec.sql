
-- documentos_fiscais also needs empreendimento-based SELECT
CREATE POLICY "Users can view documentos_fiscais from their empreendimento"
ON public.documentos_fiscais FOR SELECT
USING (user_can_access_solicitacao(solicitacao_id));
