-- 1) Backfill: solicitações canceladas que o próprio solicitante pediu já são consideradas "cientes"
UPDATE public.solicitacoes s
SET cancelamento_ciencia_em = COALESCE(s.cancelamento_ciencia_em, s.updated_at, now())
WHERE s.status = 'cancelado'
  AND s.cancelamento_ciencia_em IS NULL
  AND EXISTS (
    SELECT 1 FROM public.historico_solicitacoes h
    WHERE h.solicitacao_id = s.id
      AND h.acao = 'cancelamento_solicitado'
      AND h.user_id = s.user_id
  );

-- 2) Trigger: quando o status muda para 'cancelado' e existe um pedido prévio do solicitante,
--    marca a ciência automaticamente para evitar entrada redundante em "Aguardando Ciência".
CREATE OR REPLACE FUNCTION public.auto_set_ciencia_self_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_auto_set_ciencia_self_cancellation ON public.solicitacoes;
CREATE TRIGGER trg_auto_set_ciencia_self_cancellation
  BEFORE UPDATE OF status ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_ciencia_self_cancellation();