
CREATE OR REPLACE FUNCTION public.notify_backoffice_liberado_fornecedor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  backoffice_user RECORD;
BEGIN
  IF NEW.status = 'liberado_fornecedor' 
     AND (OLD.status IS NULL OR OLD.status != 'liberado_fornecedor') THEN
    
    FOR backoffice_user IN
      SELECT DISTINCT ur.user_id
      FROM user_roles ur
      WHERE ur.role IN ('backoffice', 'admin')
    LOOP
      INSERT INTO notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
      VALUES (
        backoffice_user.user_id,
        'action_required',
        'OC Liberada pelo Solicitante',
        'A solicitação ' || COALESCE(NEW.protocolo, '') || ' foi liberada para envio ao fornecedor.',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_solicitacao_liberada_fornecedor
  AFTER UPDATE ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_backoffice_liberado_fornecedor();
