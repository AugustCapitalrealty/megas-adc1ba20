-- Fase 1.2: Adicionar novas naturezas orçamentárias
ALTER TYPE natureza_orcamentaria ADD VALUE IF NOT EXISTS 'servicos_diversos';
ALTER TYPE natureza_orcamentaria ADD VALUE IF NOT EXISTS 'propaganda_publicidade';
ALTER TYPE natureza_orcamentaria ADD VALUE IF NOT EXISTS 'taxa_impostos';
ALTER TYPE natureza_orcamentaria ADD VALUE IF NOT EXISTS 'manutencao_maquinas_equipamentos';
ALTER TYPE natureza_orcamentaria ADD VALUE IF NOT EXISTS 'despesas_pessoal';
ALTER TYPE natureza_orcamentaria ADD VALUE IF NOT EXISTS 'despesas_administrador';

-- Fase 1.3: Adicionar opção 'ambos' ao tipo_garantia
ALTER TYPE tipo_garantia ADD VALUE IF NOT EXISTS 'ambos';