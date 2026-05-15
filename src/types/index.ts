export type AppRole = 'solicitante' | 'backoffice' | 'admin' | 'super_admin';
export type RequestType = 'AC' | 'OC';
export type RequestStatus = 'rascunho' | 'recebido' | 'em_analise' | 'pendente_correcao' | 'aprovado' | 'rejeitado' | 'em_processamento' | 'oc_ac_emitida' | 'aguardando_aceite' | 'aguardando_informacoes' | 'concluida' | 'aguardando_nf_boleto' | 'nf_boleto_enviados' | 'enviado_pagamento' | 'liberado_fornecedor' | 'enviado_fornecedor' | 'cancelado' | 'aguardando_execucao';
export type Empreendimento = 'mega_curitiba' | 'mega_itajai' | 'mega_esteio' | 'mega_canoas' | 'todos';
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
export type TipoContratacao = 'servicos' | 'material_construcao' | 'material_consumo' | 'combustivel' | 'taxas' | 'agua' | 'energia';
export type OrigemCusto = 'empreendimento' | 'cliente';
export type TipoGarantia = 'servico' | 'produto' | 'nenhuma' | 'ambos';
export type TipoDocumentoFiscal = 'nota_fiscal' | 'boleto';
export type InstrumentoJuridico = 'oc' | 'termo_contratacao' | 'contrato_prestacao' | 'contrato_fornecimento' | 'contrato_empreitada';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  approved: boolean;
  created_at: string;
  updated_at: string;
  onboarding_completed_at: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface CNAESecundario {
  codigo: number;
  descricao: string;
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
  // Campos de enriquecimento
  cnae_principal_codigo: number | null;
  cnae_principal_descricao: string | null;
  cnaes_secundarios: CNAESecundario[] | null;
  situacao_cadastral: number | null;
  situacao_cadastral_descricao: string | null;
  data_situacao_cadastral: string | null;
  natureza_juridica: string | null;
  porte: string | null;
  capital_social: number | null;
  data_inicio_atividade: string | null;
  cep: string | null;
  bairro: string | null;
  numero: string | null;
  complemento: string | null;
  logradouro: string | null;
  ultima_atualizacao_api: string | null;
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
  data_pendente_correcao: string | null;
  fornecimento_exclusivo: boolean;
  justificativa_exclusividade: string | null;
  data_conclusao: string | null;
  created_at: string;
  updated_at: string;
  // Optional / extended fields (presentes no banco; nem todas as queries trazem)
  fornecedor_email_contato?: string | null;
  fornecedor_telefone_contato?: string | null;
  instrumento_juridico?: string | null;
  numero_projuris?: string | null;
  escopo_detalhado_minuta?: string | null;
  due_diligence_confirmada?: boolean | null;
  due_diligence_numero_projuris?: string | null;
  rateio_valores?: Record<string, number> | null;
  tipo_rateio?: 'por_unidade' | 'por_area' | string | null;
  justificativa_sem_chamado?: string | null;
  justificativa_sem_memorial?: string | null;
  cancelamento_pendente?: boolean | null;
  cancelamento_ciencia_em?: string | null;
  valor_mensal?: number | null;
  data_execucao_servico?: string | null;
  numero_fluig_cadastro?: string | null;
  numero_fluig_pagamento?: string | null;
  ia_cnae_status?: string | null;
  ia_cnae_justificativa?: string | null;
  ia_cnae_avaliado_em?: string | null;
  ia_descricao_vaga?: boolean | null;
  ia_descricao_sugestao?: string | null;
  ia_descricao_avaliado_em?: string | null;
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
  mega_canoas: 'Mega Canoas',
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
  agua: 'Água (OC)',
  energia: 'Energia (OC)',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  rascunho: 'Rascunho',
  recebido: 'Em Fila',
  em_analise: 'Em Análise pelo Backoffice',
  pendente_correcao: 'Correção Necessária',
  aprovado: 'Em Aprovação',
  rejeitado: 'Não Aprovado',
  em_processamento: 'Em Lançamento',
  oc_ac_emitida: 'OC Enviada - Aguardando Aceite',
  aguardando_aceite: 'Aguardando Aceite do Solicitante',
  aguardando_informacoes: 'Aguardando Informações',
  concluida: 'Finalizada',
  aguardando_nf_boleto: 'Aguardando NF/Boleto (legado)',
  nf_boleto_enviados: 'NF/Boleto Enviados (legado)',
  enviado_pagamento: 'Enviado para Pagamento (legado)',
  liberado_fornecedor: 'Liberada para Fornecedor',
  enviado_fornecedor: 'OC Enviada ao Fornecedor',
  cancelado: 'Cancelada',
  aguardando_execucao: 'Aguardando Execução do Serviço',
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
  super_admin: 'Super Administrador',
};

