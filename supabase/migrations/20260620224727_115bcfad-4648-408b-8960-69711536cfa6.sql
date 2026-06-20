ALTER TABLE public.energia_competencia_tarifas
  ADD COLUMN IF NOT EXISTS fatura_copel_itens jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consumo_por_cliente jsonb NOT NULL DEFAULT '[]'::jsonb;