
-- 1. Atualiza trigger para considerar oc_acompanhamento também
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
    ) OR EXISTS (
      SELECT 1 FROM public.oc_acompanhamento oa
      WHERE oa.solicitacao_id = NEW.id
        AND oa.tipo_acao::text = 'cancelamento_solicitado'
        AND oa.user_id = NEW.user_id
    ) THEN
      NEW.cancelamento_ciencia_em := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Limpeza de cancelamento_aprovado duplicados em historico_solicitacoes (mantém o mais antigo)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY solicitacao_id, acao ORDER BY created_at ASC) AS rn
  FROM public.historico_solicitacoes
  WHERE acao = 'cancelamento_aprovado'
)
DELETE FROM public.historico_solicitacoes
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 3. Limpeza de cancelamento_aprovado duplicados em oc_acompanhamento (mantém o mais antigo)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY solicitacao_id, tipo_acao ORDER BY created_at ASC) AS rn
  FROM public.oc_acompanhamento
  WHERE tipo_acao::text = 'cancelamento_aprovado'
)
DELETE FROM public.oc_acompanhamento
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 4. Backfill 2026000146 — inserir no histórico o pedido de cancelamento (a partir de oc_acompanhamento)
INSERT INTO public.historico_solicitacoes (solicitacao_id, user_id, acao, status_anterior, status_novo, motivo, created_at)
SELECT 
  oa.solicitacao_id,
  oa.user_id,
  'cancelamento_solicitado',
  'aguardando_aceite'::request_status,
  'aguardando_aceite'::request_status,
  oa.justificativa,
  oa.created_at
FROM public.oc_acompanhamento oa
JOIN public.solicitacoes s ON s.id = oa.solicitacao_id
WHERE s.protocolo = '2026000146'
  AND oa.tipo_acao::text = 'cancelamento_solicitado'
  AND NOT EXISTS (
    SELECT 1 FROM public.historico_solicitacoes h
    WHERE h.solicitacao_id = oa.solicitacao_id
      AND h.acao = 'cancelamento_solicitado'
      AND h.user_id = oa.user_id
  );

-- 5. Backfill 2026000272 — inserir no histórico pedido + aprovação retroativa
-- 5a. Pedido (de oc_acompanhamento)
INSERT INTO public.historico_solicitacoes (solicitacao_id, user_id, acao, status_anterior, status_novo, motivo, created_at)
SELECT 
  oa.solicitacao_id,
  oa.user_id,
  'cancelamento_solicitado',
  'aguardando_aceite'::request_status,
  'aguardando_aceite'::request_status,
  oa.justificativa,
  oa.created_at
FROM public.oc_acompanhamento oa
JOIN public.solicitacoes s ON s.id = oa.solicitacao_id
WHERE s.protocolo = '2026000272'
  AND oa.tipo_acao::text = 'cancelamento_solicitado'
  AND NOT EXISTS (
    SELECT 1 FROM public.historico_solicitacoes h
    WHERE h.solicitacao_id = oa.solicitacao_id
      AND h.acao = 'cancelamento_solicitado'
  );

-- 5b. Aprovação retroativa (usar o user_id do solicitante como placeholder + motivo claro)
INSERT INTO public.historico_solicitacoes (solicitacao_id, user_id, acao, status_anterior, status_novo, motivo, created_at)
SELECT 
  s.id,
  s.user_id,
  'cancelamento_aprovado',
  'aguardando_aceite'::request_status,
  'cancelado'::request_status,
  'Cancelamento registrado retroativamente — aprovação original sem rastro no sistema.',
  s.updated_at
FROM public.solicitacoes s
WHERE s.protocolo = '2026000272'
  AND s.status = 'cancelado'
  AND NOT EXISTS (
    SELECT 1 FROM public.historico_solicitacoes h
    WHERE h.solicitacao_id = s.id
      AND h.acao = 'cancelamento_aprovado'
  );

-- 6. Backfill global: marcar ciência automática para canceladas onde solicitante pediu (qualquer origem)
UPDATE public.solicitacoes s
SET cancelamento_ciencia_em = COALESCE(s.updated_at, now())
WHERE s.status = 'cancelado'
  AND s.cancelamento_ciencia_em IS NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.historico_solicitacoes h
      WHERE h.solicitacao_id = s.id
        AND h.acao = 'cancelamento_solicitado'
        AND h.user_id = s.user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.oc_acompanhamento oa
      WHERE oa.solicitacao_id = s.id
        AND oa.tipo_acao::text = 'cancelamento_solicitado'
        AND oa.user_id = s.user_id
    )
  );