// Labels padronizados para anexos
// Action hints — what the user should do/expect for each status
export const STATUS_ACTION_LABELS: Record<RequestStatus, string> = {
  rascunho: 'Complete as informações e envie quando estiver pronto',
  recebido: 'Sua solicitação está na fila de análise',
  em_analise: 'O backoffice está analisando sua solicitação',
  pendente_correcao: 'Você precisa corrigir e reenviar',
  aprovado: 'Aprovada! Em processo de aprovação interna',
  rejeitado: 'Esta solicitação não foi aprovada',
  em_processamento: 'Em processo de lançamento',
  oc_ac_emitida: 'Aceite a OC para liberar ao fornecedor',
  aguardando_aceite: 'Aceite o documento para prosseguir',
  aguardando_informacoes: 'O backoffice pediu informações adicionais',
  concluida: 'Processo finalizado',
  aguardando_nf_boleto: 'Envie a NF e boleto do fornecedor',
  nf_boleto_enviados: 'Documentos fiscais enviados para análise',
  enviado_pagamento: 'O pagamento está sendo processado',
  liberado_fornecedor: 'Fornecedor já pode executar o serviço',
  enviado_fornecedor: 'OC foi enviada ao fornecedor',
  cancelado: 'Esta solicitação foi cancelada',
  aguardando_execucao: 'Aguardando a execução do serviço pelo fornecedor',
};

export const ANEXO_LABELS: Record<string, string> = {
  chamado_preventiva: 'Chamado Infraspeak',
  escopo_detalhado: 'Memorial Descritivo/Escopo',
  mapa_cotacao: 'Mapa Comparativo de Preços',
  orcamento_escolhido: 'Proposta do Fornecedor Selecionado',
  orcamento_concorrente_1: 'Proposta Concorrente 1',
  orcamento_concorrente_2: 'Proposta Concorrente 2',
  comunicado_cliente: 'Comunicado ao Cliente',
  rateio: 'Planilha de Rateio',
  fatura_agua_energia: 'Fatura de Água/Energia',
  outros: 'Outros Anexos',
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

// Labels para instrumento jurídico
export const INSTRUMENTO_JURIDICO_LABELS: Record<InstrumentoJuridico, string> = {
  oc: 'Ordem de Compra',
  termo_contratacao: 'Termo de Contratação',
  contrato_prestacao: 'Contrato de Prestação',
  contrato_fornecimento: 'Contrato de Fornecimento',
  contrato_empreitada: 'Contrato de Empreitada',
};

// Labels curtos para badges
export const INSTRUMENTO_JURIDICO_LABELS_SHORT: Record<InstrumentoJuridico, string> = {
  oc: 'OC',
  termo_contratacao: 'Termo',
  contrato_prestacao: 'Contrato',
  contrato_fornecimento: 'Fornecimento',
  contrato_empreitada: 'Empreitada',
};

// Etapas do fluxo jurídico
export type EtapaJuridica = 
  | 'minuta_elaboracao'
  | 'minuta_revisao'
  | 'enviado_assinatura'
  | 'assinado_fornecedor'
  | 'assinado_contratante'
  | 'contrato_vigente'
  | 'aditivo_necessario'
  | 'encerrado';

export const ETAPA_JURIDICA_LABELS: Record<EtapaJuridica, string> = {
  minuta_elaboracao: 'Minuta em Elaboração',
  minuta_revisao: 'Minuta em Revisão',
  enviado_assinatura: 'Enviado para Assinatura',
  assinado_fornecedor: 'Assinado pelo Fornecedor',
  assinado_contratante: 'Assinado pela Contratante',
  contrato_vigente: 'Contrato Vigente',
  aditivo_necessario: 'Aditivo Necessário',
  encerrado: 'Encerrado',
};

export const ETAPAS_JURIDICAS_ORDEM: EtapaJuridica[] = [
  'minuta_elaboracao',
  'minuta_revisao',
  'enviado_assinatura',
  'assinado_fornecedor',
  'assinado_contratante',
  'contrato_vigente',
  'aditivo_necessario',
  'encerrado',
];

export interface AcompanhamentoJuridico {
  id: string;
  solicitacao_id: string;
  etapa: EtapaJuridica;
  observacao: string | null;
  user_id: string;
  created_at: string;
  profile?: {
    full_name: string | null;
  };
}
