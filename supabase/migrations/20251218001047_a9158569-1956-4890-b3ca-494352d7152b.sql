-- Create function to send notifications on status change
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_titulo TEXT;
  v_mensagem TEXT;
  v_tipo TEXT;
  v_status_label TEXT;
BEGIN
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Map status to readable label
  v_status_label := CASE NEW.status
    WHEN 'recebido' THEN 'Recebida'
    WHEN 'em_analise' THEN 'Em Análise'
    WHEN 'pendente_correcao' THEN 'Pendente de Correção'
    WHEN 'aprovado' THEN 'Aprovada'
    WHEN 'rejeitado' THEN 'Rejeitada'
    WHEN 'em_processamento' THEN 'Em Processamento'
    WHEN 'oc_ac_emitida' THEN 'OC/AC Emitida'
    WHEN 'concluida' THEN 'Concluída'
    WHEN 'aguardando_aceite' THEN 'Aguardando Aceite'
    WHEN 'aguardando_informacoes' THEN 'Aguardando Informações'
    WHEN 'aguardando_nf_boleto' THEN 'Aguardando NF/Boleto'
    WHEN 'nf_boleto_enviados' THEN 'NF/Boleto Enviados'
    WHEN 'enviado_pagamento' THEN 'Enviado para Pagamento'
    ELSE NEW.status::TEXT
  END;
  
  -- Set notification content based on status
  v_tipo := 'status_change';
  v_titulo := 'Solicitação ' || v_status_label;
  v_mensagem := 'A solicitação ' || NEW.protocolo || ' foi atualizada para: ' || v_status_label;
  
  -- Special messages for specific statuses
  IF NEW.status = 'pendente_correcao' THEN
    v_titulo := 'Correção Necessária';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' precisa de correções. Verifique os detalhes.';
    v_tipo := 'action_required';
  ELSIF NEW.status = 'aguardando_nf_boleto' THEN
    v_titulo := 'NF/Boleto Solicitados';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' está aguardando envio de NF e Boleto.';
    v_tipo := 'action_required';
  ELSIF NEW.status = 'aprovado' THEN
    v_titulo := 'Solicitação Aprovada!';
    v_mensagem := 'Boa notícia! A solicitação ' || NEW.protocolo || ' foi aprovada.';
    v_tipo := 'success';
  ELSIF NEW.status = 'rejeitado' THEN
    v_titulo := 'Solicitação Rejeitada';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' foi rejeitada. Verifique o motivo.';
    v_tipo := 'error';
  ELSIF NEW.status = 'concluida' THEN
    v_titulo := 'Solicitação Concluída!';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' foi concluída com sucesso.';
    v_tipo := 'success';
  END IF;
  
  -- Insert notification for the solicitation owner
  INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
  VALUES (NEW.user_id, v_tipo, v_titulo, v_mensagem, NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Create trigger on solicitacoes table for status changes
DROP TRIGGER IF EXISTS trigger_notify_status_change ON public.solicitacoes;
CREATE TRIGGER trigger_notify_status_change
  AFTER UPDATE ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_status_change();

-- Also notify when a new solicitation is created
CREATE OR REPLACE FUNCTION public.notify_new_solicitacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
  VALUES (
    NEW.user_id,
    'info',
    'Solicitação Criada',
    'Sua solicitação ' || NEW.protocolo || ' foi criada e está sendo processada.',
    NEW.id
  );
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_notify_new_solicitacao ON public.solicitacoes;
CREATE TRIGGER trigger_notify_new_solicitacao
  AFTER INSERT ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_solicitacao();