-- Corrigir search_path das funções
CREATE OR REPLACE FUNCTION public.generate_protocolo()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  ano TEXT;
  seq INTEGER;
  novo_protocolo TEXT;
BEGIN
  ano := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(protocolo FROM 5 FOR 6) AS INTEGER)), 0) + 1
  INTO seq
  FROM public.solicitacoes
  WHERE protocolo LIKE ano || '%';
  
  novo_protocolo := ano || LPAD(seq::TEXT, 6, '0');
  RETURN novo_protocolo;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_protocolo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.protocolo IS NULL THEN
    NEW.protocolo := public.generate_protocolo();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;