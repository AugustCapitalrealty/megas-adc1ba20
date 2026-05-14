
-- Allow empreendimento colleagues to upload to 'anexos' storage bucket
CREATE POLICY "Empreendimento can upload anexos files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'anexos'
  AND user_can_access_solicitacao(((storage.foldername(name))[1])::uuid)
);

-- Allow empreendimento colleagues to insert documentos_fiscais (NF/Boleto)
CREATE POLICY "Empreendimento can insert documentos_fiscais"
ON public.documentos_fiscais
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  AND user_can_access_solicitacao(solicitacao_id)
);
