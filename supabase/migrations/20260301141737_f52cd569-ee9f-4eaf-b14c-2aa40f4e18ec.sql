
-- 1. Create enum for oc_acompanhamento action types
CREATE TYPE public.tipo_acao_oc AS ENUM (
  'justificativa_adiamento',
  'previsao_atualizada',
  'cancelamento_solicitado',
  'cancelamento_aprovado',
  'cancelamento_rejeitado'
);

-- 2. Create oc_acompanhamento table
CREATE TABLE public.oc_acompanhamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  documento_emitido_id uuid REFERENCES public.documentos_emitidos(id) ON DELETE SET NULL,
  tipo_acao tipo_acao_oc NOT NULL,
  justificativa text NOT NULL,
  previsao_execucao date,
  previsao_nf date,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.oc_acompanhamento ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
-- Solicitante can view their own records
CREATE POLICY "Users can view own oc_acompanhamento"
ON public.oc_acompanhamento
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.solicitacoes s
    WHERE s.id = oc_acompanhamento.solicitacao_id
      AND s.user_id = auth.uid()
  )
);

-- Backoffice can view all
CREATE POLICY "Backoffice can view all oc_acompanhamento"
ON public.oc_acompanhamento
FOR SELECT
USING (is_backoffice_or_admin(auth.uid()));

-- Authenticated users can insert (user_id must match)
CREATE POLICY "Users can insert own oc_acompanhamento"
ON public.oc_acompanhamento
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Backoffice can insert on behalf
CREATE POLICY "Backoffice can insert oc_acompanhamento"
ON public.oc_acompanhamento
FOR INSERT
WITH CHECK (is_backoffice_or_admin(auth.uid()));

-- 5. Add cancelamento_pendente to solicitacoes
ALTER TABLE public.solicitacoes
ADD COLUMN cancelamento_pendente boolean NOT NULL DEFAULT false;

-- 6. Remove direct transitions to 'cancelado' from post-OC statuses
DELETE FROM public.status_transitions
WHERE status_to = 'cancelado'
  AND status_from IN (
    'oc_ac_emitida',
    'aguardando_aceite',
    'liberado_fornecedor',
    'enviado_fornecedor',
    'aguardando_nf_boleto',
    'nf_boleto_enviados',
    'enviado_pagamento'
  );

-- 7. Add RLS policy for solicitante to update cancelamento_pendente on own solicitacoes
CREATE POLICY "Users can request cancellation on own solicitacoes"
ON public.solicitacoes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
