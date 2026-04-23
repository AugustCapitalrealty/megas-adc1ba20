-- Function: auto-mark action_required notifications as read when solicitation reaches terminal status
CREATE OR REPLACE FUNCTION public.auto_read_notifications_on_terminal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('concluida','cancelado','rejeitado','enviado_pagamento')
     AND (OLD.status IS NULL OR OLD.status <> NEW.status) THEN
    UPDATE public.notifications
       SET lida = true
     WHERE solicitacao_id = NEW.id
       AND tipo = 'action_required'
       AND lida = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_read_notifications_on_terminal_trigger ON public.solicitacoes;

CREATE TRIGGER auto_read_notifications_on_terminal_trigger
AFTER UPDATE OF status ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.auto_read_notifications_on_terminal();