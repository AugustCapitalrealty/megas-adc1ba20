
-- Restore full SELECT on profiles and fornecedores to authenticated.
-- The previous column-level grants broke the app: Admin user list, CNPJ lookup,
-- supplier search and many notification/timeline queries depend on columns that
-- were revoked. Reverting unblocks users; the email/sensitive-fornecedor
-- exposure findings are tracked separately for a future view-based fix.

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.fornecedores TO authenticated;

-- Fix get_my_profile so supabase-js .maybeSingle() works (needs SETOF).
DROP FUNCTION IF EXISTS public.get_my_profile();
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
