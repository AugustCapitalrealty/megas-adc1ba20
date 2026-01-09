-- 1. Tornar protocolo nullable para permitir INSERT sem valor
ALTER TABLE public.solicitacoes
ALTER COLUMN protocolo DROP NOT NULL;

-- 2. Definir default vazio para o campo (trigger irá sobrescrever)
ALTER TABLE public.solicitacoes
ALTER COLUMN protocolo SET DEFAULT '';

-- 3. Atualizar função set_protocolo para garantir geração correta
CREATE OR REPLACE FUNCTION public.set_protocolo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Sempre gerar protocolo se vier nulo ou vazio
  IF NEW.protocolo IS NULL OR btrim(NEW.protocolo) = '' THEN
    NEW.protocolo := public.generate_protocolo();
  END IF;
  RETURN NEW;
END;
$function$;