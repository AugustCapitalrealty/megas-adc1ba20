export type AppRole = 'solicitante' | 'backoffice' | 'admin';
export type RequestType = 'AC' | 'OC';
export type RequestStatus = 'recebido' | 'em_analise' | 'pendente_correcao' | 'aprovado' | 'rejeitado' | 'em_processamento' | 'oc_ac_emitida' | 'aguardando_aceite' | 'aguardando_informacoes' | 'concluida' | 'aguardando_nf_boleto' | 'nf_boleto_enviados' | 'enviado_pagamento';
export type Empreendimento = 'mega_curitiba' | 'mega_itajai' | 'mega_esteio' | 'todos';
export type NaturezaOrcamentaria = 
  | 'materiais_informatica'
  | 'seguranca_vigilancia'
  | 'assistencia_informatica'
  | 'limpeza_conservacao'
  | 'material_consumo'
  | 'telefone'
  | 'energia_eletrica'
  | 'agua'
  | 'manutencao_imoveis'
  | 'material_expediente'
  | 'servicos_diversos'
  | 'propaganda_publicidade'
  | 'taxa_impostos'
  | 'manutencao_maquinas_equipamentos'
  | 'despesas_pessoal'
  | 'despesas_administrador';
export type TipoContratacao = 'servicos' | 'material_construcao' | 'material_consumo' | 'combustivel' | 'taxas';
export type OrigemCusto = 'empreendimento' | 'cliente';
export type TipoGarantia = 'servico' | 'produto' | 'nenhuma' | 'ambos';
export type TipoDocumentoFiscal = 'nota_fiscal' | 'boleto';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Fornecedor {
  id: string;
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  is_mei: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  created_at: string;
}

export interface ClienteEmpreendimento {
  id: string;
  cliente_id: string;
  empreendimento: Empreendimento;
  created_at: string;
  cliente?: Cliente;
}

export interface Solicitacao {
  id: string;
  protocolo: string;
  user_id: string;
  empreendimento: Empreendimento;
  descricao: string;
  valor: number;
  valor_servico: number | null;
  valor_material: number | null;
  tipo: RequestType;
  status: RequestStatus;
  natureza_orcamentaria: NaturezaOrcamentaria;
  origem_custo: OrigemCusto;
  fornecedor_id: string | null;
  cliente_id: string | null;
  tipo_contratacao: TipoContratacao | null;
  data_inicio: string | null;
  data_fim: string | null;
  parcelas: number;
  contrato_mensal: boolean;
  faturamento_direto: boolean;
  retencao_6_porcento: boolean;
  tipo_garantia: TipoGarantia | null;
  dias_garantia: number | null;
  dias_garantia_servico: number | null;
  dias_garantia_produto: number | null;
  custo_cliente: boolean;
  emergencial: boolean;
  fornecedor_concorrente_1_id: string | null;
  fornecedor_concorrente_2_id: string | null;
  justificativa_fornecedores: string | null;
  numero_chamado_fluig: string | null;
  excecao_fornecedores: boolean;
  resposta_informacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  fornecedor?: Fornecedor;
  fornecedor_concorrente_1?: Fornecedor;
  fornecedor_concorrente_2?: Fornecedor;
  cliente?: Cliente;
  profile?: Profile;
}

export interface Anexo {
  id: string;
  solicitacao_id: string;
  tipo: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  created_at: string;
}

export interface HistoricoSolicitacao {
  id: string;
  solicitacao_id: string;
  user_id: string;
  acao: string;
  status_anterior: RequestStatus | null;
  status_novo: RequestStatus | null;
  motivo: string | null;
  created_at: string;
  profile?: Profile;
}

// Labels for display
export const EMPREENDIMENTO_LABELS: Record<Empreendimento, string> = {
  mega_curitiba: 'Mega Curitiba',
  mega_itajai: 'Mega Itajaí',
  mega_esteio: 'Mega Esteio',
  todos: 'Rateio entre Megas',
};

