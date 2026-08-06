import type {
  Empreendimento,
  NaturezaOrcamentaria,
  TipoContratacao,
  OrigemCusto,
  TipoGarantia,
  Fornecedor,
  InstrumentoJuridico,
} from '@/types';
import type { UploadedFile } from '@/components/FileUpload';
import type { RateioValor } from '@/components/RateioPreview';

export type Step = 'empreendimento' | 'descricao' | 'tipo' | 'natureza_servico' | 'detalhes' | 'fornecedor' | 'anexos' | 'revisao';

export interface StepDefinition {
  id: Step;
  label: string;
  show: boolean;
  description: string;
}

export interface FormState {
  // Core
  empreendimento: Empreendimento | '';
  descricao: string;
  valor: string;
  tipoContratacao: TipoContratacao | '';
  naturezaOrcamentaria: NaturezaOrcamentaria | '';
  origemCusto: OrigemCusto;

  // AC specific
  dataInicio: string;
  dataFim: string;
  parcelas: string;
  contratoMensal: boolean;
  faturamentoDireto: boolean;
  valorServico: string;
  valorMaterial: string;
  retencao6: boolean;
  tipoGarantia: TipoGarantia;
  diasGarantia: string;
  diasGarantiaServico: string;
  diasGarantiaProduto: string;
  custoCliente: boolean;
  emergencial: boolean;

  // Fornecedores
  fornecedor: Fornecedor | null;
  fornecedorConcorrente1: Fornecedor | null;
  fornecedorConcorrente2: Fornecedor | null;

  // Cliente
  clienteId: string | null;
  clienteNome: string;

  // Exceção fornecedores
  excecaoFornecedores: boolean;
  justificativaFornecedores: string;
  fornecimentoExclusivo: boolean;
  justificativaExclusividade: string;

  // Chamados/memorial
  temChamadoInfraspeak: boolean;
  chamadoCorretiva: boolean;
  semMemorial: boolean;
  justificativaSemMemorial: string;

  // Natureza serviço (fluxo jurídico)
  naturezaObraCivil: boolean;
  naturezaAlturaRisco: boolean;
  naturezaFossaFiltro: boolean;
  naturezaPrecoVariavel: boolean;
  nenhumaOpcaoNatureza: boolean;
  escopoDetalhadoMinuta: string;
  dueDiligenceConfirmada: boolean;
  dueDiligenceNumeroProjuris: string;
  temProcessoProjuris: boolean;

  // Rateio
  tipoRateio: string;
  rateioValores: RateioValor[];
  rateioEmpreendimentosSelecionados: string[];

  // Signatários (Webdox) — obrigatórios quando o instrumento não é OC
  representanteLegalNome: string;
  representanteLegalCpf: string;
  representanteLegalEmail: string;
  representanteLegalTelefone: string;
  testemunhaNome: string;
  testemunhaCpf: string;
  testemunhaEmail: string;
  testemunhaTelefone: string;

  // Anexos
  anexos: Record<string, UploadedFile | null>;
  outrosAnexos: UploadedFile[];
}

export interface DerivedValues {
  valorNumerico: number;
  valorServicoNumerico: number;
  valorMaterialNumerico: number;
  isOC: boolean;
  isAC: boolean;
  isOCAbove1000: boolean;
  showEmergencial: boolean;
  showNaturezaServicoStep: boolean;
  requerFluxoJuridico: boolean;
  instrumentoJuridico: InstrumentoJuridico;
  requerEscopoDetalhado: boolean;
  requerDueDiligence: boolean;
  requires3CNPJs: boolean;
}

