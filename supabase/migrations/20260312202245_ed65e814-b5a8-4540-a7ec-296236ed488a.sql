
-- Insert rateio_configuracao for mega_canoas
INSERT INTO rateio_configuracao (empreendimento, area_m2) VALUES ('mega_canoas', 0);

-- Update user_can_view_fluig_empreendimento to include mega_canoas
CREATE OR REPLACE FUNCTION public.user_can_view_fluig_empreendimento(fluig_empreendimento text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_empreendimentos ue
    WHERE ue.user_id = auth.uid()
      AND (
        ue.empreendimento = 'todos'
        OR (ue.empreendimento = 'mega_curitiba' AND fluig_empreendimento ILIKE '%curitiba%')
        OR (ue.empreendimento = 'mega_itajai' AND fluig_empreendimento ILIKE '%itaja%')
        OR (ue.empreendimento = 'mega_esteio' AND fluig_empreendimento ILIKE '%esteio%')
        OR (ue.empreendimento = 'mega_canoas' AND fluig_empreendimento ILIKE '%canoas%')
      )
  )
$$;
