
-- Dropar função para permitir mudança de tipo de retorno
DROP FUNCTION IF EXISTS public.get_sla_dashboard(DATE, DATE, empreendimento, TEXT);

-- Recriar função com tipo NUMERIC para dias_uteis_backoffice
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
      AND s.status NOT IN ('cancelada', 'rejeitada')
    ORDER BY s.created_at DESC
  LOOP
    -- Calcular SLA para esta solicitação
    sla_info := calcular_sla_solicitacao(rec.id);
    
    -- Aplicar filtro de status SLA se especificado
    IF p_status_sla IS NOT NULL AND sla_info->>'status_sla' != p_status_sla THEN
      CONTINUE;
    END IF;
    
    -- Atribuir valores de retorno
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
