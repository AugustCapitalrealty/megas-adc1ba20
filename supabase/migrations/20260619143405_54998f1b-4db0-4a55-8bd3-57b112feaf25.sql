-- Seed dos 72 módulos do Mega Curitiba (1-38, 39A, 39B, 40-70, Área Comum)
DELETE FROM public.energia_modulos
 WHERE NOT EXISTS (
   SELECT 1 FROM public.energia_contrato_modulos cm WHERE cm.modulo_id = energia_modulos.id
 );

DO $$
DECLARE
  v_ordem int := 0;
  v_ident text;
  i int;
BEGIN
  FOR i IN 1..38 LOOP
    v_ordem := v_ordem + 1;
    v_ident := i::text;
    IF NOT EXISTS (SELECT 1 FROM public.energia_modulos WHERE identificador = v_ident) THEN
      INSERT INTO public.energia_modulos (identificador, ordem, area_m2, demanda_contratada_kw, ativo)
      VALUES (v_ident, v_ordem, 0, 0, true);
    ELSE
      UPDATE public.energia_modulos SET ordem = v_ordem WHERE identificador = v_ident;
    END IF;
  END LOOP;

  FOREACH v_ident IN ARRAY ARRAY['39A','39B'] LOOP
    v_ordem := v_ordem + 1;
    IF NOT EXISTS (SELECT 1 FROM public.energia_modulos WHERE identificador = v_ident) THEN
      INSERT INTO public.energia_modulos (identificador, ordem, area_m2, demanda_contratada_kw, ativo)
      VALUES (v_ident, v_ordem, 0, 0, true);
    ELSE
      UPDATE public.energia_modulos SET ordem = v_ordem WHERE identificador = v_ident;
    END IF;
  END LOOP;

  FOR i IN 40..70 LOOP
    v_ordem := v_ordem + 1;
    v_ident := i::text;
    IF NOT EXISTS (SELECT 1 FROM public.energia_modulos WHERE identificador = v_ident) THEN
      INSERT INTO public.energia_modulos (identificador, ordem, area_m2, demanda_contratada_kw, ativo)
      VALUES (v_ident, v_ordem, 0, 0, true);
    ELSE
      UPDATE public.energia_modulos SET ordem = v_ordem WHERE identificador = v_ident;
    END IF;
  END LOOP;

  v_ordem := v_ordem + 1;
  IF NOT EXISTS (SELECT 1 FROM public.energia_modulos WHERE identificador = 'Área Comum') THEN
    INSERT INTO public.energia_modulos (identificador, ordem, area_m2, demanda_contratada_kw, ativo)
    VALUES ('Área Comum', v_ordem, 0, 0, true);
  ELSE
    UPDATE public.energia_modulos SET ordem = v_ordem WHERE identificador = 'Área Comum';
  END IF;
END $$;