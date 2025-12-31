-- Step 2: Add new columns and transitions (after enum values are committed)
ALTER TABLE solicitacoes 
  ADD COLUMN IF NOT EXISTS data_liberado_fornecedor TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS liberado_fornecedor_por UUID,
  ADD COLUMN IF NOT EXISTS data_enviado_fornecedor TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS enviado_fornecedor_por UUID;

-- Add new status transitions
INSERT INTO status_transitions (status_from, status_to) VALUES 
  ('aguardando_aceite', 'liberado_fornecedor'),
  ('liberado_fornecedor', 'enviado_fornecedor'),
  ('enviado_fornecedor', 'concluida')
ON CONFLICT DO NOTHING;

-- Update notify_status_change function to handle new statuses
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
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
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
    WHEN 'liberado_fornecedor' THEN 'Liberada para Fornecedor'
    WHEN 'enviado_fornecedor' THEN 'OC Enviada ao Fornecedor'
    ELSE NEW.status::TEXT
  END;
  
  v_tipo := 'status_change';
  v_titulo := 'Solicitação ' || v_status_label;
  v_mensagem := 'A solicitação ' || NEW.protocolo || ' foi atualizada para: ' || v_status_label;
  
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
  ELSIF NEW.status = 'liberado_fornecedor' THEN
    v_titulo := 'Liberada para Fornecedor';
    v_mensagem := 'A solicitação ' || NEW.protocolo || ' foi liberada para envio ao fornecedor.';
    v_tipo := 'success';
  ELSIF NEW.status = 'enviado_fornecedor' THEN
    v_titulo := 'OC Enviada ao Fornecedor';
    v_mensagem := 'A OC da solicitação ' || NEW.protocolo || ' foi enviada ao fornecedor.';
    v_tipo := 'success';
  END IF;
  
  INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
  VALUES (NEW.user_id, v_tipo, v_titulo, v_mensagem, NEW.id);
  
  RETURN NEW;
END;
$function$;