export const NATUREZA_ORCAMENTARIA_LABELS: Record<NaturezaOrcamentaria, string> = {
  materiais_informatica: 'Materiais de Informática',
  assistencia_informatica: 'Assistência Informática',
  servicos_diversos: 'Serviços Diversos',
  seguranca_vigilancia: 'Segurança e Vigilância',
  limpeza_conservacao: 'Limpeza e Conservação',
  material_expediente: 'Material de Expediente',
  material_consumo: 'Material de Consumo',
  telefone: 'Telefone',
  propaganda_publicidade: 'Propaganda e Publicidade',
  energia_eletrica: 'Energia Elétrica',
  agua: 'Água',
  taxa_impostos: 'Taxa/Impostos',
  manutencao_imoveis: 'Manutenção de Imóveis',
  manutencao_maquinas_equipamentos: 'Manutenção de Máquinas e Equipamentos',
  despesas_pessoal: 'Despesas com Pessoal',
  despesas_administrador: 'Despesas com Administrador',
};

export const TIPO_CONTRATACAO_LABELS: Record<TipoContratacao, string> = {
  servicos: 'Serviços / Produto (AC)',
  material_construcao: 'Material de Construção (OC)',
  material_consumo: 'Material de Consumo (OC)',
  combustivel: 'Combustível (OC)',
  taxas: 'Taxas e Tributos (OC)',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  recebido: 'Aguardando Análise',
  em_analise: 'Em Análise pelo Backoffice',
  pendente_correcao: 'Correção Necessária',
  aprovado: 'Aprovado',
  rejeitado: 'Não Aprovado',
  em_processamento: 'Em Aprovação',
  oc_ac_emitida: 'OC Enviada - Aguardando Aceite',
  aguardando_aceite: 'Aguardando Aceite do Solicitante',
  aguardando_informacoes: 'Aguardando Informações',
  concluida: 'Finalizada',
  aguardando_nf_boleto: 'Aguardando NF/Boleto',
  nf_boleto_enviados: 'NF/Boleto Enviados',
  enviado_pagamento: 'Enviado para Pagamento',
};

export interface DocumentoEmitido {
  id: string;
  solicitacao_id: string;
  tipo_documento: 'OC' | 'AC';
  numero_documento: string;
  storage_path: string;
  nome_arquivo: string;
  observacao: string | null;
  emitido_por: string;
  created_at: string;
}

export const ORIGEM_CUSTO_LABELS: Record<OrigemCusto, string> = {
  empreendimento: 'Área comum',
  cliente: 'Cliente',
};

export const TIPO_GARANTIA_LABELS: Record<TipoGarantia, string> = {
  nenhuma: 'Sem Garantia',
  servico: 'Garantia de Serviço',
  produto: 'Garantia de Produto',
  ambos: 'Garantia de Serviço e Produto',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  solicitante: 'Solicitante (Facilities)',
  backoffice: 'Analista Financeiro',
  admin: 'Administrador do Sistema',
};

// Labels padronizados para anexos
export const ANEXO_LABELS: Record<string, string> = {
  chamado_preventiva: 'Chamado Técnico / Ordem de Serviço',
  escopo_detalhado: 'Memorial Descritivo',
  mapa_cotacao: 'Mapa Comparativo de Preços',
  orcamento_escolhido: 'Proposta do Fornecedor Selecionado',
  orcamento_concorrente_1: 'Proposta Concorrente 1',
  orcamento_concorrente_2: 'Proposta Concorrente 2',
  comunicado_cliente: 'Comunicado ao Cliente',
  rateio: 'Planilha de Rateio',
};

// Interface para documentos fiscais (NF/Boleto)
export interface DocumentoFiscal {
  id: string;
  solicitacao_id: string;
  tipo: TipoDocumentoFiscal;
  storage_path: string;
  nome_arquivo: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  data_emissao_nf: string | null;
  data_vencimento_boleto: string | null;
  pagamento_antecipado: boolean;
  justificativa_antecipado: string | null;
  user_id: string;
  baixa_financeiro_em: string | null;
  baixa_financeiro_por: string | null;
  created_at: string;
}

// Interface para mensagens de solicitação
export interface SolicitacaoMensagem {
  id: string;
  solicitacao_id: string;
  user_id: string;
  mensagem: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
}