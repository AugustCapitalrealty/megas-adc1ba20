-- Atualizar a função notify_status_change para usar os mesmos labels do frontend
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
  
  -- Map status to readable label (synchronized with frontend STATUS_LABELS)
  v_status_label := CASE NEW.status
    WHEN 'recebido' THEN 'Em Fila'
    WHEN 'em_analise' THEN 'Em Análise pelo Backoffice'
    WHEN 'pendente_correcao' THEN 'Correção Necessária'
    WHEN 'aprovado' THEN 'Em Lançamento'
    WHEN 'rejeitado' THEN 'Não Aprovado'
    WHEN 'em_processamento' THEN 'Em Aprovação'
    WHEN 'oc_ac_emitida' THEN 'OC Enviada - Aguardando Aceite'
    WHEN 'concluida' THEN 'Finalizada'
    WHEN 'aguardando_aceite' THEN 'Aguardando Aceite do Solicitante'
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
    v_titulo := 'Aguardando NF/Boleto';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' está aguardando envio de NF e Boleto.';
    v_tipo := 'action_required';
  ELSIF NEW.status = 'aprovado' THEN
    v_titulo := 'Em Lançamento';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' está em lançamento no Fluig.';
    v_tipo := 'info';
  ELSIF NEW.status = 'oc_ac_emitida' THEN
    v_titulo := 'OC/AC Emitida!';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' teve a OC/AC emitida. Verifique o documento.';
    v_tipo := 'success';
  ELSIF NEW.status = 'rejeitado' THEN
    v_titulo := 'Solicitação Não Aprovada';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' não foi aprovada. Verifique o motivo.';
    v_tipo := 'error';
  ELSIF NEW.status = 'concluida' THEN
    v_titulo := 'Solicitação Finalizada!';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' foi finalizada com sucesso.';
    v_tipo := 'success';
  ELSIF NEW.status = 'aguardando_informacoes' THEN
    v_titulo := 'Aguardando Informações';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' aguarda informações adicionais.';
    v_tipo := 'action_required';
  ELSIF NEW.status = 'em_processamento' THEN
    v_titulo := 'Em Aprovação';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' está em aprovação no Fluig.';
    v_tipo := 'info';
  END IF;
  
  -- Insert notification for the solicitation owner
  INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
  VALUES (NEW.user_id, v_tipo, v_titulo, v_mensagem, NEW.id);
  
  RETURN NEW;
END;
$function$;