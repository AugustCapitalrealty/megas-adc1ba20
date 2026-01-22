-- Adicionar coluna para data de conclusão (início da garantia)
ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMP WITH TIME ZONE;

-- Criar função para preencher data_conclusao automaticamente
CREATE OR REPLACE FUNCTION public.track_data_conclusao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se está entrando em concluida
  IF NEW.status = 'concluida' AND (OLD.status IS NULL OR OLD.status != 'concluida') THEN
    NEW.data_conclusao = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_track_data_conclusao ON public.solicitacoes;
CREATE TRIGGER trigger_track_data_conclusao
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.track_data_conclusao();

-- Preencher retroativamente para solicitações já concluídas
UPDATE public.solicitacoes s
SET data_conclusao = (
  SELECT h.created_at 
  FROM public.historico_solicitacoes h 
  WHERE h.solicitacao_id = s.id 
    AND h.status_novo = 'concluida'
  ORDER BY h.created_at DESC
  LIMIT 1
)
WHERE s.status = 'concluida' AND s.data_conclusao IS NULL;