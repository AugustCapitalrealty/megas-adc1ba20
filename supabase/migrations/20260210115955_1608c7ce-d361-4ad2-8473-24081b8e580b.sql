-- Item 2: Fix trigger set_instrumento_juridico - OC must always get 'oc'
CREATE OR REPLACE FUNCTION public.set_instrumento_juridico()
RETURNS TRIGGER AS $$
BEGIN
  -- OC NUNCA tem fluxo jurídico - sempre 'oc'
  IF NEW.tipo = 'OC' THEN
    NEW.instrumento_juridico := 'oc';
    NEW.requer_retencao_tecnica := FALSE;
    NEW.prazo_liberacao_retencao_dias := NULL;
    RETURN NEW;
  END IF;

  -- Só calcula se o valor >= 10000 ou há gatilhos de risco (apenas para AC)
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
  
  -- Calcula retenção técnica automática
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
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix existing incorrect records
UPDATE public.solicitacoes 
SET instrumento_juridico = 'oc',
    requer_retencao_tecnica = false,
    prazo_liberacao_retencao_dias = null
WHERE tipo = 'OC' AND instrumento_juridico != 'oc';

-- Item 7: Add infraspeak flag column
ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS infraspeak_registrada boolean DEFAULT false;