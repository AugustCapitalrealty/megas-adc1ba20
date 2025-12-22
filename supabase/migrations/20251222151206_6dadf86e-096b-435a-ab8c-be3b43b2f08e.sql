-- Storage RLS policies for anexos bucket (upload attachments)
-- Allow users to upload/view/delete files in folder = solicitacao_id when they own the solicitacao
-- and allow backoffice/admin to access all.

-- Helper function (security definer) to avoid RLS recursion pitfalls
CREATE OR REPLACE FUNCTION public.user_owns_solicitacao(_solicitacao_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.solicitacoes s
    WHERE s.id = _solicitacao_id
      AND s.user_id = auth.uid()
  );
$$;

-- Policies live on storage.objects (do NOT create tables/functions in storage schema)

DROP POLICY IF EXISTS "Users can upload anexos files" ON storage.objects;
CREATE POLICY "Users can upload anexos files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'anexos'
  AND public.user_owns_solicitacao((storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "Users can view anexos files" ON storage.objects;
CREATE POLICY "Users can view anexos files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    public.user_owns_solicitacao((storage.foldername(name))[1]::uuid)
    OR public.is_backoffice_or_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update anexos files" ON storage.objects;
CREATE POLICY "Users can update anexos files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    public.user_owns_solicitacao((storage.foldername(name))[1]::uuid)
    OR public.is_backoffice_or_admin(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'anexos'
  AND (
    public.user_owns_solicitacao((storage.foldername(name))[1]::uuid)
    OR public.is_backoffice_or_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete anexos files" ON storage.objects;
CREATE POLICY "Users can delete anexos files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'anexos'
  AND (
    public.user_owns_solicitacao((storage.foldername(name))[1]::uuid)
    OR public.is_backoffice_or_admin(auth.uid())
  )
);