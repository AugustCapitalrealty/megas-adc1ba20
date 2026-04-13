
CREATE TABLE public.projuris_requisicoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_requisicao text NOT NULL UNIQUE,
  numero_fluig text,
  data_requisicao timestamptz,
  data_ultima_aprovacao timestamptz,
  data_ultimo_envio_aprovacao timestamptz,
  detalhes text,
  empreendimento text,
  requisitante text,
  tipo_requisicao text,
  responsavel text,
  status text,
  data_finalizacao timestamptz,
  cliente_fornecedor text,
  ordem_prioridade integer,
  importado_por uuid,
  importado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projuris_requisicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projuris_requisicoes"
ON public.projuris_requisicoes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Backoffice can insert projuris_requisicoes"
ON public.projuris_requisicoes FOR INSERT
TO authenticated
WITH CHECK (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Backoffice can update projuris_requisicoes"
ON public.projuris_requisicoes FOR UPDATE
TO authenticated
USING (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Backoffice can delete projuris_requisicoes"
ON public.projuris_requisicoes FOR DELETE
TO authenticated
USING (is_backoffice_or_admin(auth.uid()));

CREATE TRIGGER update_projuris_requisicoes_updated_at
BEFORE UPDATE ON public.projuris_requisicoes
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();
