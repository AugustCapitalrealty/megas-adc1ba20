-- Restringe visualização do Projuris por empreendimento (defesa em profundidade)
-- Backoffice/admin continuam vendo tudo; demais usuários só veem do(s) seu(s) empreendimento(s).

-- Função que mapeia a string livre do empreendimento Projuris para o(s) enum(s)
-- de user_empreendimentos. Reaproveita a lógica do Fluig.
CREATE OR REPLACE FUNCTION public.user_can_view_projuris_empreendimento(projuris_empreendimento text)
RETURNS boolean
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
        OR (ue.empreendimento = 'mega_curitiba' AND projuris_empreendimento ILIKE '%curitiba%')
        OR (ue.empreendimento = 'mega_itajai'   AND projuris_empreendimento ILIKE '%itaja%')
        OR (ue.empreendimento = 'mega_esteio'   AND projuris_empreendimento ILIKE '%esteio%')
        OR (ue.empreendimento = 'mega_canoas'   AND projuris_empreendimento ILIKE '%canoas%')
      )
  )
$$;

-- Substituir a policy permissiva atual por uma restrita por empreendimento.
DROP POLICY IF EXISTS "Authenticated users can view projuris_requisicoes" ON public.projuris_requisicoes;

CREATE POLICY "Backoffice can view all projuris_requisicoes"
ON public.projuris_requisicoes
FOR SELECT
TO authenticated
USING (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Users can view projuris_requisicoes from their empreendimentos"
ON public.projuris_requisicoes
FOR SELECT
TO authenticated
USING (
  is_backoffice_or_admin(auth.uid())
  OR public.user_can_view_projuris_empreendimento(empreendimento)
);
