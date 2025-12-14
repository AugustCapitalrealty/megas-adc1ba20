-- Enum para tipos de perfil
CREATE TYPE public.app_role AS ENUM ('solicitante', 'backoffice', 'admin');

-- Enum para tipos de solicitação
CREATE TYPE public.request_type AS ENUM ('AC', 'OC');

-- Enum para status da solicitação
CREATE TYPE public.request_status AS ENUM ('recebido', 'em_analise', 'pendente_correcao', 'aprovado', 'rejeitado');

-- Enum para empreendimentos
CREATE TYPE public.empreendimento AS ENUM ('mega_curitiba', 'mega_itajai', 'mega_esteio', 'todos');

-- Enum para natureza orçamentária
CREATE TYPE public.natureza_orcamentaria AS ENUM (
  'materiais_informatica',
  'seguranca_vigilancia',
  'assistencia_informatica',
  'limpeza_conservacao',
  'material_consumo',
  'telefone',
  'energia_eletrica',
  'agua',
  'manutencao_imoveis',
  'material_expediente'
);

-- Enum para tipo de contratação (quando >= R$ 1.001)
CREATE TYPE public.tipo_contratacao AS ENUM (
  'servicos',
  'material_construcao',
  'material_consumo',
  'combustivel',
  'taxas'
);

-- Enum para origem do custo
CREATE TYPE public.origem_custo AS ENUM ('empreendimento', 'cliente');

-- Enum para tipo de garantia
CREATE TYPE public.tipo_garantia AS ENUM ('servico', 'produto', 'nenhuma');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de roles (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'solicitante',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabela de fornecedores (cache de consultas CNPJ)
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT NOT NULL UNIQUE,
  razao_social TEXT,
  nome_fantasia TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  telefone TEXT,
  email TEXT,
  is_mei BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela principal de solicitações
CREATE TABLE public.solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados básicos
  empreendimento empreendimento NOT NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  
  -- Tipo (determinado automaticamente)
  tipo request_type NOT NULL,
  status request_status NOT NULL DEFAULT 'recebido',
  
  -- Dados comuns
  natureza_orcamentaria natureza_orcamentaria NOT NULL,
  origem_custo origem_custo NOT NULL DEFAULT 'empreendimento',
  
  -- Fornecedor principal
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  
  -- Campos específicos AC (Serviços >= R$ 1.001)
  tipo_contratacao tipo_contratacao,
  data_inicio DATE,
  data_fim DATE,
  parcelas INTEGER DEFAULT 1,
  contrato_mensal BOOLEAN DEFAULT false,
  faturamento_direto BOOLEAN DEFAULT false,
  retencao_6_porcento BOOLEAN DEFAULT false,
  tipo_garantia tipo_garantia,
  dias_garantia INTEGER,
  custo_cliente BOOLEAN DEFAULT false,
  emergencial BOOLEAN DEFAULT false,
  
  -- Fornecedores concorrentes (para AC não emergencial)
  fornecedor_concorrente_1_id UUID REFERENCES public.fornecedores(id),
  fornecedor_concorrente_2_id UUID REFERENCES public.fornecedores(id),
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de anexos
CREATE TABLE public.anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- chamado, orcamento_escolhido, orcamento_concorrente_1, etc.
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de histórico de ações
CREATE TABLE public.historico_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  status_anterior request_status,
  status_novo request_status,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_solicitacoes ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (security definer para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se é backoffice ou admin
CREATE OR REPLACE FUNCTION public.is_backoffice_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('backoffice', 'admin')
  )
$$;

-- RLS Policies para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies para user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para fornecedores (todos autenticados podem ver e inserir)
CREATE POLICY "Authenticated users can view fornecedores" ON public.fornecedores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert fornecedores" ON public.fornecedores
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update fornecedores" ON public.fornecedores
  FOR UPDATE TO authenticated USING (true);

-- RLS Policies para solicitacoes
CREATE POLICY "Users can view own solicitacoes" ON public.solicitacoes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Backoffice can view all solicitacoes" ON public.solicitacoes
  FOR SELECT USING (public.is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Users can insert own solicitacoes" ON public.solicitacoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending solicitacoes" ON public.solicitacoes
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pendente_correcao');

CREATE POLICY "Backoffice can update all solicitacoes" ON public.solicitacoes
  FOR UPDATE USING (public.is_backoffice_or_admin(auth.uid()));

-- RLS Policies para anexos
CREATE POLICY "Users can view own anexos" ON public.anexos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Backoffice can view all anexos" ON public.anexos
  FOR SELECT USING (public.is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Users can insert own anexos" ON public.anexos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own anexos" ON public.anexos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id AND s.user_id = auth.uid()
    )
  );

-- RLS Policies para historico
CREATE POLICY "Users can view own historico" ON public.historico_solicitacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Backoffice can view all historico" ON public.historico_solicitacoes
  FOR SELECT USING (public.is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Authenticated can insert historico" ON public.historico_solicitacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Atribuir role padrão de solicitante
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'solicitante');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Função para gerar protocolo único
CREATE OR REPLACE FUNCTION public.generate_protocolo()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  ano TEXT;
  seq INTEGER;
  novo_protocolo TEXT;
BEGIN
  ano := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(protocolo FROM 5 FOR 6) AS INTEGER)), 0) + 1
  INTO seq
  FROM public.solicitacoes
  WHERE protocolo LIKE ano || '%';
  
  novo_protocolo := ano || LPAD(seq::TEXT, 6, '0');
  RETURN novo_protocolo;
END;
$$;

-- Trigger para gerar protocolo automaticamente
CREATE OR REPLACE FUNCTION public.set_protocolo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.protocolo IS NULL THEN
    NEW.protocolo := public.generate_protocolo();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_solicitacao_protocolo
  BEFORE INSERT ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_protocolo();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitacoes_updated_at
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket para anexos
INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos', 'anexos', false);

-- Policies para storage de anexos
CREATE POLICY "Users can upload own anexos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'anexos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own anexos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'anexos' AND (
  auth.uid()::text = (storage.foldername(name))[1]
  OR public.is_backoffice_or_admin(auth.uid())
));

CREATE POLICY "Users can delete own anexos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'anexos' AND auth.uid()::text = (storage.foldername(name))[1]);