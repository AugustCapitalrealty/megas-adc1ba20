-- Segurança: proteger protocolo_counters e fixar search_path em funções

ALTER TABLE public.protocolo_counters ENABLE ROW LEVEL SECURITY;

-- Não criar policies: ninguém acessa via API. Acesso ocorre via triggers/funções com SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_protocolo()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ano TEXT;
  v_seq INTEGER;
BEGIN
  v_ano := to_char(now(), 'YYYY');

  INSERT INTO public.protocolo_counters (ano, last_seq)
  VALUES (v_ano, 1)
  ON CONFLICT (ano)
  DO UPDATE SET last_seq = public.protocolo_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN v_ano || lpad(v_seq::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_protocolo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.protocolo IS NULL OR btrim(NEW.protocolo) = '' THEN
    NEW.protocolo := public.generate_protocolo();
  END IF;
  RETURN NEW;
END;
$$;