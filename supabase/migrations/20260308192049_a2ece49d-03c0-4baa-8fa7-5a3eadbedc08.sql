
-- ============================================================
-- MIGRATION 2: Fix function search_path + add super_admin role
-- ============================================================

-- Fix search_path on calcular_instrumento_juridico
CREATE OR REPLACE FUNCTION public.calcular_instrumento_juridico(p_valor numeric, p_obra_civil boolean, p_altura_risco boolean, p_fossa_filtro boolean, p_preco_variavel boolean)
 RETURNS instrumento_juridico
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_obra_civil = TRUE THEN
    RETURN 'contrato_empreitada';
  END IF;
  IF p_altura_risco = TRUE OR p_fossa_filtro = TRUE OR p_preco_variavel = TRUE THEN
    RETURN 'termo_contratacao';
  END IF;
  IF p_valor >= 70000 THEN
    RETURN 'contrato_prestacao';
  END IF;
  IF p_valor >= 10000 THEN
    RETURN 'termo_contratacao';
  END IF;
  RETURN 'oc';
END;
$function$;

-- Fix search_path on set_instrumento_juridico
CREATE OR REPLACE FUNCTION public.set_instrumento_juridico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tipo = 'OC' THEN
    NEW.instrumento_juridico := 'oc';
    NEW.requer_retencao_tecnica := FALSE;
    NEW.prazo_liberacao_retencao_dias := NULL;
    RETURN NEW;
  END IF;

  IF NEW.valor >= 10000 OR NEW.natureza_servico_obra_civil = TRUE OR 
     NEW.natureza_servico_altura_risco = TRUE OR NEW.natureza_servico_fossa_filtro = TRUE OR 
     NEW.natureza_servico_preco_variavel = TRUE THEN
    NEW.instrumento_juridico := calcular_instrumento_juridico(
      NEW.valor,
      COALESCE(NEW.natureza_servico_obra_civil, FALSE),
      COALESCE(NEW.natureza_servico_altura_risco, FALSE),
      COALESCE(NEW.natureza_servico_fossa_filtro, FALSE),
      COALESCE(NEW.natureza_servico_preco_variavel, FALSE)
    );
  ELSE
    NEW.instrumento_juridico := 'oc';
  END IF;
  
  IF NEW.instrumento_juridico = 'contrato_empreitada' THEN
    NEW.requer_retencao_tecnica := TRUE;
    NEW.prazo_liberacao_retencao_dias := 180;
  ELSIF NEW.valor >= 150000 AND NEW.data_inicio IS NOT NULL AND NEW.data_fim IS NOT NULL
        AND (NEW.data_fim - NEW.data_inicio) > 30 THEN
    NEW.requer_retencao_tecnica := TRUE;
    NEW.prazo_liberacao_retencao_dias := 90;
  ELSE
    NEW.requer_retencao_tecnica := FALSE;
    NEW.prazo_liberacao_retencao_dias := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Add super_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
