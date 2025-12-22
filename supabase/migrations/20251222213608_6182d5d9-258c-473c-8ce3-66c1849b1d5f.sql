-- 1. Criar função helper para verificar acesso à solicitação por empreendimento
CREATE OR REPLACE FUNCTION public.user_can_access_solicitacao(_solicitacao_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.solicitacoes s
    WHERE s.id = _solicitacao_id
      AND (
        s.user_id = auth.uid()
        OR is_backoffice_or_admin(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.user_empreendimentos ue
          WHERE ue.user_id = auth.uid()
            AND (ue.empreendimento = s.empreendimento OR ue.empreendimento = 'todos')
        )
      )
  )
$$;

-- 2. Políticas para ANEXOS - permitir acesso por empreendimento
CREATE POLICY "Users can view anexos from their empreendimento"
ON public.anexos FOR SELECT
USING (user_can_access_solicitacao(solicitacao_id));

CREATE POLICY "Users can insert anexos in their empreendimento"
ON public.anexos FOR INSERT
WITH CHECK (user_can_access_solicitacao(solicitacao_id));

-- 3. Políticas para SOLICITACAO_MENSAGENS - permitir acesso por empreendimento
CREATE POLICY "Users can view messages from their empreendimento"
ON public.solicitacao_mensagens FOR SELECT
USING (user_can_access_solicitacao(solicitacao_id));

CREATE POLICY "Users can insert messages in their empreendimento"
ON public.solicitacao_mensagens FOR INSERT
WITH CHECK ((auth.uid() = user_id) AND user_can_access_solicitacao(solicitacao_id));

-- 4. Política para HISTORICO_SOLICITACOES - permitir visualização por empreendimento
CREATE POLICY "Users can view historico from their empreendimento"
ON public.historico_solicitacoes FOR SELECT
USING (user_can_access_solicitacao(solicitacao_id));

-- 5. Política para SOLICITACOES UPDATE - permitir atualização por empreendimento (quando pendente)
CREATE POLICY "Users can update solicitacoes from their empreendimento"
ON public.solicitacoes FOR UPDATE
USING (
  (status = ANY (ARRAY['pendente_correcao'::request_status, 'aguardando_informacoes'::request_status]))
  AND user_can_access_solicitacao(id)
);