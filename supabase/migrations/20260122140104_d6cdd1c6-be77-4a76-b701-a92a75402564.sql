-- Drop e recria a função com o nome de parâmetro correto
DROP FUNCTION IF EXISTS public.calcular_sla_solicitacao(uuid);

-- Recria a função calcular_sla_solicitacao para usar novas ações de cadastro
CREATE OR REPLACE FUNCTION public.calcular_sla_solicitacao(p_solicitacao_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  tempo_backoffice INTEGER := 0;
  passou_cadastro BOOLEAN := FALSE;
  data_fluig_rm TIMESTAMP WITH TIME ZONE := NULL;
  data_finalizacao TIMESTAMP WITH TIME ZONE := NULL;
  em_contagem BOOLEAN := TRUE;
  data_inicio TIMESTAMP WITH TIME ZONE := NULL;
  sol RECORD;
BEGIN
  -- Busca data de criação e status atual da solicitação
  SELECT created_at, status INTO sol
  FROM solicitacoes
  WHERE id = p_solicitacao_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Solicitação não encontrada');
  END IF;
  
  data_inicio := sol.created_at;
  
  -- Itera pelo histórico em ordem cronológica
  FOR rec IN
    SELECT * FROM historico_solicitacoes
    WHERE solicitacao_id = p_solicitacao_id
    ORDER BY created_at ASC
  LOOP
    -- Quando volta para correção, RESETA o contador
    IF rec.status_novo = 'pendente_correcao' THEN
      em_contagem := FALSE;
    END IF;
    
    -- Quando sai de correção, REINICIA a contagem
    IF rec.status_anterior = 'pendente_correcao' AND rec.status_novo IN ('recebido', 'em_analise') THEN
      em_contagem := TRUE;
      data_inicio := rec.created_at;
      tempo_backoffice := 0;
    END IF;

    -- Verifica se passou pelo cadastro através das NOVAS AÇÕES
    -- (não mais pelo status em_processamento)
    IF rec.acao ILIKE '%cadastro solicitado%' OR rec.acao ILIKE '%cadastro%contabilidade%' OR rec.acao ILIKE '%cadastro concluído%' THEN
      passou_cadastro := TRUE;
    END IF;

    -- FIM: numero Fluig adicionado
    IF rec.acao LIKE 'numero_fluig%' AND data_fluig_rm IS NULL THEN
      data_fluig_rm := rec.created_at;
    END IF;
    
    -- RM manual também finaliza
    IF rec.acao LIKE '%RM%' AND rec.acao LIKE '%fluig%' AND data_fluig_rm IS NULL THEN
      data_fluig_rm := rec.created_at;
    END IF;

    -- Conclusão
    IF rec.status_novo = 'concluida' THEN
      data_finalizacao := rec.created_at;
    END IF;
  END LOOP;
  
  -- Calcula dias úteis entre início e agora (ou data Fluig/RM)
  IF data_fluig_rm IS NOT NULL THEN
    tempo_backoffice := calcular_dias_uteis(data_inicio, data_fluig_rm);
  ELSIF data_finalizacao IS NOT NULL THEN
    tempo_backoffice := calcular_dias_uteis(data_inicio, data_finalizacao);
  ELSE
    tempo_backoffice := calcular_dias_uteis(data_inicio, NOW());
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