-- Causa raiz: geração de protocolo via MAX(protocolo) pode colidir em cenários de concorrência/replicação.
-- Solução: contador atômico por ano com UPSERT + RETURNING.

CREATE TABLE IF NOT EXISTS public.protocolo_counters (
  ano TEXT PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protocolo_counters_touch_updated_at ON public.protocolo_counters;
CREATE TRIGGER protocolo_counters_touch_updated_at
BEFORE UPDATE ON public.protocolo_counters
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- Nova geração de protocolo: atômica por ano
CREATE OR REPLACE FUNCTION public.generate_protocolo()
RETURNS text
LANGUAGE plpgsql
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

-- Garante protocolo em NULL ou string vazia
CREATE OR REPLACE FUNCTION public.set_protocolo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.protocolo IS NULL OR btrim(NEW.protocolo) = '' THEN
    NEW.protocolo := public.generate_protocolo();
  END IF;
  RETURN NEW;
END;
$$;

-- Remover trigger duplicado, manter apenas um BEFORE INSERT
DROP TRIGGER IF EXISTS set_solicitacao_protocolo ON public.solicitacoes;

DROP TRIGGER IF EXISTS set_protocolo_trigger ON public.solicitacoes;
CREATE TRIGGER set_protocolo_trigger
  BEFORE INSERT ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_protocolo();

COMMENT ON FUNCTION public.generate_protocolo() IS 'Gera protocolo anual (YYYY + 6 dígitos) usando contador atômico por ano.';