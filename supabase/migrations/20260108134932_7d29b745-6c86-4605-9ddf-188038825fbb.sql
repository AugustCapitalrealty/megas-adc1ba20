BEGIN;

-- =========================================
-- PROTOCOLO ALEATÓRIO (SEM DATA) + TRIGGER
-- Usa pgcrypto (gen_random_bytes) e gera 16 chars HEX (ex.: A1B2C3D4E5F60789)
-- =========================================

-- 1) Extensão necessária
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Função: gera protocolo aleatório
CREATE OR REPLACE FUNCTION public.generate_protocolo_random()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code text;
BEGIN
  -- 8 bytes => 16 caracteres hex
  v_code := upper(encode(gen_random_bytes(8), 'hex'));
  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION public.generate_protocolo_random()
IS 'Gera protocolo aleatório (hex) usando gen_random_bytes().';

-- 3) Trigger function: seta protocolo se vier NULL/vazio
CREATE OR REPLACE FUNCTION public.set_protocolo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.protocolo IS NULL OR btrim(NEW.protocolo) = '' THEN
    NEW.protocolo := public.generate_protocolo_random();
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_protocolo()
IS 'Define protocolo automaticamente no INSERT quando protocolo estiver NULL/vazio.';

-- 4) Remove triggers antigas e cria só uma
DROP TRIGGER IF EXISTS set_solicitacao_protocolo ON public.solicitacoes;
DROP TRIGGER IF EXISTS set_protocolo_trigger ON public.solicitacoes;

CREATE TRIGGER set_protocolo_trigger
BEFORE INSERT ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.set_protocolo();

-- 5) Owner + grants (se você não tiver permissão para ALTER OWNER, comente estas 2 linhas)
ALTER FUNCTION public.generate_protocolo_random() OWNER TO postgres;
ALTER FUNCTION public.set_protocolo() OWNER TO postgres;

-- 6) Permissões para as roles do app (ajuste se necessário)
GRANT EXECUTE ON FUNCTION public.generate_protocolo_random() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_protocolo() TO authenticated, anon;

COMMIT;
