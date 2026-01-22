-- ===========================================
-- DASHBOARD SLA - Migração Completa
-- ===========================================

-- 1. Tabela de Feriados
CREATE TABLE public.feriados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  empreendimento empreendimento DEFAULT NULL, -- NULL = todos os empreendimentos
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para feriados
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode gerenciar feriados"
  ON public.feriados FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuarios autenticados podem ver feriados"
  ON public.feriados FOR SELECT
  TO authenticated
  USING (true);

-- Inserir alguns feriados nacionais de 2025/2026
INSERT INTO public.feriados (data, descricao) VALUES
  ('2025-01-01', 'Confraternização Universal'),
  ('2025-04-18', 'Sexta-feira Santa'),
  ('2025-04-21', 'Tiradentes'),
  ('2025-05-01', 'Dia do Trabalhador'),
  ('2025-09-07', 'Independência do Brasil'),
  ('2025-10-12', 'Nossa Senhora Aparecida'),
  ('2025-11-02', 'Finados'),
  ('2025-11-15', 'Proclamação da República'),
  ('2025-12-25', 'Natal'),
  ('2026-01-01', 'Confraternização Universal'),
  ('2026-04-03', 'Sexta-feira Santa'),
  ('2026-04-21', 'Tiradentes'),
  ('2026-05-01', 'Dia do Trabalhador'),
  ('2026-09-07', 'Independência do Brasil'),
  ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'),
  ('2026-11-15', 'Proclamação da República'),
  ('2026-12-25', 'Natal');

