
-- 1. SELECT policy for documentos_emitidos by empreendimento
CREATE POLICY "Users can view documentos from their empreendimento"
ON public.documentos_emitidos FOR SELECT
USING (user_can_access_solicitacao(solicitacao_id));

-- 2. SELECT policy for oc_acompanhamento by empreendimento
CREATE POLICY "Users can view oc_acompanhamento from their empreendimento"
ON public.oc_acompanhamento FOR SELECT
USING (user_can_access_solicitacao(solicitacao_id));

-- 3. INSERT policy for oc_acompanhamento by empreendimento
CREATE POLICY "Users can insert oc_acompanhamento for their empreendimento"
ON public.oc_acompanhamento FOR INSERT
WITH CHECK (auth.uid() = user_id AND user_can_access_solicitacao(solicitacao_id));
