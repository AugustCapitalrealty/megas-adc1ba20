-- Função para notificar quando um documento é emitido (OC/AC)
CREATE OR REPLACE FUNCTION public.notify_documento_emitido()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_protocolo TEXT;
  v_user_id UUID;
  v_emitido_por_nome TEXT;
  v_titulo TEXT;
  v_mensagem TEXT;
BEGIN
  -- Buscar informações da solicitação
  SELECT s.protocolo, s.user_id 
  INTO v_protocolo, v_user_id
  FROM public.solicitacoes s
  WHERE s.id = NEW.solicitacao_id;
  
  -- Buscar nome de quem emitiu
  SELECT p.full_name 
  INTO v_emitido_por_nome
  FROM public.profiles p
  WHERE p.id = NEW.emitido_por;
  
  -- Definir título e mensagem baseado no tipo de documento
  IF NEW.tipo_documento = 'OC' THEN
    v_titulo := 'Ordem de Compra Emitida!';
    v_mensagem := 'A Ordem de Compra (OC) nº ' || NEW.numero_documento || ' foi emitida para a solicitação ' || v_protocolo || '.';
  ELSIF NEW.tipo_documento = 'AC' THEN
    v_titulo := 'Autorização de Compra Emitida!';
    v_mensagem := 'A Autorização de Compra (AC) nº ' || NEW.numero_documento || ' foi emitida para a solicitação ' || v_protocolo || '.';
  ELSE
    v_titulo := 'Documento Emitido';
    v_mensagem := 'Um documento foi emitido para a solicitação ' || v_protocolo || '.';
  END IF;
  
  -- Adicionar nome do responsável se disponível
  IF v_emitido_por_nome IS NOT NULL THEN
    v_mensagem := v_mensagem || ' Emitido por: ' || v_emitido_por_nome || '.';
  END IF;
  
  -- Inserir notificação para o dono da solicitação
  INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
  VALUES (v_user_id, 'success', v_titulo, v_mensagem, NEW.solicitacao_id);
  
  RETURN NEW;
END;
$function$;

-- Criar trigger para notificar quando documento é inserido
CREATE TRIGGER on_documento_emitido
  AFTER INSERT ON public.documentos_emitidos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_documento_emitido();

-- Atualizar função de notificação de status para renomear "Aprovada" para algo mais claro
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
    WHEN 'aprovado' THEN 'Aprovada pela Gerência'
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
    v_titulo := 'Aprovação da Gerência';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' foi aprovada pela gerência e está em processamento.';
    v_tipo := 'info';
  ELSIF NEW.status = 'oc_ac_emitida' THEN
    v_titulo := 'OC/AC Pronta!';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' teve a OC/AC emitida. Verifique o documento.';
    v_tipo := 'success';
  ELSIF NEW.status = 'rejeitado' THEN
    v_titulo := 'Solicitação Rejeitada';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' foi rejeitada. Verifique o motivo.';
    v_tipo := 'error';
  ELSIF NEW.status = 'concluida' THEN
    v_titulo := 'Solicitação Concluída!';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' foi concluída com sucesso.';
    v_tipo := 'success';
  ELSIF NEW.status = 'aguardando_informacoes' THEN
    v_titulo := 'Informações Solicitadas';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' aguarda informações adicionais.';
    v_tipo := 'action_required';
  END IF;
  
  -- Insert notification for the solicitation owner
  INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
  VALUES (NEW.user_id, v_tipo, v_titulo, v_mensagem, NEW.id);
  
  RETURN NEW;
END;
$function$;