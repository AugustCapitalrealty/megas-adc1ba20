-- Create a function to check if user can view fluig data for an empreendimento
CREATE OR REPLACE FUNCTION public.user_can_view_fluig_empreendimento(fluig_empreendimento TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
      )
  )
$$;

-- Add RLS policy for users to view fluig data from their empreendimentos
CREATE POLICY "Users can view fluig data from their empreendimentos"
ON public.fluig_painel_snapshot
FOR SELECT
USING (
  is_backoffice_or_admin(auth.uid()) 
  OR user_can_view_fluig_empreendimento(empreendimento)
);

-- Add similar policy for fluig_painel_eventos
CREATE POLICY "Users can view fluig eventos from their empreendimentos"
ON public.fluig_painel_eventos
FOR SELECT
USING (
  is_backoffice_or_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.fluig_painel_snapshot fps
    WHERE fps.solicitacao_fluig = fluig_painel_eventos.solicitacao_fluig
    AND user_can_view_fluig_empreendimento(fps.empreendimento)
  )
);