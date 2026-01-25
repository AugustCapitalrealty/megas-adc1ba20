-- Corrigir bug do data_fluig_rm no reinício de SLA
-- O problema era que data_fluig_rm não era resetado junto com tempo_backoffice
-- E a condição IS NULL impedia capturar o segundo Fluig após reinício

DROP FUNCTION IF EXISTS public.calcular_sla_solicitacao(uuid);

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
    -- Quando entra em status que pausa a contagem
    IF rec.status_novo IN ('pendente_correcao', 'aguardando_informacoes') THEN
      IF em_contagem AND data_inicio IS NOT NULL THEN
        tempo_backoffice := tempo_backoffice + calcular_horas_uteis(data_inicio, rec.created_at);
      END IF;
      em_contagem := FALSE;
      data_inicio := NULL;
    END IF;
    
    -- CORREÇÃO: Quando solicitante responde, resetar TUDO para novo ciclo
    IF rec.status_anterior IN ('pendente_correcao', 'aguardando_informacoes') 
       AND rec.status_novo IN ('recebido', 'em_analise') THEN
      em_contagem := TRUE;
      data_inicio := rec.created_at;
      tempo_backoffice := 0;
      data_fluig_rm := NULL;  -- Reseta o data_fluig_rm também!
    END IF;

    IF rec.acao ILIKE '%cadastro solicitado%' OR rec.acao ILIKE '%cadastro concluído%' THEN
      passou_cadastro := TRUE;
    END IF;

    -- CORREÇÃO: Removida condição IS NULL - sempre captura o Fluig do ciclo atual
    IF rec.acao LIKE 'numero_fluig%' THEN
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
  
  -- Se ainda está em contagem e não finalizou
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
$function$;