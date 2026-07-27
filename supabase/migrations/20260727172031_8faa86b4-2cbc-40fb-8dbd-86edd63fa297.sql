ALTER TABLE public.energia_modulos
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'modulo';

ALTER TABLE public.energia_modulos
  DROP CONSTRAINT IF EXISTS energia_modulos_tipo_check;

ALTER TABLE public.energia_modulos
  ADD CONSTRAINT energia_modulos_tipo_check
  CHECK (tipo IN ('modulo','area_comum','restaurante','obra','outro'));

UPDATE public.energia_modulos
SET tipo = CASE
  WHEN unaccent_ok.ident LIKE '%AREA COMUM%' OR unaccent_ok.ident LIKE '%ÁREA COMUM%' THEN 'area_comum'
  WHEN unaccent_ok.ident LIKE '%RESTAURANTE%' THEN 'restaurante'
  WHEN unaccent_ok.ident LIKE '%OBRA%' THEN 'obra'
  ELSE 'modulo'
END
FROM (SELECT id, upper(identificador) AS ident FROM public.energia_modulos) AS unaccent_ok
WHERE unaccent_ok.id = public.energia_modulos.id;