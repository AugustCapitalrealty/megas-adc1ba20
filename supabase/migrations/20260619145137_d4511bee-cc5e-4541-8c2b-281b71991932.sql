
ALTER TABLE public.energia_grandezas_contratadas
  ADD COLUMN IF NOT EXISTS demanda_fora_ponta_kw numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS energia_ponta_kwh numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS energia_fora_ponta_kwh numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS res_capacidade_ponta_kw numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS res_capacidade_fora_ponta_kw numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montante_ponta_kw numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montante_fora_ponta_kw numeric NOT NULL DEFAULT 0;

INSERT INTO public.energia_grandezas_contratadas (vigencia_inicio, vigencia_fim, demanda_contratada_kw, observacao)
SELECT '2020-01-01'::date, NULL, 750, 'Vigência inicial — Demanda Contratada Todos os Períodos Copel'
WHERE NOT EXISTS (SELECT 1 FROM public.energia_grandezas_contratadas);
