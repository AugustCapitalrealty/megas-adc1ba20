
-- Add policy allowing all authenticated users to read profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Drop redundant policy (now covered by the new one)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
