
CREATE OR REPLACE FUNCTION public.track_pendente_correcao_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se está entrando em pendente_correcao ou aguardando_informacoes
  IF NEW.status IN ('pendente_correcao', 'aguardando_informacoes') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('pendente_correcao', 'aguardando_informacoes')) THEN
    NEW.data_pendente_correcao = NOW();
  -- Se está saindo de pendente_correcao ou aguardando_informacoes
  ELSIF NEW.status NOT IN ('pendente_correcao', 'aguardando_informacoes') 
        AND OLD.status IN ('pendente_correcao', 'aguardando_informacoes') THEN
    NEW.data_pendente_correcao = NULL;
  END IF;
  RETURN NEW;
END;
$function$;
