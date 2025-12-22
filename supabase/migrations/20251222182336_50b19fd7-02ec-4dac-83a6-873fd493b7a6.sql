-- Permitir que admins excluam solicitações
CREATE POLICY "Admins can delete solicitacoes" 
ON public.solicitacoes 
FOR DELETE 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Permitir que admins deletem anexos de qualquer solicitação
CREATE POLICY "Admins can delete all anexos"
ON public.anexos
FOR DELETE
TO authenticated
USING (is_backoffice_or_admin(auth.uid()));

-- Permitir que admins deletem documentos fiscais
CREATE POLICY "Admins can delete all documentos_fiscais"
ON public.documentos_fiscais
FOR DELETE
TO authenticated
USING (is_backoffice_or_admin(auth.uid()));

-- Permitir que admins deletem documentos emitidos
CREATE POLICY "Admins can delete all documentos_emitidos"
ON public.documentos_emitidos
FOR DELETE
TO authenticated
USING (is_backoffice_or_admin(auth.uid()));

-- Permitir que admins deletem histórico
CREATE POLICY "Admins can delete all historico"
ON public.historico_solicitacoes
FOR DELETE
TO authenticated
USING (is_backoffice_or_admin(auth.uid()));

-- Permitir que admins deletem mensagens
CREATE POLICY "Admins can delete all mensagens"
ON public.solicitacao_mensagens
FOR DELETE
TO authenticated
USING (is_backoffice_or_admin(auth.uid()));

-- Permitir que admins deletem notificações
CREATE POLICY "Admins can delete all notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (is_backoffice_or_admin(auth.uid()));