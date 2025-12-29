-- Corrigir race condition na geração de protocolo usando advisory lock
CREATE OR REPLACE FUNCTION public.generate_protocolo()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  ano TEXT;
  seq INTEGER;
  novo_protocolo TEXT;
BEGIN
  -- Obter lock exclusivo para geração de protocolo
  -- O número 12345 é um ID arbitrário para este lock específico
  -- Isso previne que duas transações simultâneas gerem o mesmo protocolo
  PERFORM pg_advisory_xact_lock(12345);
  
  ano := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(protocolo FROM 5 FOR 6) AS INTEGER)), 0) + 1
  INTO seq
  FROM public.solicitacoes
  WHERE protocolo LIKE ano || '%';
  
  novo_protocolo := ano || LPAD(seq::TEXT, 6, '0');
  RETURN novo_protocolo;
END;
$$;