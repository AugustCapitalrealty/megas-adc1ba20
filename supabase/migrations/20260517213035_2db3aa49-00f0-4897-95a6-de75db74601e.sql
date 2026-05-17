
-- 1. Endurecer policy de UPDATE em rascunho: dono só pode manter rascunho ou promover para 'recebido'
DROP POLICY IF EXISTS "Users can update own rascunho" ON public.solicitacoes;
CREATE POLICY "Users can update own rascunho"
  ON public.solicitacoes
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'rascunho'::request_status)
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('rascunho'::request_status, 'recebido'::request_status)
  );

-- 2. Quando rascunho é promovido, gerar protocolo E inserir notificação in-app (o trigger
--    notify_new_solicitacao só dispara em INSERT, então a promoção via UPDATE não notificava).
CREATE OR REPLACE FUNCTION public.handle_rascunho_envio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'rascunho'::request_status AND NEW.status <> 'rascunho'::request_status THEN
    IF NEW.protocolo IS NULL OR btrim(NEW.protocolo) = '' THEN
      NEW.protocolo := public.generate_protocolo();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- AFTER trigger separado para inserir a notificação após a promoção (usando NEW.protocolo já gerado)
CREATE OR REPLACE FUNCTION public.notify_rascunho_promovido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'rascunho'::request_status AND NEW.status <> 'rascunho'::request_status THEN
    INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
    VALUES (
      NEW.user_id,
      'info',
      'Solicitação Criada',
      'Sua solicitação ' || COALESCE(NEW.protocolo, '') || ' foi criada e está sendo processada.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_rascunho_promovido ON public.solicitacoes;
CREATE TRIGGER trg_notify_rascunho_promovido
  AFTER UPDATE ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rascunho_promovido();
