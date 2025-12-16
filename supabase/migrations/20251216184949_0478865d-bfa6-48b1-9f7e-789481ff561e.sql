-- Create RLS policies for storage bucket documentos-emitidos to allow solicitante to download
CREATE POLICY "Users can download their own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documentos-emitidos' AND
  EXISTS (
    SELECT 1 FROM public.documentos_emitidos de
    JOIN public.solicitacoes s ON s.id = de.solicitacao_id
    WHERE de.storage_path = name AND s.user_id = auth.uid()
  )
);

-- Backoffice can manage documents
CREATE POLICY "Backoffice can manage documents storage"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'documentos-emitidos' AND
  public.is_backoffice_or_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'documentos-emitidos' AND
  public.is_backoffice_or_admin(auth.uid())
);