-- Remove ALL conflicting/legacy RLS policies for anexos bucket
-- Keep only the new correct policies that use user_owns_solicitacao()

-- Drop legacy INSERT policies
DROP POLICY IF EXISTS "Owners can upload anexos files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own anexos" ON storage.objects;

-- Drop legacy SELECT policies
DROP POLICY IF EXISTS "Owners and backoffice can read anexos files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own anexos" ON storage.objects;

-- Drop legacy DELETE policies
DROP POLICY IF EXISTS "Owners can delete anexos files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own anexos" ON storage.objects;

-- Drop legacy UPDATE policies (if any)
DROP POLICY IF EXISTS "Users can update own anexos" ON storage.objects;