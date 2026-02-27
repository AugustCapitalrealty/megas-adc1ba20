
-- 1. Criar tabela rateio_configuracao
CREATE TABLE public.rateio_configuracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento public.empreendimento NOT NULL UNIQUE,
  area_m2 numeric NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.rateio_configuracao ENABLE ROW LEVEL SECURITY;

-- Admin pode CRUD
CREATE POLICY "Admins can manage rateio_configuracao"
ON public.rateio_configuracao
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Todos autenticados podem ler
CREATE POLICY "Authenticated users can view rateio_configuracao"
ON public.rateio_configuracao
FOR SELECT
TO authenticated
USING (true);

-- Trigger updated_at
CREATE TRIGGER update_rateio_configuracao_updated_at
BEFORE UPDATE ON public.rateio_configuracao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Adicionar colunas em solicitacoes
ALTER TABLE public.solicitacoes
ADD COLUMN tipo_rateio text,
ADD COLUMN rateio_valores jsonb;

-- 3. Inserir valores iniciais
INSERT INTO public.rateio_configuracao (empreendimento, area_m2) VALUES
  ('mega_esteio', 24294.66),
  ('mega_itajai', 108165.91),
  ('mega_curitiba', 120577.91);
