-- Dropar a política existente e criar uma mais abrangente que permita aceitar OU solicitar ajuste
DROP POLICY IF EXISTS "Users can accept OC on their own solicitacoes" ON public.solicitacoes;

-- Criar política que permite ao dono da solicitação:
-- 1. Aceitar OC (mudar de aguardando_aceite para liberado_fornecedor)
-- 2. Solicitar ajuste (mudar de aguardando_aceite para em_processamento)
CREATE POLICY "Users can respond to OC on their own solicitacoes"
ON public.solicitacoes
FOR UPDATE
TO public
USING (
  auth.uid() = user_id 
  AND status = 'aguardando_aceite'::request_status
)
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('liberado_fornecedor'::request_status, 'em_processamento'::request_status)
);