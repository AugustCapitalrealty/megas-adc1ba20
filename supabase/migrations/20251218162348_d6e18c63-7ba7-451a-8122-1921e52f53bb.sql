-- Create table to link users to empreendimentos
CREATE TABLE public.user_empreendimentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    empreendimento public.empreendimento NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, empreendimento)
);

-- Enable RLS
ALTER TABLE public.user_empreendimentos ENABLE ROW LEVEL SECURITY;

-- Users can view their own empreendimentos
CREATE POLICY "Users can view own empreendimentos"
ON public.user_empreendimentos
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all empreendimentos
CREATE POLICY "Admins can manage all empreendimentos"
ON public.user_empreendimentos
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to check if user has access to empreendimento
CREATE OR REPLACE FUNCTION public.user_has_empreendimento(_user_id uuid, _empreendimento public.empreendimento)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_empreendimentos
    WHERE user_id = _user_id
      AND (empreendimento = _empreendimento OR empreendimento = 'todos')
  )
$$;

-- Create function to get user's empreendimentos
CREATE OR REPLACE FUNCTION public.get_user_empreendimentos(_user_id uuid)
RETURNS SETOF public.empreendimento
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empreendimento
  FROM public.user_empreendimentos
  WHERE user_id = _user_id
$$;