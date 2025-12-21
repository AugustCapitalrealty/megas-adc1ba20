
-- Atualizar função para ignorar TODAS as mudanças de status
-- evitando duplicatas com notify_status_change
CREATE OR REPLACE FUNCTION public.notify_from_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_protocolo TEXT;
  v_titulo TEXT;
  v_mensagem TEXT;
  v_tipo TEXT;
BEGIN
  -- Buscar informações da solicitação
  SELECT s.user_id, s.protocolo 
  INTO v_user_id, v_protocolo
  FROM public.solicitacoes s
  WHERE s.id = NEW.solicitacao_id;
  
  -- IMPORTANTE: Ignorar TODAS as mudanças de status
  -- pois já são cobertas pelo trigger notify_status_change
  IF NEW.status_anterior IS DISTINCT FROM NEW.status_novo THEN
    RETURN NEW;
  END IF;
  
  -- Ignorar ações de criação (já coberto por notify_new_solicitacao)
  IF NEW.acao = 'criacao' OR NEW.acao = 'solicitacao_criada' THEN
    RETURN NEW;
  END IF;
  
  -- Ignorar documento_emitido (já coberto por notify_documento_emitido)
  IF NEW.acao = 'documento_emitido' THEN
    RETURN NEW;
  END IF;
  
  -- Mapear ação para título e mensagem (apenas ações que não mudam status)
  v_tipo := 'info';
  
  CASE NEW.acao
    WHEN 'numero_fluig_adicionado' THEN
      v_titulo := 'Número Fluig/RM Adicionado';
      v_mensagem := 'O número Fluig/RM foi adicionado à solicitação ' || v_protocolo || '.';
    
    WHEN 'numero_fluig_alterado' THEN
      v_titulo := 'Número Fluig/RM Alterado';
      v_mensagem := 'O número Fluig/RM foi alterado na solicitação ' || v_protocolo || '.';
    
    WHEN 'numero_fluig_removido' THEN
      v_titulo := 'Número Fluig/RM Removido';
      v_mensagem := 'O número Fluig/RM foi removido da solicitação ' || v_protocolo || '.';
    
    WHEN 'anexo_adicionado' THEN
      v_titulo := 'Anexo Adicionado';
      v_mensagem := 'Um novo anexo foi adicionado à solicitação ' || v_protocolo || '.';
    
    WHEN 'mensagem_enviada' THEN
      v_titulo := 'Nova Mensagem';
      v_mensagem := 'Há uma nova mensagem na solicitação ' || v_protocolo || '.';
    
    WHEN 'Assumido pelo backoffice' THEN
      v_titulo := 'Backoffice Assumiu';
      v_mensagem := 'A solicitação ' || v_protocolo || ' foi assumida pelo backoffice.';
    
    WHEN 'resposta_informacoes' THEN
      v_titulo := 'Resposta às Informações';
      v_mensagem := 'Você respondeu às informações solicitadas em ' || v_protocolo || '.';
    
    WHEN 'nf_boleto_enviado' THEN
      v_titulo := 'NF/Boleto Enviados';
      v_mensagem := 'A NF/Boleto foi enviada para a solicitação ' || v_protocolo || '.';
      v_tipo := 'success';
    
    WHEN 'baixa_financeiro' THEN
      v_titulo := 'Enviado para Pagamento';
      v_mensagem := 'A solicitação ' || v_protocolo || ' foi enviada para pagamento.';
      v_tipo := 'success';
    
    WHEN 'solicitacao_corrigida' THEN
      v_titulo := 'Solicitação Corrigida';
      v_mensagem := 'A solicitação ' || v_protocolo || ' foi corrigida e reenviada.';
    
    ELSE
      -- Para outras ações que não mudam status, gerar notificação genérica
      v_titulo := COALESCE(NEW.acao, 'Atualização');
      v_mensagem := 'A solicitação ' || v_protocolo || ' foi atualizada.';
  END CASE;
  
  -- Adicionar motivo se existir
  IF NEW.motivo IS NOT NULL AND NEW.motivo != '' THEN
    v_mensagem := v_mensagem || ' Observação: ' || LEFT(NEW.motivo, 100);
  END IF;
  
  -- Inserir notificação
  INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
  VALUES (v_user_id, v_tipo, v_titulo, v_mensagem, NEW.solicitacao_id);
  
  RETURN NEW;
END;
$function$;
