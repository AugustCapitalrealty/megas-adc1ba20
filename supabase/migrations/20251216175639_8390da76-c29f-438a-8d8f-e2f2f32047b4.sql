-- Add justification field for 3 suppliers exception
ALTER TABLE public.solicitacoes 
ADD COLUMN justificativa_fornecedores TEXT;

COMMENT ON COLUMN public.solicitacoes.justificativa_fornecedores IS 'Justificativa obrigatória quando não há 3 fornecedores em AC de serviços não emergencial';