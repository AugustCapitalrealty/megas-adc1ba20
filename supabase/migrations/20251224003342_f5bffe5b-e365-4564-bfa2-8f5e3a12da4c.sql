-- Adicionar campos de enriquecimento na tabela fornecedores
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS cnae_principal_codigo integer,
ADD COLUMN IF NOT EXISTS cnae_principal_descricao text,
ADD COLUMN IF NOT EXISTS cnaes_secundarios jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS situacao_cadastral integer,
ADD COLUMN IF NOT EXISTS situacao_cadastral_descricao text,
ADD COLUMN IF NOT EXISTS data_situacao_cadastral date,
ADD COLUMN IF NOT EXISTS natureza_juridica text,
ADD COLUMN IF NOT EXISTS porte text,
ADD COLUMN IF NOT EXISTS capital_social numeric(15,2),
ADD COLUMN IF NOT EXISTS data_inicio_atividade date,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS bairro text,
ADD COLUMN IF NOT EXISTS numero text,
ADD COLUMN IF NOT EXISTS complemento text,
ADD COLUMN IF NOT EXISTS logradouro text,
ADD COLUMN IF NOT EXISTS ultima_atualizacao_api timestamp with time zone;

-- Criar índice para facilitar cache lookup
CREATE INDEX IF NOT EXISTS idx_fornecedores_ultima_atualizacao 
ON public.fornecedores(cnpj, ultima_atualizacao_api);