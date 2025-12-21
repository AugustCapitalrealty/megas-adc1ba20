
-- Criar função que notifica baseado no histórico
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
  v_status_label TEXT;
BEGIN
  -- Buscar informações da solicitação
  SELECT s.user_id, s.protocolo 
  INTO v_user_id, v_protocolo
  FROM public.solicitacoes s
  WHERE s.id = NEW.solicitacao_id;
  
  -- Ignorar se a ação é mudança de status (já coberto por notify_status_change)
  IF NEW.acao = 'status_alterado' THEN
    RETURN NEW;
  END IF;
  
  -- Mapear ação para título e mensagem
  v_tipo := 'info';
  
  CASE NEW.acao
    WHEN 'solicitacao_criada' THEN
      -- Já coberto por notify_new_solicitacao
      RETURN NEW;
    
    WHEN 'numero_fluig_adicionado' THEN
      v_titulo := 'Número Fluig/RM Adicionado';
      v_mensagem := 'O número Fluig/RM foi adicionado à solicitação ' || v_protocolo || '.';
      v_tipo := 'info';
    
    WHEN 'numero_fluig_alterado' THEN
      v_titulo := 'Número Fluig/RM Alterado';
      v_mensagem := 'O número Fluig/RM foi alterado na solicitação ' || v_protocolo || '.';
      v_tipo := 'info';
    
    WHEN 'Assumido pelo backoffice' THEN
      v_titulo := 'Backoffice Assumiu';
      v_mensagem := 'A solicitação ' || v_protocolo || ' foi assumida pelo backoffice.';
      v_tipo := 'info';
    
    WHEN 'resposta_informacoes' THEN
      v_titulo := 'Resposta às Informações';
      v_mensagem := 'Você respondeu às informações solicitadas em ' || v_protocolo || '.';
      v_tipo := 'info';
    
    WHEN 'nf_boleto_enviado' THEN
      v_titulo := 'NF/Boleto Enviados';
      v_mensagem := 'A NF/Boleto foi enviada para a solicitação ' || v_protocolo || '.';
      v_tipo := 'success';
    
    WHEN 'baixa_financeiro' THEN
      v_titulo := 'Enviado para Pagamento';
      v_mensagem := 'A solicitação ' || v_protocolo || ' foi enviada para pagamento.';
      v_tipo := 'success';
    
    WHEN 'documento_emitido' THEN
      -- Já coberto por notify_documento_emitido
      RETURN NEW;
    
    WHEN 'anexo_adicionado' THEN
      v_titulo := 'Anexo Adicionado';
      v_mensagem := 'Um novo anexo foi adicionado à solicitação ' || v_protocolo || '.';
      v_tipo := 'info';
    
    WHEN 'mensagem_enviada' THEN
      v_titulo := 'Nova Mensagem';
      v_mensagem := 'Há uma nova mensagem na solicitação ' || v_protocolo || '.';
      v_tipo := 'info';
    
    WHEN 'solicitacao_corrigida' THEN
      v_titulo := 'Solicitação Corrigida';
      v_mensagem := 'A solicitação ' || v_protocolo || ' foi corrigida e reenviada.';
      v_tipo := 'info';
    
    ELSE
      -- Para ações não mapeadas, usar a ação como título
      v_titulo := COALESCE(NEW.acao, 'Atualização');
      v_mensagem := 'A solicitação ' || v_protocolo || ' foi atualizada.';
      v_tipo := 'info';
  END CASE;
  
  -- Adicionar motivo se existir
  IF NEW.motivo IS NOT NULL AND NEW.motivo != '' THEN
    v_mensagem := v_mensagem || ' Observação: ' || LEFT(NEW.motivo, 100);
  END IF;
  
  -- Inserir notificação para o dono da solicitação
  INSERT INTO public.notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
  VALUES (v_user_id, v_tipo, v_titulo, v_mensagem, NEW.solicitacao_id);
  
  RETURN NEW;
END;
$function$;

-- Criar o trigger
DROP TRIGGER IF EXISTS on_historico_insert_notify ON public.historico_solicitacoes;

CREATE TRIGGER on_historico_insert_notify
AFTER INSERT ON public.historico_solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.notify_from_historico();
