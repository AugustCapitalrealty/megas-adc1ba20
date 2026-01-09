-- URGENTE: Backfill protocolo_counters com o maior sequencial já utilizado por ano
-- Isso corrige o problema de protocolo duplicado causando erro 409

-- 1. Inserir/Atualizar contadores baseado nos protocolos existentes
INSERT INTO public.protocolo_counters (ano, last_seq)
SELECT 
  LEFT(protocolo, 4) as ano,
  MAX(CAST(RIGHT(protocolo, 6) AS INTEGER)) as last_seq
FROM public.solicitacoes
WHERE protocolo IS NOT NULL 
  AND protocolo != ''
  AND LENGTH(protocolo) = 10
  AND protocolo ~ '^[0-9]{10}$'
GROUP BY LEFT(protocolo, 4)
ON CONFLICT (ano) 
DO UPDATE SET 
  last_seq = GREATEST(protocolo_counters.last_seq, EXCLUDED.last_seq),
  updated_at = now();

-- 2. Reforçar generate_protocolo() para evitar duplicatas mesmo em casos extremos
CREATE OR REPLACE FUNCTION public.generate_protocolo()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ano TEXT;
  v_seq INTEGER;
  v_protocolo TEXT;
  v_max_attempts INTEGER := 100;
  v_attempt INTEGER := 0;
BEGIN
  v_ano := to_char(now(), 'YYYY');

  LOOP
    v_attempt := v_attempt + 1;
    
    -- Incrementar contador
    INSERT INTO public.protocolo_counters (ano, last_seq)
    VALUES (v_ano, 1)
    ON CONFLICT (ano)
    DO UPDATE SET last_seq = public.protocolo_counters.last_seq + 1
    RETURNING last_seq INTO v_seq;

    v_protocolo := v_ano || lpad(v_seq::text, 6, '0');
    
    -- Verificar se já existe (proteção extra)
    IF NOT EXISTS (SELECT 1 FROM public.solicitacoes WHERE protocolo = v_protocolo) THEN
      RETURN v_protocolo;
    END IF;
    
    -- Proteção contra loop infinito
    IF v_attempt >= v_max_attempts THEN
      RAISE EXCEPTION 'Não foi possível gerar protocolo único após % tentativas', v_max_attempts;
    END IF;
  END LOOP;
END;
$function$;