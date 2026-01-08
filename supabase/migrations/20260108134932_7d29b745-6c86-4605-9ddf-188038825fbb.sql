-- =========================================
-- PROTOCOLO ANUAL ATÔMICO (YYYY + 6 dígitos)
-- Com UPSERT + RETURNING e funções SECURITY DEFINER
-- =========================================

BEGIN;

-- 1) Tabela de contador por ano
CREATE TABLE IF NOT EXISTS public.protocolo_counters (
  ano text PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Função para tocar updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 3) Trigger updated_at na tabela de counters
DROP TRIGGER IF EXISTS protocolo_counters_touch_updated_at ON public.protocolo_counters;
CREATE TRIGGER protocolo_counters_touch_updated_at
BEFORE UPDATE ON public.protocolo_counters
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- 4) Função atômica de geração do protocolo (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.generate_protocolo()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ano text;
  v_seq integer;
BEGIN
  v_ano := to_char(now(), 'YYYY');

  INSERT INTO public.protocolo_counters (ano, last_seq)
  VALUES (v_ano, 1)
  ON CONFLICT (ano)
  DO UPDATE
    SET last_seq = public.protocolo_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN v_ano || lpad(v_seq::text, 6, '0');
END;
$$;

COMMENT ON FUNCTION public.generate_protocolo()
IS 'Gera protocolo anual (YYYY + 6 dígitos) usando contador atômico por ano.';

-- 5) Trigger function: setar protocolo no INSERT, se estiver vazio/NULL
CREATE OR REPLACE FUNCTION public.set_protocolo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.protocolo IS NULL OR btrim(NEW.protocolo) = '' THEN
    NEW.protocolo := public.generate_protocolo();
  END IF;

  RETURN NEW;
END;
$$;

-- 6) Garantir que não existe trigger duplicada e criar a correta
DROP TRIGGER IF EXISTS set_solicitacao_protocolo ON public.solicitacoes;
DROP TRIGGER IF EXISTS set_protocolo_trigger ON public.solicitacoes;

CREATE TRIGGER set_protocolo_trigger
BEFORE INSERT ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.set_protocolo();

-- 7) Ajuste de owner (IMPORTANTE no Supabase/RLS)
-- Se você não tiver permissão pra alterar owner, pode comentar estas 2 linhas.
ALTER FUNCTION public.generate_protocolo() OWNER TO postgres;
ALTER FUNCTION public.set_protocolo() OWNER TO postgres;

-- 8) Permitir execução das funções para as roles do app
-- Ajuste conforme seu projeto (por ex.: authenticated/anon).
GRANT EXECUTE ON FUNCTION public.generate_protocolo() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_protocolo() TO authenticated, anon;

COMMIT;
