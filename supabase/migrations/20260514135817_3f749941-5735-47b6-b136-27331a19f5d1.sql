
-- Allow users from the same empreendimento to update solicitacoes for action statuses

-- Drop the existing limited policy and recreate it broader
DROP POLICY IF EXISTS "Users can update solicitacoes from their empreendimento" ON public.solicitacoes;

CREATE POLICY "Empreendimento can update actionable solicitacoes"
ON public.solicitacoes
FOR UPDATE
TO public
USING (
  user_can_access_solicitacao(id)
  AND status = ANY (ARRAY[
    'pendente_correcao'::request_status,
    'aguardando_informacoes'::request_status,
    'aguardando_aceite'::request_status,
    'oc_ac_emitida'::request_status,
    'aguardando_nf_boleto'::request_status,
    'aguardando_execucao'::request_status,
    'concluida'::request_status,
    'cancelado'::request_status,
    'enviado_pagamento'::request_status,
    'nf_boleto_enviados'::request_status
  ])
)
WITH CHECK (
  user_can_access_solicitacao(id)
);
