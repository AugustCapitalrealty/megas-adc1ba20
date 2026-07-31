-- Enums
CREATE TYPE public.app_key AS ENUM ('financeiro', 'energia', 'administracao');
CREATE TYPE public.app_role_level AS ENUM ('solicitante', 'backoffice', 'admin', 'leitor', 'editor', 'fechador');

-- Tabela de acesso por app
CREATE TABLE public.user_app_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app public.app_key NOT NULL,
  papel public.app_role_level NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (user_id, app)
);

CREATE INDEX idx_user_app_access_user ON public.user_app_access(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_app_access TO authenticated;
GRANT ALL ON public.user_app_access TO service_role;

ALTER TABLE public.user_app_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê o próprio acesso"
ON public.user_app_access FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins inserem acessos"
ON public.user_app_access FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins atualizam acessos"
ON public.user_app_access FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins removem acessos"
ON public.user_app_access FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_user_app_access_updated_at
BEFORE UPDATE ON public.user_app_access
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Impede que um admin remova o próprio acesso de Administração
CREATE OR REPLACE FUNCTION public.prevent_self_admin_lockout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.app = 'administracao' AND OLD.user_id = auth.uid()
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Você não pode remover o seu próprio acesso de Administração';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_self_admin_lockout
BEFORE DELETE ON public.user_app_access
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_admin_lockout();

-- Funções auxiliares
CREATE OR REPLACE FUNCTION public.has_app_access(_user_id uuid, _app public.app_key)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
      OR EXISTS (SELECT 1 FROM public.user_app_access WHERE user_id = _user_id AND app = _app);
$$;

CREATE OR REPLACE FUNCTION public.app_role_of(_user_id uuid, _app public.app_key)
RETURNS public.app_role_level
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT papel FROM public.user_app_access WHERE user_id = _user_id AND app = _app LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_role_rank(_papel public.app_role_level)
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE _papel
    WHEN 'solicitante' THEN 1
    WHEN 'leitor' THEN 1
    WHEN 'backoffice' THEN 2
    WHEN 'editor' THEN 2
    WHEN 'admin' THEN 3
    WHEN 'fechador' THEN 3
    ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.is_app_at_least(_user_id uuid, _app public.app_key, _papel public.app_role_level)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
      OR COALESCE(
           public.app_role_rank(public.app_role_of(_user_id, _app)) >= public.app_role_rank(_papel),
           false);
$$;

-- Backfill a partir das roles atuais
INSERT INTO public.user_app_access (user_id, app, papel)
SELECT ur.user_id, 'financeiro'::public.app_key,
  CASE
    WHEN bool_or(ur.role = 'admin') THEN 'admin'
    WHEN bool_or(ur.role = 'backoffice') THEN 'backoffice'
    ELSE 'solicitante'
  END::public.app_role_level
FROM public.user_roles ur
WHERE ur.role IN ('solicitante', 'backoffice', 'admin')
GROUP BY ur.user_id
ON CONFLICT (user_id, app) DO NOTHING;

INSERT INTO public.user_app_access (user_id, app, papel)
SELECT DISTINCT ur.user_id, 'energia'::public.app_key, 'fechador'::public.app_role_level
FROM public.user_roles ur WHERE ur.role = 'admin'
ON CONFLICT (user_id, app) DO NOTHING;

INSERT INTO public.user_app_access (user_id, app, papel)
SELECT DISTINCT ur.user_id, 'administracao'::public.app_key, 'admin'::public.app_role_level
FROM public.user_roles ur WHERE ur.role = 'admin'
ON CONFLICT (user_id, app) DO NOTHING;