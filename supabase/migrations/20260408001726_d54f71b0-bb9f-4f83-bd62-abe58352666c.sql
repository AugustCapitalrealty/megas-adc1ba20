CREATE TABLE public.gchat_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_name text NOT NULL,
  label text NOT NULL,
  empreendimento text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gchat_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on gchat_spaces"
  ON public.gchat_spaces
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view gchat_spaces"
  ON public.gchat_spaces
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));