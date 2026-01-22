-- Atualizar funcao calcular_sla_solicitacao com logica de ZERAR (nao pausar)
CREATE OR REPLACE FUNCTION public.calcular_sla_solicitacao(p_solicitacao_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  resultado JSON;
  tempo_backoffice INTEGER := 0;
  inicio_contagem TIMESTAMPTZ := NULL;
  passou_cadastro BOOLEAN := FALSE;
  data_fluig_rm TIMESTAMPTZ := NULL;
  data_finalizacao TIMESTAMPTZ := NULL;
  rec RECORD;
  sol_record RECORD;
BEGIN
  -- Buscar dados da solicitacao
  SELECT created_at, status, numero_chamado_fluig 
  INTO sol_record
  FROM public.solicitacoes 
  WHERE id = p_solicitacao_id;

  -- Iniciar contagem a partir da criacao
  inicio_contagem := sol_record.created_at;

  FOR rec IN (
    SELECT created_at, status_anterior, status_novo, acao
    FROM public.historico_solicitacoes
    WHERE solicitacao_id = p_solicitacao_id
    ORDER BY created_at
  ) LOOP
  
    -- ZERA: backoffice devolveu para solicitante (tempo anterior descartado)
    IF rec.status_novo IN ('pendente_correcao', 'aguardando_informacoes') THEN
      tempo_backoffice := 0;
      inicio_contagem := NULL;
    END IF;

    -- REINICIA: solicitante devolveu correcao (nova contagem do zero)
    IF rec.status_anterior IN ('pendente_correcao', 'aguardando_informacoes') 
       AND rec.status_novo NOT IN ('pendente_correcao', 'aguardando_informacoes', 'rejeitado', 'cancelado') THEN
      inicio_contagem := rec.created_at;
      tempo_backoffice := 0;
    END IF;

    -- Verifica se passou pelo cadastro
    IF rec.status_novo = 'em_processamento' THEN
      passou_cadastro := TRUE;
    END IF;

    -- FIM: numero Fluig adicionado
    IF rec.acao LIKE 'numero_fluig%' AND data_fluig_rm IS NULL THEN
      IF inicio_contagem IS NOT NULL THEN
        tempo_backoffice := public.calcular_dias_uteis(inicio_contagem, rec.created_at);
      END IF;
      data_fluig_rm := rec.created_at;
      inicio_contagem := NULL;
    END IF;

    -- FIM: rejeitado
    IF rec.status_novo = 'rejeitado' THEN
      IF inicio_contagem IS NOT NULL THEN
        tempo_backoffice := public.calcular_dias_uteis(inicio_contagem, rec.created_at);
      END IF;
      data_finalizacao := rec.created_at;
      inicio_contagem := NULL;
    END IF;

    -- FIM: cancelado
    IF rec.status_novo = 'cancelado' THEN
      IF inicio_contagem IS NOT NULL THEN
        tempo_backoffice := public.calcular_dias_uteis(inicio_contagem, rec.created_at);
      END IF;
      data_finalizacao := rec.created_at;
      inicio_contagem := NULL;
    END IF;
  END LOOP;

  -- Se numero fluig ja existe mas nao encontramos no historico
  IF data_fluig_rm IS NULL AND sol_record.numero_chamado_fluig IS NOT NULL THEN
    SELECT created_at INTO data_fluig_rm
    FROM public.historico_solicitacoes
    WHERE solicitacao_id = p_solicitacao_id
      AND acao = 'numero_fluig_adicionado'
    ORDER BY created_at
    LIMIT 1;
    
    IF data_fluig_rm IS NOT NULL AND inicio_contagem IS NOT NULL THEN
      tempo_backoffice := public.calcular_dias_uteis(inicio_contagem, data_fluig_rm);
      inicio_contagem := NULL;
    END IF;
  END IF;

  -- Se ainda nao finalizou e cronometro esta rodando
  IF data_fluig_rm IS NULL AND data_finalizacao IS NULL AND inicio_contagem IS NOT NULL THEN
    IF sol_record.status NOT IN ('pendente_correcao', 'aguardando_informacoes', 'rejeitado', 'cancelado') THEN
      tempo_backoffice := public.calcular_dias_uteis(inicio_contagem, NOW());
    END IF;
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

-- Atualizar funcao get_sla_timeline com eventos "zera" e "reinicio"
CREATE OR REPLACE FUNCTION public.get_sla_timeline(p_solicitacao_id UUID)
RETURNS TABLE(
  created_at TIMESTAMPTZ,
  acao TEXT,
  status_anterior request_status,
  status_novo request_status,
  usuario_nome TEXT,
  conta_tempo BOOLEAN,
  tipo_evento TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se e admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  RETURN QUERY
  SELECT 
    h.created_at,
    h.acao,
    h.status_anterior,
    h.status_novo,
    p.full_name as usuario_nome,
    -- Determinar se conta tempo
    CASE
      -- Criacao sempre inicia contagem
      WHEN h.acao = 'solicitacao_criada' THEN TRUE
      -- Backoffice devolve = ZERA (nao conta mais o anterior)
      WHEN h.status_novo IN ('pendente_correcao', 'aguardando_informacoes') THEN FALSE
      -- Solicitante devolve = REINICIA contagem
      WHEN h.status_anterior IN ('pendente_correcao', 'aguardando_informacoes') 
           AND h.status_novo NOT IN ('pendente_correcao', 'aguardando_informacoes', 'rejeitado', 'cancelado') THEN TRUE
      -- Fluig adicionado = fim
      WHEN h.acao LIKE 'numero_fluig%' THEN FALSE
      -- Rejeitado/Cancelado = fim
      WHEN h.status_novo IN ('rejeitado', 'cancelado') THEN FALSE
      -- Outros continuam
      ELSE TRUE
    END as conta_tempo,
    -- Tipo do evento para visual
    CASE
      WHEN h.acao = 'solicitacao_criada' THEN 'inicio'
      WHEN h.status_novo IN ('pendente_correcao', 'aguardando_informacoes') THEN 'zera'
      WHEN h.status_anterior IN ('pendente_correcao', 'aguardando_informacoes') 
           AND h.status_novo NOT IN ('pendente_correcao', 'aguardando_informacoes', 'rejeitado', 'cancelado') THEN 'reinicio'
      WHEN h.acao LIKE 'numero_fluig%' THEN 'fim'
      WHEN h.status_novo IN ('rejeitado', 'cancelado') THEN 'fim'
      ELSE 'andamento'
    END as tipo_evento
  FROM public.historico_solicitacoes h
  LEFT JOIN public.profiles p ON h.user_id = p.id
  WHERE h.solicitacao_id = p_solicitacao_id
  ORDER BY h.created_at;
END;
$$;