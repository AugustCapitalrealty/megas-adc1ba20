-- Add column to store flagged attachments with problems
ALTER TABLE public.historico_solicitacoes 
ADD COLUMN IF NOT EXISTS anexos_com_problema jsonb DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.historico_solicitacoes.anexos_com_problema IS 'Array of attachment types flagged as problematic by backoffice during correction request. E.g: ["escopo_detalhado", "mapa_cotacao"]';