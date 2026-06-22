ALTER TABLE public.energia_competencia_tarifas
  ADD COLUMN IF NOT EXISTS copel_tarifa_demanda_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS copel_tarifa_te_ponta numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS copel_tarifa_tusd_ponta numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS copel_tarifa_te_fora numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS copel_tarifa_tusd_fora numeric NOT NULL DEFAULT 0;