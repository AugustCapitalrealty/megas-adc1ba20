-- Adicionar campos separados de dias de garantia para serviço e produto
ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS dias_garantia_servico integer,
ADD COLUMN IF NOT EXISTS dias_garantia_produto integer;