-- 2. Função para calcular dias úteis entre duas datas
CREATE OR REPLACE FUNCTION public.calcular_dias_uteis(
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  dias INTEGER := 0;
  data_atual DATE := data_inicio::DATE;
  data_final DATE := COALESCE(data_fim::DATE, CURRENT_DATE);
BEGIN
  -- Se data_fim é anterior a data_inicio, retorna 0
  IF data_final < data_atual THEN
    RETURN 0;
  END IF;

  WHILE data_atual <= data_final LOOP
    -- Verificar se não é fim de semana (0=Domingo, 6=Sábado)
    IF EXTRACT(DOW FROM data_atual) NOT IN (0, 6) THEN
      -- Verificar se não é feriado
      IF NOT EXISTS (
        SELECT 1 FROM public.feriados 
        WHERE data = data_atual
      ) THEN
        dias := dias + 1;
      END IF;
    END IF;
    data_atual := data_atual + 1;
  END LOOP;
  
  RETURN dias;
END;
$$;

-- 3. Função para calcular SLA de uma solicitação específica
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
  inicio_contagem TIMESTAMPTZ;
  passou_cadastro BOOLEAN := FALSE;
  data_fluig_rm TIMESTAMPTZ := NULL;
  data_finalizacao TIMESTAMPTZ := NULL;
  rec RECORD;
  sol_record RECORD;
BEGIN
  -- Buscar dados da solicitação
  SELECT created_at, status, numero_chamado_fluig 
  INTO sol_record
  FROM public.solicitacoes 
  WHERE id = p_solicitacao_id;

  -- Iniciar contagem a partir da criação
  inicio_contagem := sol_record.created_at;

  -- Iterar sobre o histórico ordenado
  FOR rec IN (
    SELECT 
      created_at,
      status_anterior,
      status_novo,
      acao
    FROM public.historico_solicitacoes
    WHERE solicitacao_id = p_solicitacao_id
    ORDER BY created_at
  ) LOOP
    -- Pausa: backoffice devolveu para solicitante
    IF rec.status_novo IN ('pendente_correcao', 'aguardando_informacoes') THEN
      IF inicio_contagem IS NOT NULL THEN
        tempo_backoffice := tempo_backoffice + public.calcular_dias_uteis(inicio_contagem, rec.created_at);
        inicio_contagem := NULL;
      END IF;
    END IF;

    -- Retomada: solicitante devolveu correção
    IF rec.status_anterior IN ('pendente_correcao', 'aguardando_informacoes') 
       AND rec.status_novo NOT IN ('pendente_correcao', 'aguardando_informacoes', 'rejeitado', 'cancelado') THEN
      inicio_contagem := rec.created_at;
    END IF;

    -- Verifica se passou pelo cadastro/processamento
    IF rec.status_novo = 'em_processamento' THEN
      passou_cadastro := TRUE;
    END IF;

    -- Fim: número Fluig adicionado
    IF rec.acao LIKE 'numero_fluig%' AND data_fluig_rm IS NULL THEN
      IF inicio_contagem IS NOT NULL THEN
        tempo_backoffice := tempo_backoffice + public.calcular_dias_uteis(inicio_contagem, rec.created_at);
        inicio_contagem := NULL;
      END IF;
      data_fluig_rm := rec.created_at;
    END IF;

    -- Fim: rejeitado ou cancelado
    IF rec.status_novo IN ('rejeitado') THEN
      IF inicio_contagem IS NOT NULL THEN
        tempo_backoffice := tempo_backoffice + public.calcular_dias_uteis(inicio_contagem, rec.created_at);
        inicio_contagem := NULL;
      END IF;
      data_finalizacao := rec.created_at;
    END IF;
  END LOOP;

  -- Se número fluig já existe na solicitação mas não encontramos no histórico
  IF data_fluig_rm IS NULL AND sol_record.numero_chamado_fluig IS NOT NULL THEN
    -- Buscar quando foi adicionado
    SELECT created_at INTO data_fluig_rm
    FROM public.historico_solicitacoes
    WHERE solicitacao_id = p_solicitacao_id
      AND acao = 'numero_fluig_adicionado'
    ORDER BY created_at
    LIMIT 1;
    
    IF data_fluig_rm IS NOT NULL AND inicio_contagem IS NOT NULL THEN
      tempo_backoffice := tempo_backoffice + public.calcular_dias_uteis(inicio_contagem, data_fluig_rm);
      inicio_contagem := NULL;
    END IF;
  END IF;

  -- Se ainda não finalizou e cronômetro está rodando, calcular até agora
  IF data_fluig_rm IS NULL AND data_finalizacao IS NULL AND inicio_contagem IS NOT NULL THEN
    -- Verificar se não está pausado atualmente
    IF sol_record.status NOT IN ('pendente_correcao', 'aguardando_informacoes', 'rejeitado') THEN
      tempo_backoffice := tempo_backoffice + public.calcular_dias_uteis(inicio_contagem, NOW());
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

-- 4. Função RPC para buscar dados do dashboard de SLA
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
  dias_uteis_backoffice INTEGER,
  passou_cadastro BOOLEAN,
  data_fluig_rm TIMESTAMPTZ,
  status_sla TEXT,
  sla_estourado BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  sla_info JSON;
BEGIN
  -- Verificar se é admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem acessar o dashboard de SLA.';
  END IF;

  FOR rec IN (
    SELECT 
      s.id,
      s.protocolo,
      s.created_at,
      p.full_name as solicitante_nome,
      p.email as solicitante_email,
      s.status,
      s.empreendimento,
      s.numero_chamado_fluig
    FROM public.solicitacoes s
    LEFT JOIN public.profiles p ON s.user_id = p.id
    WHERE 
      (p_data_inicio IS NULL OR s.created_at::DATE >= p_data_inicio)
      AND (p_data_fim IS NULL OR s.created_at::DATE <= p_data_fim)
      AND (p_empreendimento IS NULL OR s.empreendimento = p_empreendimento)
    ORDER BY s.created_at DESC
  ) LOOP
    -- Calcular SLA para cada solicitação
    sla_info := public.calcular_sla_solicitacao(rec.id);
    
    -- Filtrar por status SLA se especificado
    IF p_status_sla IS NULL OR (sla_info->>'status_sla') = p_status_sla THEN
      id := rec.id;
      protocolo := rec.protocolo;
      created_at := rec.created_at;
      solicitante_nome := rec.solicitante_nome;
      solicitante_email := rec.solicitante_email;
      status := rec.status;
      empreendimento := rec.empreendimento;
      numero_chamado_fluig := rec.numero_chamado_fluig;
      dias_uteis_backoffice := (sla_info->>'dias_uteis_backoffice')::INTEGER;
      passou_cadastro := (sla_info->>'passou_cadastro')::BOOLEAN;
      data_fluig_rm := (sla_info->>'data_fluig_rm')::TIMESTAMPTZ;
      status_sla := sla_info->>'status_sla';
      sla_estourado := (sla_info->>'sla_estourado')::BOOLEAN;
      
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- 5. Função para buscar timeline de SLA de uma solicitação
CREATE OR REPLACE FUNCTION public.get_sla_timeline(p_solicitacao_id UUID)
RETURNS TABLE (
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
  -- Verificar se é admin
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
      -- Criação sempre inicia contagem
      WHEN h.acao = 'solicitacao_criada' THEN TRUE
      -- Pausas
      WHEN h.status_novo IN ('pendente_correcao', 'aguardando_informacoes') THEN FALSE
      -- Retorno de pausa
      WHEN h.status_anterior IN ('pendente_correcao', 'aguardando_informacoes') 
           AND h.status_novo NOT IN ('pendente_correcao', 'aguardando_informacoes', 'rejeitado') THEN TRUE
      -- Fluig adicionado = fim
      WHEN h.acao LIKE 'numero_fluig%' THEN FALSE
      -- Rejeitado = fim
      WHEN h.status_novo = 'rejeitado' THEN FALSE
      -- Outros continuam
      ELSE TRUE
    END as conta_tempo,
    -- Tipo do evento para visual
    CASE
      WHEN h.acao = 'solicitacao_criada' THEN 'inicio'
      WHEN h.status_novo IN ('pendente_correcao', 'aguardando_informacoes') THEN 'pausa'
      WHEN h.status_anterior IN ('pendente_correcao', 'aguardando_informacoes') THEN 'retomada'
      WHEN h.acao LIKE 'numero_fluig%' THEN 'fim'
      WHEN h.status_novo = 'rejeitado' THEN 'fim'
      ELSE 'andamento'
    END as tipo_evento
  FROM public.historico_solicitacoes h
  LEFT JOIN public.profiles p ON h.user_id = p.id
  WHERE h.solicitacao_id = p_solicitacao_id
  ORDER BY h.created_at;
END;
$$;