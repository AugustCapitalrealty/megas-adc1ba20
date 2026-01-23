
-- Dropar e recriar função com valores corretos do enum
DROP FUNCTION IF EXISTS public.get_sla_dashboard(DATE, DATE, empreendimento, TEXT);

CREATE OR REPLACE FUNCTION public.get_sla_dashboard(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_empreendimento empreendimento DEFAULT NULL,
  p_status_sla TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  protocolo TEXT,
  created_at TIMESTAMPTZ,
  solicitante_nome TEXT,
  solicitante_email TEXT,
  status request_status,
  empreendimento empreendimento,
  numero_chamado_fluig TEXT,
  dias_uteis_backoffice NUMERIC,
  passou_cadastro BOOLEAN,
  data_fluig_rm TIMESTAMPTZ,
  status_sla TEXT,
  sla_estourado BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  sla_info JSON;
BEGIN
  FOR rec IN
    SELECT 
      s.id,
      s.protocolo,
      s.created_at,
      p.full_name as solicitante_nome,
      p.email as solicitante_email,
      s.status,
      s.empreendimento,
      s.numero_chamado_fluig
    FROM solicitacoes s
    LEFT JOIN profiles p ON p.id = s.user_id
    WHERE 
      (p_data_inicio IS NULL OR s.created_at::DATE >= p_data_inicio)
      AND (p_data_fim IS NULL OR s.created_at::DATE <= p_data_fim)
      AND (p_empreendimento IS NULL OR s.empreendimento = p_empreendimento)
      AND s.status NOT IN ('cancelado', 'rejeitado')
    ORDER BY s.created_at DESC
  LOOP
    sla_info := calcular_sla_solicitacao(rec.id);
    
    IF p_status_sla IS NOT NULL AND sla_info->>'status_sla' != p_status_sla THEN
      CONTINUE;
    END IF;
    
    id := rec.id;
    protocolo := rec.protocolo;
    created_at := rec.created_at;
    solicitante_nome := rec.solicitante_nome;
    solicitante_email := rec.solicitante_email;
    status := rec.status;
    empreendimento := rec.empreendimento;
    numero_chamado_fluig := rec.numero_chamado_fluig;
    dias_uteis_backoffice := (sla_info->>'dias_uteis_backoffice')::NUMERIC;
    passou_cadastro := (sla_info->>'passou_cadastro')::BOOLEAN;
    data_fluig_rm := (sla_info->>'data_fluig_rm')::TIMESTAMPTZ;
    status_sla := sla_info->>'status_sla';
    sla_estourado := (sla_info->>'sla_estourado')::BOOLEAN;
    
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Também corrigir a função calcular_sla_solicitacao
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
     AND status_atual NOT IN ('pendente_correcao', 'aguardando_informacoes', 'concluida', 'cancelado', 'rejeitado') THEN
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
$$;
