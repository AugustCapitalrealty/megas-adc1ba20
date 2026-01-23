
-- Dropar função antiga para permitir mudança de assinatura
DROP FUNCTION IF EXISTS public.get_sla_timeline(uuid);

-- Criar função para calcular horas úteis com precisão de minutos
CREATE OR REPLACE FUNCTION public.calcular_horas_uteis(
  p_data_inicio TIMESTAMPTZ,
  p_data_fim TIMESTAMPTZ DEFAULT NOW()
) RETURNS NUMERIC
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  total_minutos NUMERIC := 0;
  hora_inicio_jornada INTEGER := 8;
  hora_fim_jornada INTEGER := 18;
  minutos_por_dia INTEGER := 600;
  data_atual DATE;
  inicio_util TIMESTAMPTZ;
  fim_util TIMESTAMPTZ;
  minutos_dia NUMERIC;
BEGIN
  IF p_data_fim <= p_data_inicio THEN
    RETURN 0;
  END IF;
  
  data_atual := p_data_inicio::DATE;
  
  WHILE data_atual <= p_data_fim::DATE LOOP
    IF EXTRACT(DOW FROM data_atual) NOT IN (0, 6) THEN
      IF NOT EXISTS (SELECT 1 FROM feriados WHERE data = data_atual) THEN
        inicio_util := data_atual + (hora_inicio_jornada || ' hours')::INTERVAL;
        fim_util := data_atual + (hora_fim_jornada || ' hours')::INTERVAL;
        
        IF data_atual = p_data_inicio::DATE THEN
          inicio_util := GREATEST(inicio_util, p_data_inicio);
        END IF;
        
        IF data_atual = p_data_fim::DATE THEN
          fim_util := LEAST(fim_util, p_data_fim);
        END IF;
        
        inicio_util := GREATEST(inicio_util, data_atual + (hora_inicio_jornada || ' hours')::INTERVAL);
        fim_util := LEAST(fim_util, data_atual + (hora_fim_jornada || ' hours')::INTERVAL);
        
        IF fim_util > inicio_util THEN
          minutos_dia := EXTRACT(EPOCH FROM (fim_util - inicio_util)) / 60;
          total_minutos := total_minutos + minutos_dia;
        END IF;
      END IF;
    END IF;
    data_atual := data_atual + INTERVAL '1 day';
  END LOOP;
  
  RETURN ROUND(total_minutos / minutos_por_dia::NUMERIC, 1);
END;
$$;

-- Atualizar função principal de cálculo de SLA
CREATE OR REPLACE FUNCTION public.calcular_sla_solicitacao(p_solicitacao_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    IF rec.status_novo IN ('pendente_correcao', 'aguardando_informacoes') THEN
      IF em_contagem AND data_inicio IS NOT NULL THEN
        tempo_backoffice := tempo_backoffice + calcular_horas_uteis(data_inicio, rec.created_at);
      END IF;
      em_contagem := FALSE;
      data_inicio := NULL;
    END IF;
    
    IF rec.status_anterior IN ('pendente_correcao', 'aguardando_informacoes') 
       AND rec.status_novo IN ('recebido', 'em_analise') THEN
      em_contagem := TRUE;
      data_inicio := rec.created_at;
      tempo_backoffice := 0;
    END IF;

    IF rec.acao ILIKE '%cadastro solicitado%' OR rec.acao ILIKE '%cadastro concluído%' THEN
      passou_cadastro := TRUE;
    END IF;

    IF rec.acao LIKE 'numero_fluig%' AND data_fluig_rm IS NULL THEN
      IF em_contagem AND data_inicio IS NOT NULL THEN
        tempo_backoffice := tempo_backoffice + calcular_horas_uteis(data_inicio, rec.created_at);
      END IF;
      data_fluig_rm := rec.created_at;
      em_contagem := FALSE;
      data_inicio := NULL;
    END IF;

    IF rec.status_novo = 'concluida' THEN
      IF em_contagem AND data_inicio IS NOT NULL THEN
        tempo_backoffice := tempo_backoffice + calcular_horas_uteis(data_inicio, rec.created_at);
      END IF;
      data_finalizacao := rec.created_at;
      em_contagem := FALSE;
      data_inicio := NULL;
    END IF;
  END LOOP;
  
  IF em_contagem AND data_inicio IS NOT NULL 
     AND status_atual NOT IN ('pendente_correcao', 'aguardando_informacoes', 'concluida', 'cancelada', 'rejeitada') THEN
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
      WHEN tempo_backoffice = 3 THEN 'atencao'
      ELSE 'estourado'
    END
  );
END;
$$;

-- Recriar função get_sla_timeline com tipo correto
CREATE OR REPLACE FUNCTION public.get_sla_timeline(p_solicitacao_id uuid)
RETURNS TABLE(
  created_at TIMESTAMPTZ,
  acao TEXT,
  status_anterior TEXT,
  status_novo TEXT,
  usuario_nome TEXT,
  conta_tempo BOOLEAN,
  tipo_evento TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  is_counting BOOLEAN := TRUE;
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
    ELSIF rec.status_novo IN ('pendente_correcao', 'aguardando_informacoes') THEN
      tipo_evento := 'zera';
      conta_tempo := FALSE;
      is_counting := FALSE;
    ELSIF rec.status_anterior IN ('pendente_correcao', 'aguardando_informacoes') 
          AND rec.status_novo IN ('recebido', 'em_analise') THEN
      tipo_evento := 'reinicio';
      conta_tempo := TRUE;
      is_counting := TRUE;
    ELSIF rec.acao LIKE 'numero_fluig%' THEN
      tipo_evento := 'fim';
      conta_tempo := FALSE;
      is_counting := FALSE;
    ELSIF rec.status_novo IN ('concluida', 'cancelada', 'rejeitada') THEN
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
$$;
