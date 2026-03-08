
-- ============================================================
-- MIGRATION 1: Fix RLS policies on 4 tables
-- ============================================================

-- 1. NOTIFICATIONS: Replace broad INSERT policy with restricted one
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert own notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. FORNECEDORES: Restrict UPDATE to backoffice/admin only
DROP POLICY IF EXISTS "Authenticated users can update fornecedores" ON public.fornecedores;
CREATE POLICY "Backoffice can update fornecedores"
  ON public.fornecedores
  FOR UPDATE
  TO authenticated
  USING (is_backoffice_or_admin(auth.uid()));

-- 3. OC_ACOMPANHAMENTO: Remove overly broad INSERT policy
DROP POLICY IF EXISTS "Users can insert own oc_acompanhamento" ON public.oc_acompanhamento;

-- 4. SOLICITACOES: Restrict transfer ownership to backoffice/admin
DROP POLICY IF EXISTS "Transfer ownership of solicitacoes" ON public.solicitacoes;
CREATE POLICY "Backoffice can transfer ownership of solicitacoes"
  ON public.solicitacoes
  FOR UPDATE
  TO authenticated
  USING (is_backoffice_or_admin(auth.uid()))
  WITH CHECK (is_backoffice_or_admin(auth.uid()));
