-- Adicionar coluna para rastrear quando entrou em pendente_correcao
ALTER TABLE public.solicitacoes 
ADD COLUMN data_pendente_correcao timestamp with time zone;

-- Trigger para popular/limpar data_pendente_correcao automaticamente
CREATE OR REPLACE FUNCTION public.track_pendente_correcao_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se está entrando em pendente_correcao
  IF NEW.status = 'pendente_correcao' AND (OLD.status IS NULL OR OLD.status != 'pendente_correcao') THEN
    NEW.data_pendente_correcao = NOW();
  -- Se está saindo de pendente_correcao
  ELSIF NEW.status != 'pendente_correcao' AND OLD.status = 'pendente_correcao' THEN
    NEW.data_pendente_correcao = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS track_pendente_correcao ON public.solicitacoes;
CREATE TRIGGER track_pendente_correcao
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.track_pendente_correcao_date();

-- Popular data_pendente_correcao para solicitações já em pendente_correcao
-- Usa a data do último histórico onde mudou para pendente_correcao
UPDATE public.solicitacoes s
SET data_pendente_correcao = (
  SELECT MAX(h.created_at)
  FROM public.historico_solicitacoes h
  WHERE h.solicitacao_id = s.id
    AND h.status_novo = 'pendente_correcao'
)
WHERE s.status = 'pendente_correcao'
  AND s.data_pendente_correcao IS NULL;