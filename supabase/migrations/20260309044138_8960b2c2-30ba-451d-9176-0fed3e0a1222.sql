-- 1. Trigger to prevent self-approval
CREATE OR REPLACE FUNCTION public.prevent_self_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.approved IS DISTINCT FROM OLD.approved THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      NEW.approved := OLD.approved;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_self_approval
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_self_approval();

-- 2. Filter internal messages from non-backoffice SELECT policies
DROP POLICY "Users can view messages on own solicitacoes" ON solicitacao_mensagens;
CREATE POLICY "Users can view messages on own solicitacoes" ON solicitacao_mensagens
  FOR SELECT TO authenticated
  USING (
    (interno = false)
    AND EXISTS (
      SELECT 1 FROM solicitacoes s
      WHERE s.id = solicitacao_mensagens.solicitacao_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY "Users can view messages from their empreendimento" ON solicitacao_mensagens;
CREATE POLICY "Users can view messages from their empreendimento" ON solicitacao_mensagens
  FOR SELECT TO authenticated
  USING (
    (is_backoffice_or_admin(auth.uid()) OR interno = false)
    AND user_can_access_solicitacao(solicitacao_id)
  );

-- 3. Restrict fornecedores insert to approved users
DROP POLICY "Authenticated users can insert fornecedores" ON fornecedores;
CREATE POLICY "Approved users can insert fornecedores" ON fornecedores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true)
    OR is_backoffice_or_admin(auth.uid())
  );