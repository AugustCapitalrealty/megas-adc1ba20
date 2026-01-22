-- 1. Adicionar colunas para fornecimento exclusivo
ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS fornecimento_exclusivo BOOLEAN DEFAULT false;

ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS justificativa_exclusividade TEXT;

-- 2. Adicionar novo status 'cancelado' ao enum
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'cancelado';