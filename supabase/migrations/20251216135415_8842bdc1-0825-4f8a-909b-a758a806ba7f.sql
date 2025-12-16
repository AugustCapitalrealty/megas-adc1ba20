-- Fase 2.1: Adicionar colunas para Faturamento Direto com valores separados
ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS valor_servico numeric NULL,
ADD COLUMN IF NOT EXISTS valor_material numeric NULL;