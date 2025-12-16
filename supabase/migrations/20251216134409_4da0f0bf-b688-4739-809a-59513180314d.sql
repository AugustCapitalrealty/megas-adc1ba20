-- Storage policies for bucket anexos
-- Allow owners (and backoffice/admin) to read files
CREATE POLICY "Owners and backoffice can read anexos files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    is_backoffice_or_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.solicitacoes s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.user_id = auth.uid()
    )
  )
);

-- Allow owners to upload files into their solicitacao folder (name = "<solicitacao_id>/...")
CREATE POLICY "Owners can upload anexos files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'anexos'
  AND EXISTS (
    SELECT 1
    FROM public.solicitacoes s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.user_id = auth.uid()
  )
);

-- Allow owners to delete their own files
CREATE POLICY "Owners can delete anexos files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'anexos'
  AND EXISTS (
    SELECT 1
    FROM public.solicitacoes s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.user_id = auth.uid()
  )
);
