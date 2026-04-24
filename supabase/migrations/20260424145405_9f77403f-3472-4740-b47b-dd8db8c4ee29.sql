CREATE OR REPLACE FUNCTION public.calcular_sla_solicitacao(p_solicitacao_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  tempo_backoffice NUMERIC := 0;
  passou_cadastro BOOLEAN := FALSE;
  data_fluig_rm TIMESTAMP WITH TIME ZONE := NULL;
  data_finalizacao TIMESTAMP WITH TIME ZONE := NULL;
  em_contagem BOOLEAN := TRUE;
  data_inicio TIMESTAMP WITH TIME ZONE := NULL;
  sol RECORD;
  status_atual TEXT;
  status_pos_oc TEXT[] := ARRAY[
    'aguardando_aceite','oc_ac_emitida','liberado_fornecedor',
    'enviado_fornecedor','aguardando_execucao','aguardando_nf_boleto',
    'nf_boleto_enviados','enviado_pagamento','concluida'
  ];
BEGIN
  SELECT created_at, status INTO sol
  FROM solicitacoes WHERE id = p_solicitacao_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Solicitação não encontrada');
  END IF;
  
  data_inicio := sol.created_at;
  status_atual := sol.status;
  
  FOR rec IN
    SELECT * FROM historico_solicitacoes
    WHERE solicitacao_id = p_solicitacao_id
    ORDER BY created_at ASC
  LOOP
    IF data_fluig_rm IS NOT NULL THEN
      IF rec.acao ILIKE '%cadastro solicitado%' OR rec.acao ILIKE '%cadastro concluído%' THEN
        passou_cadastro := TRUE;
      END IF;
      CONTINUE;
    END IF;

    IF rec.status_novo::TEXT IN ('pendente_correcao', 'aguardando_informacoes') THEN
      IF em_contagem AND data_inicio IS NOT NULL THEN
        tempo_backoffice := tempo_backoffice + calcular_horas_uteis(data_inicio, rec.created_at);
      END IF;
      em_contagem := FALSE;
      data_inicio := NULL;
    END IF;
    
    IF rec.status_anterior::TEXT IN ('pendente_correcao', 'aguardando_informacoes') 
       AND rec.status_novo::TEXT IN ('recebido', 'em_analise') THEN
      em_contagem := TRUE;
      data_inicio := rec.created_at;
    END IF;

    IF rec.acao ILIKE '%cadastro solicitado%' OR rec.acao ILIKE '%cadastro concluído%' THEN
      passou_cadastro := TRUE;
    END IF;

    IF rec.acao LIKE 'numero_fluig%' OR rec.acao = 'atualizacao_fluig' THEN
      IF em_contagem AND data_inicio IS NOT NULL THEN
        tempo_backoffice := tempo_backoffice + calcular_horas_uteis(data_inicio, rec.created_at);
      END IF;
      data_fluig_rm := rec.created_at;
      em_contagem := FALSE;
      data_inicio := NULL;
    END IF;

    IF rec.status_novo::TEXT = 'em_processamento' THEN
      IF em_contagem AND data_inicio IS NOT NULL THEN
        tempo_backoffice := tempo_backoffice + calcular_horas_uteis(data_inicio, rec.created_at);
      END IF;
      em_contagem := FALSE;
      data_inicio := NULL;
    END IF;

    IF rec.status_novo::TEXT = ANY(status_pos_oc) THEN
      IF em_contagem AND data_inicio IS NOT NULL THEN
        tempo_backoffice := tempo_backoffice + calcular_horas_uteis(data_inicio, rec.created_at);
      END IF;
      em_contagem := FALSE;
      data_inicio := NULL;
      IF rec.status_novo::TEXT = 'concluida' THEN
        data_finalizacao := rec.created_at;
      END IF;
    END IF;
  END LOOP;
  
  IF em_contagem AND data_inicio IS NOT NULL 
     AND status_atual NOT IN (
       'pendente_correcao','aguardando_informacoes','concluida',
       'cancelado','rejeitado','em_processamento',
       'aguardando_aceite','oc_ac_emitida','liberado_fornecedor',
       'enviado_fornecedor','aguardando_execucao','aguardando_nf_boleto',
       'nf_boleto_enviados','enviado_pagamento'
     ) THEN
    tempo_backoffice := tempo_backoffice + calcular_horas_uteis(data_inicio, NOW());
  END IF;

  RETURN json_build_object(
    'dias_uteis_backoffice', tempo_backoffice,
    'passou_cadastro', passou_cadastro,
    'data_fluig_rm', data_fluig_rm,
    'data_finalizacao', data_finalizacao,
    'sla_estourado', tempo_backoffice > 3,
    'status_sla', CASE 
      WHEN tempo_backoffice <= 2 THEN 'no_prazo'
      WHEN tempo_backoffice <= 3 THEN 'atencao'
      ELSE 'estourado'
    END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_sla_timeline(p_solicitacao_id uuid)
 RETURNS TABLE(created_at timestamp with time zone, acao text, status_anterior text, status_novo text, usuario_nome text, conta_tempo boolean, tipo_evento text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  is_counting BOOLEAN := TRUE;
  fluig_lancado BOOLEAN := FALSE;
  status_pos_oc TEXT[] := ARRAY[
    'aguardando_aceite','oc_ac_emitida','liberado_fornecedor',
    'enviado_fornecedor','aguardando_execucao','aguardando_nf_boleto',
    'nf_boleto_enviados','enviado_pagamento','concluida'
  ];
BEGIN
  FOR rec IN
    SELECT 
      h.created_at,
      h.acao,
      h.status_anterior::TEXT,
      h.status_novo::TEXT,
      p.full_name as usuario_nome
    FROM historico_solicitacoes h
    LEFT JOIN profiles p ON p.id = h.user_id
    WHERE h.solicitacao_id = p_solicitacao_id
    ORDER BY h.created_at ASC
  LOOP
    created_at := rec.created_at;
    acao := rec.acao;
    status_anterior := rec.status_anterior;
    status_novo := rec.status_novo;
    usuario_nome := rec.usuario_nome;
    
    IF rec.acao = 'solicitacao_criada' THEN
      tipo_evento := 'inicio';
      conta_tempo := TRUE;
      is_counting := TRUE;
    ELSIF fluig_lancado THEN
      tipo_evento := 'andamento';
      conta_tempo := FALSE;
    ELSIF rec.status_novo IN ('pendente_correcao', 'aguardando_informacoes') THEN
      tipo_evento := 'pausa';
      conta_tempo := FALSE;
      is_counting := FALSE;
    ELSIF rec.status_anterior IN ('pendente_correcao', 'aguardando_informacoes') 
          AND rec.status_novo IN ('recebido', 'em_analise') THEN
      tipo_evento := 'reinicio';
      conta_tempo := TRUE;
      is_counting := TRUE;
    ELSIF rec.acao LIKE 'numero_fluig%' OR rec.acao = 'atualizacao_fluig' THEN
      tipo_evento := 'fim';
      conta_tempo := FALSE;
      is_counting := FALSE;
      fluig_lancado := TRUE;
    ELSIF rec.status_novo = 'em_processamento' THEN
      tipo_evento := 'fim';
      conta_tempo := FALSE;
      is_counting := FALSE;
    ELSIF rec.status_novo = ANY(status_pos_oc) THEN
      tipo_evento := 'fim';
      conta_tempo := FALSE;
      is_counting := FALSE;
    ELSIF rec.status_novo IN ('cancelado', 'rejeitado') THEN
      tipo_evento := 'fim';
      conta_tempo := FALSE;
      is_counting := FALSE;
    ELSE
      tipo_evento := 'andamento';
      conta_tempo := is_counting;
    END IF;
    
    RETURN NEXT;
  END LOOP;
END;
$function$;