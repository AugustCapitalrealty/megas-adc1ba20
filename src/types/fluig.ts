// Types for Fluig dashboard data

export interface FluigSnapshot {
  id: string;
  solicitacao_fluig: string;
  data_lancamento: string | null;
  fornecedor: string | null;
  valor: number | null;
  servico: string | null;
  responsavel_atual: string | null;
  empreendimento: string | null;
  situacao: string | null;
  localizacao: string | null;
  
  // Approval stages
  gerencia_responsavel: string | null;
  gerencia_conclusao: string | null;
  gerencia_facilities_responsavel: string | null;
  gerencia_facilities_conclusao: string | null;
  gerencia_financeiro_responsavel: string | null;
  gerencia_financeiro_conclusao: string | null;
  diretoria_responsavel: string | null;
  diretoria_conclusao: string | null;
  
  // Process dates
  data_inicio: string | null;
  data_fim: string | null;
  
  // Link to internal solicitation
  solicitacao_interna_id: string | null;
  
  // Import metadata
  importado_em: string;
  importado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface FluigEvento {
  id: string;
  solicitacao_fluig: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  importado_em: string;
  importado_por: string | null;
  created_at: string;
}

export interface FluigImportResult {
  totalLinhas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  novas: number;
  atualizadas: number;
  comAlteracaoStatus: number;
  erros: string[];
}

export interface FluigRowData {
  solicitacao_fluig: string;
  data_lancamento: Date | null;
  fornecedor: string | null;
  valor: number | null;
  servico: string | null;
  responsavel_atual: string | null;
  empreendimento: string | null;
  situacao: string | null;
  localizacao: string | null;
  
  gerencia_responsavel: string | null;
  gerencia_conclusao: Date | null;
  gerencia_facilities_responsavel: string | null;
  gerencia_facilities_conclusao: Date | null;
  gerencia_financeiro_responsavel: string | null;
  gerencia_financeiro_conclusao: Date | null;
  diretoria_responsavel: string | null;
  diretoria_conclusao: Date | null;
  
  data_inicio: Date | null;
  data_fim: Date | null;
}

// Column mapping configuration
export const FLUIG_COLUMN_MAPPINGS = {
  // Required
  solicitacao: ['solicitacao'],
  
  // Basic info
  inicio: ['inicio'],
  fim: ['fim'],
  responsavel: ['responsavel'],
  situacao: ['situacao'],
  localizacao: ['localizacao'],
  descricao: [
    'autCondHistOC - CON001 - Autorizacao Contratacao - Condomínios',
    'autcondhisto - con001 - autorizacao contratacao - condominios',
    'autcondhistoc - con001 - autorizacao contratacao - condominios',
    'autcondhistoco - con001 - autorizacao contratacao - condominios',
    'historico - con001 - autorizacao contratacao - condominios',
    'descricao',
    'descrição',
    'desc',
  ],
  
  // Supplier (priority order)
  fornecedor: [
    'fornecedores - con001 - autorizacao contratacao - condominios',
    'autcondccfornecedore - con001 - autorizacao contratacao - condominios',
    'autconditemfornec - con001 - autorizacao contratacao - condominios',
  ],
  
  // Value (priority order)
  valor: [
    'autcondvalorfinal - con001 - autorizacao contratacao - condominios',
    'autcondvalorcontrato - con001 - autorizacao contratacao - condominios',
    'autcondvalorttal - con001 - autorizacao contratacao - condominios',
    'autcondvalor - con001 - autorizacao contratacao - condominios',
  ],
  
  // Service
  servico: ['autcondprodutoservico - con001 - autorizacao contratacao - condominios'],
  
  // Enterprise
  empreendimento: ['autcondempreendimento - con001 - autorizacao contratacao - condominios'],
  
  // Approval stages - Gerência (Level 1)
  gerencia_responsavel: ['atividade - con001 - autorizacao contratacao - condominios - aprovacao nivel 1 - responsavel'],
  gerencia_conclusao: ['atividade - con001 - autorizacao contratacao - condominios - aprovacao nivel 1 - conclusao'],
  
  // Approval stages - Gerência Financeiro
  gerencia_financeiro_responsavel: ['atividade - con001 - autorizacao contratacao - condominios - aprovacao financeiro - responsavel'],
  gerencia_financeiro_conclusao: ['atividade - con001 - autorizacao contratacao - condominios - aprovacao financeiro - conclusao'],
  
  // Approval stages - Diretoria (Level 3)
  diretoria_responsavel: ['atividade - con001 - autorizacao contratacao - condominios - aprovacao nivel 3 - responsavel'],
  diretoria_conclusao: ['atividade - con001 - autorizacao contratacao - condominios - aprovacao nivel 3 - conclusao'],
  
  // Approval stages - Gerência Facilities (Aprovado)
  gerencia_facilities_responsavel: ['atividade - con001 - autorizacao contratacao - condominios - aprovado - responsavel'],
  gerencia_facilities_conclusao: ['atividade - con001 - autorizacao contratacao - condominios - aprovado - conclusao'],
} as const;
