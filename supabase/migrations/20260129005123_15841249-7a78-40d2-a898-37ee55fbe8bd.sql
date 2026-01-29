-- Criar enum para instrumento jurídico
CREATE TYPE public.instrumento_juridico AS ENUM (
  'oc',                    -- Ordem de Compra (dispensa contrato)
  'termo_contratacao',     -- Termo de Contratação (R$ 10k-69.9k ou riscos)
  'contrato_prestacao',    -- Contrato Prestação Serviços (>= R$ 70k)
  'contrato_fornecimento', -- Contrato Fornecimento (material com fabricação)
  'contrato_empreitada'    -- Contrato Empreitada (obra estrutural)
);

-- Adicionar novos campos na tabela solicitacoes
ALTER TABLE public.solicitacoes
ADD COLUMN instrumento_juridico public.instrumento_juridico DEFAULT NULL,
ADD COLUMN natureza_servico_obra_civil boolean DEFAULT false,
ADD COLUMN natureza_servico_altura_risco boolean DEFAULT false,
ADD COLUMN natureza_servico_fossa_filtro boolean DEFAULT false,
ADD COLUMN natureza_servico_preco_variavel boolean DEFAULT false,
ADD COLUMN escopo_detalhado_minuta text DEFAULT NULL,
ADD COLUMN due_diligence_confirmada boolean DEFAULT false,
ADD COLUMN due_diligence_numero_projuris text DEFAULT NULL,
ADD COLUMN requer_retencao_tecnica boolean DEFAULT false,
ADD COLUMN prazo_liberacao_retencao_dias integer DEFAULT NULL;

-- Função para calcular instrumento jurídico automaticamente
CREATE OR REPLACE FUNCTION public.calcular_instrumento_juridico(
  p_valor NUMERIC,
  p_obra_civil BOOLEAN,
  p_altura_risco BOOLEAN,
  p_fossa_filtro BOOLEAN,
  p_preco_variavel BOOLEAN
) RETURNS public.instrumento_juridico AS $$
BEGIN
  -- Empreitada tem prioridade máxima (obra civil/estrutural)
  IF p_obra_civil = TRUE THEN
    RETURN 'contrato_empreitada';
  END IF;
  
  -- Gatilhos de risco sempre geram Termo de Contratação
  IF p_altura_risco = TRUE OR p_fossa_filtro = TRUE OR p_preco_variavel = TRUE THEN
    RETURN 'termo_contratacao';
  END IF;
  
  -- Faixas de valor
  IF p_valor >= 70000 THEN
    RETURN 'contrato_prestacao';
  END IF;
  
  IF p_valor >= 10000 THEN
    RETURN 'termo_contratacao';
  END IF;
  
  -- Valor < 10k = OC simples
  RETURN 'oc';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para calcular instrumento jurídico automaticamente ao inserir/atualizar
CREATE OR REPLACE FUNCTION public.set_instrumento_juridico()
RETURNS TRIGGER AS $$
BEGIN
  -- Só calcula se o valor >= 10000 ou há gatilhos de risco
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
  -- Empreitada sempre tem retenção
  -- Contratos >= 150k e duração > 30 dias também têm retenção
  IF NEW.instrumento_juridico = 'contrato_empreitada' THEN
    NEW.requer_retencao_tecnica := TRUE;
    NEW.prazo_liberacao_retencao_dias := 180; -- Empreitada: 90-180 dias
  ELSIF NEW.valor >= 150000 AND NEW.data_inicio IS NOT NULL AND NEW.data_fim IS NOT NULL
        AND (NEW.data_fim - NEW.data_inicio) > 30 THEN
    NEW.requer_retencao_tecnica := TRUE;
    NEW.prazo_liberacao_retencao_dias := 90; -- Outros contratos: 45-90 dias
  ELSE
    NEW.requer_retencao_tecnica := FALSE;
    NEW.prazo_liberacao_retencao_dias := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_set_instrumento_juridico ON public.solicitacoes;
CREATE TRIGGER trigger_set_instrumento_juridico
  BEFORE INSERT OR UPDATE ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_instrumento_juridico();

-- Comentários para documentação
COMMENT ON COLUMN public.solicitacoes.instrumento_juridico IS 'Classificação automática do tipo de contrato (OC, Termo, Contrato, Empreitada)';
COMMENT ON COLUMN public.solicitacoes.natureza_servico_obra_civil IS 'Gatilho: envolve obra civil ou alteração estrutural';
COMMENT ON COLUMN public.solicitacoes.natureza_servico_altura_risco IS 'Gatilho: trabalho em altura ou risco de vida';
COMMENT ON COLUMN public.solicitacoes.natureza_servico_fossa_filtro IS 'Gatilho: limpeza de fossa ou filtro';
COMMENT ON COLUMN public.solicitacoes.natureza_servico_preco_variavel IS 'Gatilho: preço pode variar (m², m³, hora)';
COMMENT ON COLUMN public.solicitacoes.escopo_detalhado_minuta IS 'Escopo detalhado para elaboração da minuta jurídica';
COMMENT ON COLUMN public.solicitacoes.due_diligence_confirmada IS 'Solicitante confirmou ciência da Due Diligence obrigatória';
COMMENT ON COLUMN public.solicitacoes.due_diligence_numero_projuris IS 'Número do processo de Due Diligence no Projuris';
COMMENT ON COLUMN public.solicitacoes.requer_retencao_tecnica IS 'Indica se o contrato requer retenção técnica de 6%';
COMMENT ON COLUMN public.solicitacoes.prazo_liberacao_retencao_dias IS 'Prazo para liberação da retenção técnica (45-180 dias)';