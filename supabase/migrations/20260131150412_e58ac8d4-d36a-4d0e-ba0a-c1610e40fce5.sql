-- Add fields for supplier contact (optional)
ALTER TABLE public.solicitacoes 
  ADD COLUMN IF NOT EXISTS fornecedor_email_contato TEXT,
  ADD COLUMN IF NOT EXISTS fornecedor_telefone_contato TEXT;

-- Add fields for AI validation cache
ALTER TABLE public.solicitacoes 
  ADD COLUMN IF NOT EXISTS ia_cnae_status TEXT CHECK (ia_cnae_status IN ('compativel', 'incompativel', 'insuficiente')),
  ADD COLUMN IF NOT EXISTS ia_cnae_justificativa TEXT,
  ADD COLUMN IF NOT EXISTS ia_cnae_avaliado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ia_descricao_vaga BOOLEAN,
  ADD COLUMN IF NOT EXISTS ia_descricao_sugestao TEXT,
  ADD COLUMN IF NOT EXISTS ia_descricao_avaliado_em TIMESTAMPTZ;

-- Create function to reset AI cache when description or supplier changes
CREATE OR REPLACE FUNCTION public.reset_ia_cache_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ia_cnae_status := NULL;
  NEW.ia_cnae_justificativa := NULL;
  NEW.ia_cnae_avaliado_em := NULL;
  NEW.ia_descricao_vaga := NULL;
  NEW.ia_descricao_sugestao := NULL;
  NEW.ia_descricao_avaliado_em := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to invalidate AI cache when relevant fields change
DROP TRIGGER IF EXISTS invalidate_ia_cache ON public.solicitacoes;
CREATE TRIGGER invalidate_ia_cache
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW
  WHEN (OLD.descricao IS DISTINCT FROM NEW.descricao 
        OR OLD.fornecedor_id IS DISTINCT FROM NEW.fornecedor_id)
  EXECUTE FUNCTION public.reset_ia_cache_fields();

-- Add comment for documentation
COMMENT ON COLUMN public.solicitacoes.fornecedor_email_contato IS 'Email de contato do fornecedor informado pelo solicitante para envio da OC';
COMMENT ON COLUMN public.solicitacoes.fornecedor_telefone_contato IS 'Telefone de contato do fornecedor informado pelo solicitante para envio da OC';
COMMENT ON COLUMN public.solicitacoes.ia_cnae_status IS 'Resultado cacheado da validação de CNAE por IA';
COMMENT ON COLUMN public.solicitacoes.ia_descricao_vaga IS 'Resultado cacheado da validação de descrição vaga por IA';