export interface FormSetters {
  setEmpreendimento: (v: Empreendimento | '') => void;
  setDescricao: (v: string) => void;
  setValor: (v: string) => void;
  setTipoContratacao: (v: TipoContratacao | '') => void;
  setNaturezaOrcamentaria: (v: NaturezaOrcamentaria | '') => void;
  setOrigemCusto: (v: OrigemCusto) => void;
  setDataInicio: (v: string) => void;
  setDataFim: (v: string) => void;
  setParcelas: (v: string) => void;
  setContratoMensal: (v: boolean) => void;
  setFaturamentoDireto: (v: boolean) => void;
  setValorServico: (v: string) => void;
  setValorMaterial: (v: string) => void;
  setRetencao6: (v: boolean) => void;
  setTipoGarantia: (v: TipoGarantia) => void;
  setDiasGarantia: (v: string) => void;
  setDiasGarantiaServico: (v: string) => void;
  setDiasGarantiaProduto: (v: string) => void;
  setCustoCliente: (v: boolean) => void;
  setEmergencial: (v: boolean) => void;
  setFornecedor: (v: Fornecedor | null) => void;
  setFornecedorConcorrente1: (v: Fornecedor | null) => void;
  setFornecedorConcorrente2: (v: Fornecedor | null) => void;
  setClienteId: (v: string | null) => void;
  setClienteNome: (v: string) => void;
  setExcecaoFornecedores: (v: boolean) => void;
  setJustificativaFornecedores: (v: string) => void;
  setFornecimentoExclusivo: (v: boolean) => void;
  setJustificativaExclusividade: (v: string) => void;
  setTemChamadoInfraspeak: (v: boolean) => void;
  setChamadoCorretiva: (v: boolean) => void;
  setSemMemorial: (v: boolean) => void;
  setJustificativaSemMemorial: (v: string) => void;
  setNaturezaObraCivil: (v: boolean) => void;
  setNaturezaAlturaRisco: (v: boolean) => void;
  setNaturezaFossaFiltro: (v: boolean) => void;
  setNaturezaPrecoVariavel: (v: boolean) => void;
  setNenhumaOpcaoNatureza: (v: boolean) => void;
  setEscopoDetalhadoMinuta: (v: string) => void;
  setDueDiligenceConfirmada: (v: boolean) => void;
  setDueDiligenceNumeroProjuris: (v: string) => void;
  setTemProcessoProjuris: (v: boolean) => void;
  setTipoRateio: (v: string) => void;
  setRateioValores: (v: RateioValor[]) => void;
  setRateioEmpreendimentosSelecionados: (v: string[]) => void;
  setRepresentanteLegalNome: (v: string) => void;
  setRepresentanteLegalCpf: (v: string) => void;
  setRepresentanteLegalEmail: (v: string) => void;
  setRepresentanteLegalTelefone: (v: string) => void;
  setTestemunhaNome: (v: string) => void;
  setTestemunhaCpf: (v: string) => void;
  setTestemunhaEmail: (v: string) => void;
  setTestemunhaTelefone: (v: string) => void;
  setAnexos: (v: Record<string, UploadedFile | null>) => void;
  setOutrosAnexos: (v: UploadedFile[]) => void;
}

export interface StepProps {
  formState: FormState;
  derived: DerivedValues;
  setters: FormSetters;
}

// Naturezas orçamentárias isentas de Chamado/Preventiva (para AC)
export const NATUREZAS_ISENTAS_ANEXOS: NaturezaOrcamentaria[] = [
  'agua',
  'energia_eletrica',
  'telefone',
  'taxa_impostos',
  'material_consumo',
];

// Naturezas de Água e Energia (só rateio para OC)
export const NATUREZAS_AGUA_ENERGIA: NaturezaOrcamentaria[] = ['agua', 'energia_eletrica'];

// Mapeamento de tipo_contratacao para natureza_orcamentaria (OC)
export const TIPO_TO_NATUREZA: Record<string, NaturezaOrcamentaria> = {
  material_construcao: 'manutencao_imoveis',
  material_consumo: 'material_consumo',
  combustivel: 'servicos_diversos',
  taxas: 'taxa_impostos',
  agua: 'agua',
  energia: 'energia_eletrica',
};
