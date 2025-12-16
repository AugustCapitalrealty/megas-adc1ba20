-- Fase 3: Criar tabelas de clientes por empreendimento

-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de relacionamento clientes x empreendimentos
CREATE TABLE public.clientes_empreendimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  empreendimento empreendimento NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, empreendimento)
);

-- Adicionar cliente_id na tabela solicitacoes
ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_empreendimentos ENABLE ROW LEVEL SECURITY;

-- Policies para clientes - todos autenticados podem ver
CREATE POLICY "Authenticated users can view clientes"
ON public.clientes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view clientes_empreendimentos"
ON public.clientes_empreendimentos FOR SELECT TO authenticated
USING (true);

-- Inserir clientes de Curitiba
INSERT INTO public.clientes (nome) VALUES
  ('Bosch'),
  ('Cálamo'),
  ('E-commerce Boticário'),
  ('Hp Trade'),
  ('Mercado Livre'),
  ('NTN'),
  ('Tornadolog'),
  ('Restaurante Sodexo'),
  ('Shopee'),
  ('Veloz');

-- Relacionar com Curitiba
INSERT INTO public.clientes_empreendimentos (cliente_id, empreendimento)
SELECT id, 'mega_curitiba'::empreendimento FROM public.clientes WHERE nome IN (
  'Bosch', 'Cálamo', 'E-commerce Boticário', 'Hp Trade', 'Mercado Livre', 
  'NTN', 'Tornadolog', 'Restaurante Sodexo', 'Shopee', 'Veloz'
);

-- Inserir clientes exclusivos de Esteio
INSERT INTO public.clientes (nome) VALUES ('Triunfante');

-- Clientes que estão em Esteio (incluindo os compartilhados)
INSERT INTO public.clientes_empreendimentos (cliente_id, empreendimento)
SELECT id, 'mega_esteio'::empreendimento FROM public.clientes WHERE nome IN (
  'Triunfante', 'Tornadolog', 'Shopee'
);

-- Inserir clientes exclusivos de Itajaí
INSERT INTO public.clientes (nome) VALUES
  ('Ativa Logística'),
  ('Day Brasil'),
  ('Domus'),
  ('Domazzi'),
  ('Magazine Luiza'),
  ('Magnum Tires'),
  ('Pacific'),
  ('Rio Branco'),
  ('Sigma'),
  ('Shopee SOC'),
  ('Shopee HUB'),
  ('Stella'),
  ('Wine');

-- Relacionar com Itajaí (incluindo Mercado Livre e Restaurante Sodexo que são compartilhados)
INSERT INTO public.clientes_empreendimentos (cliente_id, empreendimento)
SELECT id, 'mega_itajai'::empreendimento FROM public.clientes WHERE nome IN (
  'Ativa Logística', 'Day Brasil', 'Domus', 'Domazzi', 'Magazine Luiza',
  'Magnum Tires', 'Mercado Livre', 'Pacific', 'Rio Branco', 'Sigma',
  'Shopee SOC', 'Shopee HUB', 'Restaurante Sodexo', 'Stella', 'Wine'
);