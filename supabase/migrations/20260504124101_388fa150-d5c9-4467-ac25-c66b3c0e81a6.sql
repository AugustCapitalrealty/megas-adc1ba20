
-- Bucket: anexos — permitir SELECT a quem tem acesso à solicitação (inclui acesso por empreendimento)
DROP POLICY IF EXISTS "Users can view anexos files" ON storage.objects;
CREATE POLICY "Users can view anexos files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'anexos'
  AND public.user_can_access_solicitacao(((storage.foldername(name))[1])::uuid)
);

-- Bucket: documentos-emitidos — unificar policies e usar acesso por empreendimento
DROP POLICY IF EXISTS "Users can download own documentos" ON storage.objects;
DROP POLICY IF EXISTS "Users can download their own documents" ON storage.objects;
CREATE POLICY "Users can download accessible documentos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documentos-emitidos'
  AND EXISTS (
    SELECT 1
    FROM public.documentos_emitidos d
    WHERE d.storage_path = storage.objects.name
      AND public.user_can_access_solicitacao(d.solicitacao_id)
  )
);

-- Bucket: documentos-fiscais — substituir policy de uploader-only por acesso à solicitação
DROP POLICY IF EXISTS "Users can view own fiscal documents" ON storage.objects;
CREATE POLICY "Users can view accessible fiscal documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documentos-fiscais'
  AND EXISTS (
    SELECT 1
    FROM public.documentos_fiscais df
    WHERE df.storage_path = storage.objects.name
      AND public.user_can_access_solicitacao(df.solicitacao_id)
  )
);
