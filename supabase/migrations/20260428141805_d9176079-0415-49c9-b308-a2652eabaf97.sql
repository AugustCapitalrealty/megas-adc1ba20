
-- =====================================================================
-- UNIFICAÇÃO: histórico + chat + acompanhamento OC
-- Fonte única: public.historico_solicitacoes
-- =====================================================================

-- 1) Expandir historico_solicitacoes
ALTER TABLE public.historico_solicitacoes
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'status',
  ADD COLUMN IF NOT EXISTS mensagem text,
  ADD COLUMN IF NOT EXISTS interno boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lida boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS previsao_execucao date,
  ADD COLUMN IF NOT EXISTS previsao_nf date,
  ADD COLUMN IF NOT EXISTS documento_emitido_id uuid;

CREATE INDEX IF NOT EXISTS idx_historico_categoria ON public.historico_solicitacoes(categoria);
CREATE INDEX IF NOT EXISTS idx_historico_solicitacao_categoria ON public.historico_solicitacoes(solicitacao_id, categoria);
CREATE INDEX IF NOT EXISTS idx_historico_unread ON public.historico_solicitacoes(solicitacao_id, lida) WHERE categoria = 'mensagem' AND lida = false;

-- 2) Backfill solicitacao_mensagens -> historico_solicitacoes
INSERT INTO public.historico_solicitacoes
  (solicitacao_id, user_id, acao, categoria, mensagem, interno, lida, created_at)
SELECT
  sm.solicitacao_id,
  sm.user_id,
  'mensagem_enviada',
  'mensagem',
  sm.mensagem,
  COALESCE(sm.interno, false),
  COALESCE(sm.lida, true),
  sm.created_at
FROM public.solicitacao_mensagens sm
WHERE NOT EXISTS (
  SELECT 1 FROM public.historico_solicitacoes h
  WHERE h.solicitacao_id = sm.solicitacao_id
    AND h.categoria = 'mensagem'
    AND h.user_id = sm.user_id
    AND h.created_at = sm.created_at
);

-- 3) Backfill oc_acompanhamento -> historico_solicitacoes
INSERT INTO public.historico_solicitacoes
  (solicitacao_id, user_id, acao, categoria, motivo, previsao_execucao, previsao_nf, created_at)
SELECT
  oa.solicitacao_id,
  oa.user_id,
  oa.tipo_acao::text,
  'acompanhamento_oc',
  oa.justificativa,
  oa.previsao_execucao,
  oa.previsao_nf,
  oa.created_at
FROM public.oc_acompanhamento oa
WHERE NOT EXISTS (
  SELECT 1 FROM public.historico_solicitacoes h
  WHERE h.solicitacao_id = oa.solicitacao_id
    AND h.categoria = 'acompanhamento_oc'
    AND h.user_id = oa.user_id
    AND h.created_at = oa.created_at
);

-- 4) Atualizar política de SELECT para esconder mensagens internas de não-backoffice
DROP POLICY IF EXISTS "Backoffice can view all historico" ON public.historico_solicitacoes;
DROP POLICY IF EXISTS "Users can view historico from their empreendimento" ON public.historico_solicitacoes;
DROP POLICY IF EXISTS "Users can view own historico" ON public.historico_solicitacoes;

CREATE POLICY "Backoffice can view all historico"
ON public.historico_solicitacoes FOR SELECT
USING (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Users can view historico from their empreendimento"
ON public.historico_solicitacoes FOR SELECT
USING (
  user_can_access_solicitacao(solicitacao_id)
  AND (interno = false)
);

CREATE POLICY "Users can view own historico"
ON public.historico_solicitacoes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.solicitacoes s
    WHERE s.id = historico_solicitacoes.solicitacao_id
      AND s.user_id = auth.uid()
  )
  AND (interno = false)
);

-- 5) Permitir UPDATE para marcar como lida
DROP POLICY IF EXISTS "Backoffice can update historico lida" ON public.historico_solicitacoes;
DROP POLICY IF EXISTS "Users can mark historico as read" ON public.historico_solicitacoes;

CREATE POLICY "Backoffice can update historico lida"
ON public.historico_solicitacoes FOR UPDATE
USING (is_backoffice_or_admin(auth.uid()))
WITH CHECK (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Users can mark historico as read"
ON public.historico_solicitacoes FOR UPDATE
USING (
  categoria = 'mensagem'
  AND user_can_access_solicitacao(solicitacao_id)
)
WITH CHECK (
  categoria = 'mensagem'
  AND user_can_access_solicitacao(solicitacao_id)
);

-- 6) Simplificar trigger de auto ciência: agora só uma fonte
CREATE OR REPLACE FUNCTION public.auto_set_ciencia_self_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'cancelado'
     AND (OLD.status IS NULL OR OLD.status <> 'cancelado')
     AND NEW.cancelamento_ciencia_em IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.historico_solicitacoes h
      WHERE h.solicitacao_id = NEW.id
        AND h.acao = 'cancelamento_solicitado'
        AND h.user_id = NEW.user_id
    ) THEN
      NEW.cancelamento_ciencia_em := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
