import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { useNavigate, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCNPJ } from '@/hooks/useCNPJ';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { supabase } from '@/integrations/supabase/client';
import { 
  EMPREENDIMENTO_LABELS, 
  NATUREZA_ORCAMENTARIA_LABELS,
  TIPO_CONTRATACAO_LABELS,
  ORIGEM_CUSTO_LABELS,
  TIPO_GARANTIA_LABELS,
  ANEXO_LABELS,
  type Empreendimento,
  type NaturezaOrcamentaria,
  type TipoContratacao,
  type OrigemCusto,
  type TipoGarantia,
  type Fornecedor,
  type InstrumentoJuridico,
} from '@/types';
import { ArrowLeft, ArrowRight, Check, Loader2, Search, AlertTriangle, ChevronDown, ChevronUp, FileText, Sparkles, DollarSign, Package, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiFileUpload, OtherFilesUpload, type UploadedFile } from '@/components/FileUpload';
import { SupplierSearch } from '@/components/SupplierSearch';
import { ClienteSelect } from '@/components/ClienteSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDescriptionValidation } from '@/hooks/useDescriptionValidation';
import { useCNAEValidation } from '@/hooks/useCNAEValidation';
import { notifyBackofficeNewSolicitacao } from '@/hooks/useNotificationEmail';
import { StepIndicator, type Step as StepIndicatorStep } from '@/components/StepIndicator';
import { CNAECompatibilityBadge } from '@/components/CNAECompatibilityBadge';
import { MEIAlertBadge } from '@/components/MEIAlertBadge';
import { NaturezaServicoStep } from '@/components/NaturezaServicoStep';
import { DueDiligenceModule } from '@/components/DueDiligenceModule';
import { EscopoDetalhadoField } from '@/components/EscopoDetalhadoField';
import { RetencaoTecnicaAlert } from '@/components/RetencaoTecnicaAlert';
import { RateioPreview, type RateioValor } from '@/components/RateioPreview';

type Step = 'empreendimento' | 'descricao' | 'tipo' | 'natureza_servico' | 'detalhes' | 'fornecedor' | 'anexos' | 'revisao';

// Naturezas orçamentárias isentas de Chamado/Preventiva (para AC)
const NATUREZAS_ISENTAS_ANEXOS: NaturezaOrcamentaria[] = [
  'agua',
  'energia_eletrica', 
  'telefone',
  'taxa_impostos',
  'material_consumo',
];

// Naturezas de Água e Energia (só rateio para OC)
const NATUREZAS_AGUA_ENERGIA: NaturezaOrcamentaria[] = ['agua', 'energia_eletrica'];

// Mapeamento de tipo_contratacao para natureza_orcamentaria (OC)
const TIPO_TO_NATUREZA: Record<string, NaturezaOrcamentaria> = {
  material_construcao: 'manutencao_imoveis',
  material_consumo: 'material_consumo',
  combustivel: 'servicos_diversos',
  taxas: 'taxa_impostos',
  agua: 'agua',
  energia: 'energia_eletrica',
};

interface DuplicateData {
  tipo?: string;
  empreendimento?: Empreendimento;
  natureza_orcamentaria?: NaturezaOrcamentaria;
  tipo_contratacao?: TipoContratacao;
  descricao?: string;
  valor?: number;
  fornecedor_id?: string;
  origem_custo?: OrigemCusto;
  cliente_id?: string;
  emergencial?: boolean;
}

export default function NovaSolicitacao() {
  const { user, effectiveProfile } = useAuth();
  const track = useTrackEvent();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatCNPJ, lookupCNPJ, loading: cnpjLoading, error: cnpjError } = useCNPJ();
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useFormPersistence();

  const effectiveUserId = effectiveProfile?.id ?? user?.id;

  // Check for duplicate data from navigation state
  const duplicateFrom = (location.state as { duplicateFrom?: DuplicateData })?.duplicateFrom;
  
  // Track if we've already loaded draft (to avoid infinite loops)
  const draftLoadedRef = useRef(false);

  const [allowedEmpreendimentos, setAllowedEmpreendimentos] = useState<Empreendimento[]>([]);
  const [loadingEmpreendimentos, setLoadingEmpreendimentos] = useState(true);

  useEffect(() => {
    const fetchAllowedEmpreendimentos = async () => {
      if (!effectiveUserId) {
        setAllowedEmpreendimentos([]);
        setLoadingEmpreendimentos(false);
        return;
      }

      setLoadingEmpreendimentos(true);
      const { data, error } = await supabase
        .from('user_empreendimentos')
        .select('empreendimento')
        .eq('user_id', effectiveUserId);

      if (error) {
        console.error('Erro ao buscar empreendimentos do usuário:', error);
        setAllowedEmpreendimentos([]);
        setLoadingEmpreendimentos(false);
        return;
      }

      const userEmps = (data ?? []).map((d) => d.empreendimento as Empreendimento);
      const hasTodos = userEmps.includes('todos');
      const allOptions = Object.keys(EMPREENDIMENTO_LABELS) as Empreendimento[];
      const allowed = hasTodos ? allOptions : userEmps;

      setAllowedEmpreendimentos(allowed);
      setLoadingEmpreendimentos(false);

      // Ajusta seleção automaticamente
      setEmpreendimento((current) => {
        if (allowed.length === 1) return allowed[0];
        if (current && allowed.includes(current as Empreendimento)) return current;
        return '';
      });
    };

    fetchAllowedEmpreendimentos();
  }, [effectiveUserId]);

  const [currentStep, setCurrentStep] = useState<Step>('empreendimento');
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [empreendimento, setEmpreendimento] = useState<Empreendimento | ''>(duplicateFrom?.empreendimento || '');
  const [descricao, setDescricao] = useState(duplicateFrom?.descricao || '');
  const [valor, setValor] = useState(duplicateFrom?.valor ? String(Math.round(duplicateFrom.valor * 100)) : '');
  const [tipoContratacao, setTipoContratacao] = useState<TipoContratacao | ''>(duplicateFrom?.tipo_contratacao || '');
  const [naturezaOrcamentaria, setNaturezaOrcamentaria] = useState<NaturezaOrcamentaria | ''>(duplicateFrom?.natureza_orcamentaria || '');
  const [origemCusto, setOrigemCusto] = useState<OrigemCusto>(duplicateFrom?.origem_custo || 'empreendimento');
  
  // AC specific
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [contratoMensal, setContratoMensal] = useState(false);
  const [faturamentoDireto, setFaturamentoDireto] = useState(false);
  const [valorServico, setValorServico] = useState('');
  const [valorMaterial, setValorMaterial] = useState('');
  const [retencao6, setRetencao6] = useState(false);
  const [tipoGarantia, setTipoGarantia] = useState<TipoGarantia>('nenhuma');
  const [diasGarantia, setDiasGarantia] = useState('');
  const [diasGarantiaServico, setDiasGarantiaServico] = useState('');
  const [diasGarantiaProduto, setDiasGarantiaProduto] = useState('');
  const [custoCliente, setCustoCliente] = useState(false);
  const [emergencial, setEmergencial] = useState(duplicateFrom?.emergencial || false);

  // Fornecedores
  const [cnpj, setCnpj] = useState('');
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [fornecedorConcorrente1, setFornecedorConcorrente1] = useState<Fornecedor | null>(null);
  const [fornecedorConcorrente2, setFornecedorConcorrente2] = useState<Fornecedor | null>(null);

  // Cliente (quando origem = cliente)
  const [clienteId, setClienteId] = useState<string | null>(duplicateFrom?.cliente_id || null);
  const [clienteNome, setClienteNome] = useState<string>('');

  // Exceção explícita para 3 fornecedores
  const [excecaoFornecedores, setExcecaoFornecedores] = useState(false);

  // Justificativa para exceção de 3 fornecedores
  const [justificativaFornecedores, setJustificativaFornecedores] = useState('');
  
  // Fornecimento exclusivo
  const [fornecimentoExclusivo, setFornecimentoExclusivo] = useState(false);
  const [justificativaExclusividade, setJustificativaExclusividade] = useState('');
  
  // Checkbox para Chamado Infraspeak (OC)
  const [temChamadoInfraspeak, setTemChamadoInfraspeak] = useState(false);
  
  // Flag para AC - "Chamado é uma corretiva?"
  const [chamadoCorretiva, setChamadoCorretiva] = useState(false);
  
  // Flags para AC - sem memorial com justificativa
  const [semMemorial, setSemMemorial] = useState(false);
  const [justificativaSemMemorial, setJustificativaSemMemorial] = useState('');
  
  // Novos estados do fluxo jurídico
  const [naturezaObraCivil, setNaturezaObraCivil] = useState(false);
  const [naturezaAlturaRisco, setNaturezaAlturaRisco] = useState(false);
  const [naturezaFossaFiltro, setNaturezaFossaFiltro] = useState(false);
  const [naturezaPrecoVariavel, setNaturezaPrecoVariavel] = useState(false);
  const [nenhumaOpcaoNatureza, setNenhumaOpcaoNatureza] = useState(false);
  const [escopoDetalhadoMinuta, setEscopoDetalhadoMinuta] = useState('');
  const [dueDiligenceConfirmada, setDueDiligenceConfirmada] = useState(false);
  const [dueDiligenceNumeroProjuris, setDueDiligenceNumeroProjuris] = useState('');
  const [temProcessoProjuris, setTemProcessoProjuris] = useState(false);
  
  // Rateio
  const [tipoRateio, setTipoRateio] = useState('por_area');
  const [rateioValores, setRateioValores] = useState<RateioValor[]>([]);
  
  // AI Description Validation
  const { isValidating: isValidatingDescription, validationResult: descriptionValidation } = useDescriptionValidation(descricao);
  
  // AI CNAE Validation (used to persist results on submit)
  const { validationResult: cnaeValidationResult } = useCNAEValidation({
    descricao,
    fornecedor,
    enabled: !!fornecedor?.cnae_principal_codigo && descricao.length >= 20
  });
  // Load fornecedor from duplicateFrom
  useEffect(() => {
    if (duplicateFrom?.fornecedor_id) {
      const fetchFornecedor = async () => {
        const { data } = await supabase
          .from('fornecedores')
          .select('*')
          .eq('id', duplicateFrom.fornecedor_id)
          .single();
        if (data) {
          // Import dbRowToFornecedor is needed - using inline conversion
          const fornecedor = {
            ...data,
            cnaes_secundarios: Array.isArray(data.cnaes_secundarios) 
              ? data.cnaes_secundarios.map((item: any) => ({ codigo: item.codigo ?? 0, descricao: item.descricao ?? '' }))
              : null
          } as Fornecedor;
          setFornecedor(fornecedor);
        }
      };
      fetchFornecedor();
    }
  }, [duplicateFrom?.fornecedor_id]);

  // Show toast if duplicating
  useEffect(() => {
    if (duplicateFrom) {
      toast({
        title: 'Solicitação duplicada',
        description: 'Os dados foram pré-preenchidos. Revise e ajuste antes de enviar.',
      });
    }
  }, []);

  // Load draft from localStorage on mount (if no duplicate data)
  useEffect(() => {
    if (duplicateFrom || draftLoadedRef.current) return;
    
    const draft = loadDraft();
    if (draft) {
      draftLoadedRef.current = true;
      
      // Restore form state
      setCurrentStep(draft.currentStep as Step);
      setEmpreendimento(draft.empreendimento as Empreendimento | '');
      setDescricao(draft.descricao);
      setValor(draft.valor);
      setTipoContratacao(draft.tipoContratacao as TipoContratacao | '');
      setNaturezaOrcamentaria(draft.naturezaOrcamentaria as NaturezaOrcamentaria | '');
      setOrigemCusto(draft.origemCusto as OrigemCusto);
      setDataInicio(draft.dataInicio);
      setDataFim(draft.dataFim);
      setParcelas(draft.parcelas);
      setContratoMensal(draft.contratoMensal);
      setFaturamentoDireto(draft.faturamentoDireto);
      setValorServico(draft.valorServico);
      setValorMaterial(draft.valorMaterial);
      setRetencao6(draft.retencao6);
      setTipoGarantia(draft.tipoGarantia as TipoGarantia);
      setDiasGarantia(draft.diasGarantia);
      setDiasGarantiaServico(draft.diasGarantiaServico);
      setDiasGarantiaProduto(draft.diasGarantiaProduto);
      setCustoCliente(draft.custoCliente);
      setEmergencial(draft.emergencial);
      setClienteId(draft.clienteId);
      setExcecaoFornecedores(draft.excecaoFornecedores);
      setJustificativaFornecedores(draft.justificativaFornecedores);
      setTemChamadoInfraspeak(draft.temChamadoInfraspeak);
      setChamadoCorretiva(draft.chamadoCorretiva);
      setSemMemorial(draft.semMemorial);
      setJustificativaSemMemorial(draft.justificativaSemMemorial);
      // Restaurar campos do fluxo jurídico
      setNaturezaObraCivil(draft.naturezaObraCivil ?? false);
      setNaturezaAlturaRisco(draft.naturezaAlturaRisco ?? false);
      setNaturezaFossaFiltro(draft.naturezaFossaFiltro ?? false);
      setNaturezaPrecoVariavel(draft.naturezaPrecoVariavel ?? false);
      setNenhumaOpcaoNatureza(draft.nenhumaOpcaoNatureza ?? false);
      setEscopoDetalhadoMinuta(draft.escopoDetalhadoMinuta ?? '');
      setDueDiligenceConfirmada(draft.dueDiligenceConfirmada ?? false);
      setDueDiligenceNumeroProjuris(draft.dueDiligenceNumeroProjuris ?? '');
      setTemProcessoProjuris(draft.temProcessoProjuris ?? false);
      
      // Load fornecedores by ID
      if (draft.fornecedorId) {
        supabase
          .from('fornecedores')
          .select('*')
          .eq('id', draft.fornecedorId)
          .single()
          .then(({ data }) => {
            if (data) {
              setFornecedor({
                ...data,
                cnaes_secundarios: Array.isArray(data.cnaes_secundarios) 
                  ? data.cnaes_secundarios.map((item: any) => ({ codigo: item.codigo ?? 0, descricao: item.descricao ?? '' }))
                  : null
              } as Fornecedor);
            }
          });
      }
      if (draft.fornecedorConcorrente1Id) {
        supabase
          .from('fornecedores')
          .select('*')
          .eq('id', draft.fornecedorConcorrente1Id)
          .single()
          .then(({ data }) => {
            if (data) {
              setFornecedorConcorrente1({
                ...data,
                cnaes_secundarios: Array.isArray(data.cnaes_secundarios) 
                  ? data.cnaes_secundarios.map((item: any) => ({ codigo: item.codigo ?? 0, descricao: item.descricao ?? '' }))
                  : null
              } as Fornecedor);
            }
          });
      }
      if (draft.fornecedorConcorrente2Id) {
        supabase
          .from('fornecedores')
          .select('*')
          .eq('id', draft.fornecedorConcorrente2Id)
          .single()
          .then(({ data }) => {
            if (data) {
              setFornecedorConcorrente2({
                ...data,
                cnaes_secundarios: Array.isArray(data.cnaes_secundarios) 
                  ? data.cnaes_secundarios.map((item: any) => ({ codigo: item.codigo ?? 0, descricao: item.descricao ?? '' }))
                  : null
              } as Fornecedor);
            }
          });
      }
      
      toast({
        title: 'Rascunho restaurado',
        description: 'Os dados do formulário foram recuperados.',
      });
    }
  }, [duplicateFrom, loadDraft, toast]);

  // Save draft whenever form state changes
  useEffect(() => {
    // Don't save if form is empty or submitting
    if (!empreendimento && !descricao && !valor) return;
    if (submitting) return;
    
    saveDraft({
      currentStep,
      empreendimento,
      descricao,
      valor,
      tipoContratacao,
      naturezaOrcamentaria,
      origemCusto,
      dataInicio,
      dataFim,
      parcelas,
      contratoMensal,
      faturamentoDireto,
      valorServico,
      valorMaterial,
      retencao6,
      tipoGarantia,
      diasGarantia,
      diasGarantiaServico,
      diasGarantiaProduto,
      custoCliente,
      emergencial,
      clienteId,
      excecaoFornecedores,
      justificativaFornecedores,
      temChamadoInfraspeak,
      chamadoCorretiva,
      semMemorial,
      justificativaSemMemorial,
      fornecedorId: fornecedor?.id || null,
      fornecedorConcorrente1Id: fornecedorConcorrente1?.id || null,
      fornecedorConcorrente2Id: fornecedorConcorrente2?.id || null,
      // Novos campos do fluxo jurídico
      naturezaObraCivil,
      naturezaAlturaRisco,
      naturezaFossaFiltro,
      naturezaPrecoVariavel,
      nenhumaOpcaoNatureza,
      escopoDetalhadoMinuta,
      dueDiligenceConfirmada,
      dueDiligenceNumeroProjuris,
      temProcessoProjuris,
    });
  }, [
    currentStep, empreendimento, descricao, valor, tipoContratacao, naturezaOrcamentaria,
    origemCusto, dataInicio, dataFim, parcelas, contratoMensal, faturamentoDireto,
    valorServico, valorMaterial, retencao6, tipoGarantia, diasGarantia, diasGarantiaServico,
    diasGarantiaProduto, custoCliente, emergencial, clienteId, excecaoFornecedores,
    justificativaFornecedores, temChamadoInfraspeak, chamadoCorretiva, semMemorial,
    justificativaSemMemorial, fornecedor?.id, fornecedorConcorrente1?.id, fornecedorConcorrente2?.id,
    naturezaObraCivil, naturezaAlturaRisco, naturezaFossaFiltro, naturezaPrecoVariavel,
    nenhumaOpcaoNatureza, escopoDetalhadoMinuta, dueDiligenceConfirmada, dueDiligenceNumeroProjuris, temProcessoProjuris,
    saveDraft, submitting
  ]);

  // Fetch cliente nome when clienteId changes
  useEffect(() => {
    if (!clienteId) {
      setClienteNome('');
      return;
    }
    
    const fetchCliente = async () => {
      const { data } = await supabase
        .from('clientes')
        .select('nome')
        .eq('id', clienteId)
        .single();
      if (data) {
        setClienteNome(data.nome);
      }
    };
    fetchCliente();
  }, [clienteId]);

  // Anexos
  const [anexos, setAnexos] = useState<Record<string, UploadedFile | null>>({});
  const [outrosAnexos, setOutrosAnexos] = useState<UploadedFile[]>([]);

  // Derived values
  const valorNumerico = parseFloat(valor.replace(/\D/g, '')) / 100 || 0;
  const valorServicoNumerico = parseFloat(valorServico.replace(/\D/g, '')) / 100 || 0;
  const valorMaterialNumerico = parseFloat(valorMaterial.replace(/\D/g, '')) / 100 || 0;
  const isOC = valorNumerico <= 1000 || (valorNumerico > 1000 && tipoContratacao !== 'servicos');
  const isAC = valorNumerico > 1000 && tipoContratacao === 'servicos';
  
  // Auto-set natureza_orcamentaria for OC types ONLY when valor > 1000
  const isOCAbove1000 = valorNumerico > 1000 && tipoContratacao !== '' && tipoContratacao !== 'servicos';
  
  useEffect(() => {
    if (isOCAbove1000 && tipoContratacao) {
      const autoNatureza = TIPO_TO_NATUREZA[tipoContratacao];
      if (autoNatureza) {
        setNaturezaOrcamentaria(autoNatureza);
      }
    }
   }, [tipoContratacao, isOCAbove1000]);
  
  // Emergency checkbox should only appear for AC services (>= 1001)
  const showEmergencial = isAC;
  
  // Fluxo jurídico apenas para AC (tipo_contratacao === 'servicos')
  const requerFluxoJuridico = isAC && (
    valorNumerico >= 10000 || 
    naturezaObraCivil || 
    naturezaAlturaRisco || 
    naturezaFossaFiltro || 
    naturezaPrecoVariavel
  );
  
  // Step natureza_servico: exibir para TODO AC (servicos), pois gatilhos de risco 
  // se aplicam independente do valor - usuário sempre pode indicar riscos
  const showNaturezaServicoStep = isAC;
  
  // Calcular instrumento jurídico automaticamente (client-side) - apenas para AC
  const instrumentoJuridico = useMemo((): InstrumentoJuridico => {
    // OC é isento de fluxo jurídico
    if (!isAC) return 'oc';
    
    if (naturezaObraCivil) return 'contrato_empreitada';
    if (naturezaAlturaRisco || naturezaFossaFiltro || naturezaPrecoVariavel) return 'termo_contratacao';
    if (valorNumerico >= 70000) return 'contrato_prestacao';
    if (valorNumerico >= 10000) return 'termo_contratacao';
    return 'oc';
  }, [valorNumerico, naturezaObraCivil, naturezaAlturaRisco, naturezaFossaFiltro, naturezaPrecoVariavel, isAC]);
  
  // Flags derivadas do fluxo jurídico (apenas AC)
  const requerEscopoDetalhado = isAC && instrumentoJuridico !== 'oc';
  const requerDueDiligence = isAC && valorNumerico >= 50000;
  
  // Determine required attachments based on type
  const getRequiredAttachments = () => {
    const isNaturezaIsenta = naturezaOrcamentaria && NATUREZAS_ISENTAS_ANEXOS.includes(naturezaOrcamentaria);
    const isAguaEnergia = naturezaOrcamentaria && NATUREZAS_AGUA_ENERGIA.includes(naturezaOrcamentaria);
    let attachments: { tipo: string; label: string; required: boolean }[] = [];
    
    if (isOC) {
      // OC - Água e Energia: fatura obrigatória + rateio opcional
      if (isAguaEnergia) {
        attachments = [
          { tipo: 'fatura_agua_energia', label: ANEXO_LABELS.fatura_agua_energia, required: true },
          { tipo: 'rateio', label: ANEXO_LABELS.rateio, required: false },
        ];
      } else {
        // OC - Demais naturezas: Proposta obrigatória + Chamado opcional
        attachments = [
          { tipo: 'orcamento_escolhido', label: 'Proposta do Fornecedor (PDF)', required: true },
        ];
        if (temChamadoInfraspeak) {
          attachments.push({ tipo: 'chamado_preventiva', label: 'Chamado Infraspeak', required: false });
        }
      }
    } else if (isAC) {
      // AC NUNCA é isento de anexos - regra correta: apenas OC pode ser isento conforme natureza
      if (emergencial) {
        // AC Emergencial: Proposta obrigatória + Chamado Infraspeak se corretiva
        attachments = [
          { tipo: 'orcamento_escolhido', label: ANEXO_LABELS.orcamento_escolhido, required: true },
        ];
        // Só adiciona chamado se for corretiva
        if (chamadoCorretiva) {
          attachments.unshift({ tipo: 'chamado_preventiva', label: ANEXO_LABELS.chamado_preventiva, required: true });
        }
      } else {
        // AC não emergencial: base attachments (Mapa de Cotação por último)
        attachments = [
          { tipo: 'escopo_detalhado', label: ANEXO_LABELS.escopo_detalhado, required: !semMemorial },
          { tipo: 'orcamento_escolhido', label: ANEXO_LABELS.orcamento_escolhido, required: true },
        ];
        // Só adiciona chamado se for corretiva
        if (chamadoCorretiva) {
          attachments.unshift({ tipo: 'chamado_preventiva', label: ANEXO_LABELS.chamado_preventiva, required: true });
        }
        
        // Cotações concorrentes e mapa só aparecem se NÃO tem exceção de fornecedores E NÃO é fornecimento exclusivo
        if (!excecaoFornecedores && !fornecimentoExclusivo) {
          attachments.push(
            { tipo: 'orcamento_concorrente_1', label: ANEXO_LABELS.orcamento_concorrente_1, required: true },
            { tipo: 'orcamento_concorrente_2', label: ANEXO_LABELS.orcamento_concorrente_2, required: true },
            { tipo: 'mapa_cotacao', label: ANEXO_LABELS.mapa_cotacao, required: true }, // Mapa por último
          );
        } else {
          // Com justificativa, anexo de comprovação é OBRIGATÓRIO
          attachments.push(
            { tipo: 'justificativa_anexo', label: 'Comprovação da Justificativa (ex: e-mail, aceite)', required: true },
          );
        }
      }
      
      // Fatura obrigatória + Rateio opcional para naturezas Água ou Energia (AC)
      if (isAguaEnergia) {
        attachments.push(
          { tipo: 'fatura_agua_energia', label: ANEXO_LABELS.fatura_agua_energia, required: true },
          { tipo: 'rateio', label: ANEXO_LABELS.rateio, required: false }
        );
      }
    }
    
    // Comunicado ao cliente obrigatório quando origem = cliente
    if (origemCusto === 'cliente') {
      attachments.push({ tipo: 'comunicado_cliente', label: ANEXO_LABELS.comunicado_cliente, required: true });
    }
    
    return attachments;
  };

  // Check if 3 CNPJs are required (AC services non-emergency)
  // AC NUNCA é isento - regra correta: apenas OC pode ser isento conforme natureza
  const requires3CNPJs = isAC && !emergencial;

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleCNPJSearch = async () => {
    const result = await lookupCNPJ(cnpj);
    if (result) {
      setFornecedor(result);
      toast({ title: 'Fornecedor encontrado', description: result.razao_social || result.cnpj });
    }
  };

  // Update parcelas default based on contrato mensal
  const handleContratoMensalChange = (checked: boolean) => {
    setContratoMensal(checked);
    if (checked) {
      setParcelas('12');
    } else {
      setParcelas('1');
    }
  };

  const uploadAnexos = async (solicitacaoId: string) => {
    // Upload anexos obrigatórios/padrão
    const uploadPromises = Object.entries(anexos)
      .filter(([_, file]) => file !== null)
      .map(async ([tipo, uploadedFile]) => {
        if (!uploadedFile) return;
        
        const { file } = uploadedFile;
        const fileExt = file.name.split('.').pop();
        const filePath = `${solicitacaoId}/${tipo}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('anexos')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { error: dbError } = await supabase
          .from('anexos')
          .insert({
            solicitacao_id: solicitacaoId,
            tipo,
            nome_arquivo: file.name,
            storage_path: filePath,
            mime_type: file.type,
            tamanho_bytes: file.size,
          });
        
        if (dbError) throw dbError;
      });
    
    // Upload "outros anexos" (opcionais)
    const outrosPromises = outrosAnexos.map(async (uploadedFile, index) => {
      const { file } = uploadedFile;
      const fileExt = file.name.split('.').pop();
      const filePath = `${solicitacaoId}/outros_${Date.now()}_${index}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('anexos')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { error: dbError } = await supabase
        .from('anexos')
        .insert({
          solicitacao_id: solicitacaoId,
          tipo: 'outros',
          nome_arquivo: file.name,
          storage_path: filePath,
          mime_type: file.type,
          tamanho_bytes: file.size,
        });
      
      if (dbError) throw dbError;
    });
    
    await Promise.all([...uploadPromises, ...outrosPromises]);
  };

  // Ref para prevenir double-click
  const isSubmittingRef = useRef(false);

  const handleSubmit = async () => {
    // Proteção extra contra double-click usando ref (mais rápido que state)
    if (isSubmittingRef.current) return;
    if (!user || !empreendimento || !naturezaOrcamentaria || !fornecedor) return;
    
    // Bloquear imediatamente antes de qualquer operação async
    isSubmittingRef.current = true;

    // Validate FD values if enabled
    if (faturamentoDireto) {
      const sum = valorServicoNumerico + valorMaterialNumerico;
      if (Math.abs(sum - valorNumerico) > 0.01) {
        toast({
          title: 'Valores inválidos',
          description: 'A soma de Serviço + Material deve ser igual ao valor total.',
          variant: 'destructive',
        });
        isSubmittingRef.current = false;
        return;
      }
    }

    // Validate exclusive supplier justification
    if (fornecimentoExclusivo && !justificativaExclusividade.trim()) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'Informe a justificativa para fornecimento exclusivo.',
        variant: 'destructive',
      });
      isSubmittingRef.current = false;
      return;
    }

    // Validate 3 CNPJs if required (skip if exclusive supplier)
    if (requires3CNPJs && !fornecimentoExclusivo) {
      if (excecaoFornecedores && !justificativaFornecedores.trim()) {
        toast({
          title: 'Justificativa obrigatória',
          description: 'Informe a justificativa para não apresentar 3 fornecedores.',
          variant: 'destructive',
        });
        isSubmittingRef.current = false;
        return;
      }
      if (!excecaoFornecedores && (!fornecedorConcorrente1 || !fornecedorConcorrente2)) {
        toast({
          title: 'Fornecedores obrigatórios',
          description: 'Informe os 3 fornecedores ou selecione a opção de exceção.',
          variant: 'destructive',
        });
        isSubmittingRef.current = false;
        return;
      }
    }

    // Validate required attachments
    const requiredAttachments = getRequiredAttachments();
    const missingAttachments = requiredAttachments
      .filter(att => att.required && !anexos[att.tipo])
      .map(att => att.label);
    
    if (missingAttachments.length > 0) {
      toast({
        title: 'Anexos obrigatórios',
        description: `Faltando: ${missingAttachments.join(', ')}`,
        variant: 'destructive',
      });
      isSubmittingRef.current = false;
      return;
    }

    // Check for duplicate solicitation (same fornecedor + empreendimento, open status)
    if (fornecedor?.id && empreendimento) {
      const { data: duplicates } = await supabase
        .from('solicitacoes')
        .select('protocolo, status')
        .eq('fornecedor_id', fornecedor.id)
        .eq('empreendimento', empreendimento as any)
        .eq('user_id', user.id)
        .not('status', 'in', '("concluida","cancelado","rejeitado")')
        .limit(1);

      if (duplicates && duplicates.length > 0) {
        const confirmar = window.confirm(
          `Você já tem uma solicitação aberta para este fornecedor neste empreendimento (Protocolo: ${duplicates[0].protocolo}). Deseja continuar mesmo assim?`
        );
        if (!confirmar) {
          isSubmittingRef.current = false;
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      // Validate session before proceeding
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('[SUBMIT] Sessão inválida:', { sessionError, hasSession: !!session });
        toast({
          title: 'Sessão expirada',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
        isSubmittingRef.current = false;
        setSubmitting(false);
        return;
      }
      // Protocolo is generated automatically by the database trigger set_protocolo
      const insertData = {
        user_id: user.id,
        empreendimento: empreendimento as "mega_curitiba" | "mega_itajai" | "mega_esteio" | "todos",
        descricao,
        valor: valorNumerico,
        valor_servico: faturamentoDireto && valorServicoNumerico > 0 ? valorServicoNumerico : null,
        valor_material: faturamentoDireto && valorMaterialNumerico > 0 ? valorMaterialNumerico : null,
        tipo: (isAC ? 'AC' : 'OC') as "AC" | "OC",
        natureza_orcamentaria: naturezaOrcamentaria as "materiais_informatica" | "seguranca_vigilancia" | "assistencia_informatica" | "limpeza_conservacao" | "material_consumo" | "telefone" | "energia_eletrica" | "agua" | "manutencao_imoveis" | "material_expediente" | "servicos_diversos" | "propaganda_publicidade" | "taxa_impostos" | "manutencao_maquinas_equipamentos" | "despesas_pessoal" | "despesas_administrador",
        origem_custo: origemCusto,
        cliente_id: origemCusto === 'cliente' ? clienteId : null,
        fornecedor_id: fornecedor.id,
        fornecedor_concorrente_1_id: !excecaoFornecedores ? fornecedorConcorrente1?.id || null : null,
        fornecedor_concorrente_2_id: !excecaoFornecedores ? fornecedorConcorrente2?.id || null : null,
        justificativa_fornecedores: requires3CNPJs && excecaoFornecedores ? justificativaFornecedores.trim() : null,
        excecao_fornecedores: requires3CNPJs && excecaoFornecedores,
        tipo_contratacao: (tipoContratacao || null) as "servicos" | "material_construcao" | "material_consumo" | "combustivel" | "taxas" | null,
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
        parcelas: parseInt(parcelas) || 1,
        contrato_mensal: contratoMensal,
        faturamento_direto: faturamentoDireto,
        retencao_6_porcento: retencao6,
        tipo_garantia: tipoGarantia,
        dias_garantia: tipoGarantia !== 'ambos' && diasGarantia ? parseInt(diasGarantia) : null,
        dias_garantia_servico: tipoGarantia === 'ambos' && diasGarantiaServico ? parseInt(diasGarantiaServico) : null,
        dias_garantia_produto: tipoGarantia === 'ambos' && diasGarantiaProduto ? parseInt(diasGarantiaProduto) : null,
        custo_cliente: custoCliente,
        emergencial,
        justificativa_sem_memorial: semMemorial && justificativaSemMemorial.trim() ? justificativaSemMemorial.trim() : null,
        fornecimento_exclusivo: fornecimentoExclusivo,
        justificativa_exclusividade: fornecimentoExclusivo && justificativaExclusividade.trim() ? justificativaExclusividade.trim() : null,
        // Novos campos do fluxo jurídico
        natureza_servico_obra_civil: naturezaObraCivil,
        natureza_servico_altura_risco: naturezaAlturaRisco,
        natureza_servico_fossa_filtro: naturezaFossaFiltro,
        natureza_servico_preco_variavel: naturezaPrecoVariavel,
        escopo_detalhado_minuta: requerEscopoDetalhado ? escopoDetalhadoMinuta.trim() : null,
        due_diligence_confirmada: requerDueDiligence ? dueDiligenceConfirmada : false,
        due_diligence_numero_projuris: temProcessoProjuris ? dueDiligenceNumeroProjuris.trim() || null : null,
        // Rateio
        tipo_rateio: empreendimento === 'todos' ? tipoRateio : null,
        rateio_valores: empreendimento === 'todos' && rateioValores.length > 0 ? rateioValores : null,
        // Persistir resultados de IA para evitar chamadas repetidas
        ia_cnae_status: cnaeValidationResult?.status || null,
        ia_cnae_justificativa: cnaeValidationResult?.justificativa_curta || null,
        ia_cnae_avaliado_em: cnaeValidationResult ? new Date().toISOString() : null,
        ia_descricao_vaga: descriptionValidation?.isVague ?? null,
        ia_descricao_sugestao: descriptionValidation?.suggestion || null,
        ia_descricao_avaliado_em: descriptionValidation ? new Date().toISOString() : null,
      } as any;
      
      // Tentar inserir com retry automático para conflitos de protocolo (23505)
      let data: { id: string; protocolo: string } | null = null;
      let lastError: any = null;
      const maxRetries = 2;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const { data: insertResult, error } = await supabase
          .from('solicitacoes')
          .insert(insertData as any) // protocolo is generated by database trigger
          .select('id, protocolo')
          .single();
        
        if (!error) {
          data = insertResult;
          break;
        }
        
        // Se for erro de constraint de protocolo (23505), tentar novamente
        if (error.code === '23505' && error.message?.includes('protocolo')) {
          console.warn(`[SUBMIT][RETRY] Conflito de protocolo na tentativa ${attempt}/${maxRetries}:`, error.message);
          lastError = error;
          
          if (attempt < maxRetries) {
            // Pequeno delay antes de retry
            await new Promise(resolve => setTimeout(resolve, 200));
            continue;
          }
        }
        
        // Para outros erros, lançar imediatamente
        throw error;
      }
      
      // Se após retries ainda não conseguiu, lançar erro
      if (!data) {
        console.error('[SUBMIT] Falha após retries:', lastError);
        throw lastError || new Error('Não foi possível criar a solicitação. Tente novamente.');
      }

      // Upload attachments
      await uploadAnexos(data.id);

      // Create history entry
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: data.id,
        user_id: user.id,
        acao: 'criacao',
        status_novo: 'recebido',
      });

      // Get current user profile for solicitante info
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Send email notification to backoffice users with email notifications enabled
      try {
        console.log('[EMAIL] Iniciando envio de e-mail para backoffice...');
        const emailResult = await notifyBackofficeNewSolicitacao({
          protocolo: data.protocolo,
          descricao: descricao.substring(0, 200),
          valor: valorNumerico,
          empreendimento: EMPREENDIMENTO_LABELS[empreendimento as Empreendimento],
          solicitacao_id: data.id,
          solicitante_nome: userProfile?.full_name || userProfile?.email || 'Solicitante',
          solicitante_email: userProfile?.email || undefined,
        });
        console.log('[EMAIL] Resultado do envio:', emailResult);
        
        if (!emailResult.success) {
          console.error('[EMAIL] Falha ao enviar e-mail:', emailResult.error);
        }
      } catch (emailError) {
        console.error('[EMAIL] Erro ao enviar notificação:', emailError);
      }

      // Clear draft after successful submission
      clearDraft();

      toast({
        title: 'Solicitação criada!',
        description: `Protocolo: ${data.protocolo}`,
      });
      navigate('/minhas-solicitacoes');
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro desconhecido';
      const errorCode = error?.code || 'N/A';
      console.error('[SUBMIT] Erro ao criar solicitação:', {
        message: errorMessage,
        code: errorCode,
        details: error?.details,
        hint: error?.hint,
        userId: user?.id,
        fornecedorId: fornecedor?.id,
        empreendimento,
        valor: valorNumerico,
      });
      
      // Mensagem amigável para conflito de protocolo
      const userMessage = errorCode === '23505' && errorMessage?.includes('protocolo')
        ? 'Conflito ao gerar número de protocolo. Por favor, tente novamente em alguns segundos.'
        : errorMessage;
      
      toast({
        title: 'Erro ao criar solicitação',
        description: userMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const steps: { id: Step; label: string; show: boolean; description: string }[] = [
    { id: 'empreendimento', label: 'Local', show: true, description: 'Escolha o empreendimento onde o serviço será realizado' },
    { id: 'descricao', label: 'Descrição', show: true, description: 'Descreva o serviço e informe o valor estimado' },
    { id: 'tipo', label: 'Tipo', show: valorNumerico > 1000, description: 'Defina o tipo de contratação' },
    { id: 'natureza_servico', label: 'Natureza', show: showNaturezaServicoStep, description: 'Indique características especiais do serviço' },
    { id: 'detalhes', label: 'Detalhes', show: true, description: 'Complete os detalhes financeiros e operacionais' },
    { id: 'fornecedor', label: 'Fornecedor', show: true, description: 'Selecione o fornecedor principal' },
    { id: 'anexos', label: 'Anexos', show: true, description: 'Envie os documentos necessários' },
    { id: 'revisao', label: 'Enviar', show: true, description: 'Revise tudo e envie sua solicitação' },
  ];

  const visibleSteps = steps.filter((s) => s.show);
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'empreendimento': return !!empreendimento;
      case 'descricao': return !!descricao && valorNumerico > 0;
      case 'tipo': return valorNumerico <= 1000 || !!tipoContratacao;
      case 'natureza_servico': return true; // Sempre pode avançar (checkboxes opcionais)
      case 'detalhes': {
        if (!naturezaOrcamentaria) return false;
        if (origemCusto === 'cliente' && !clienteId) return false;
        // FD validation: sum must equal total
        if (faturamentoDireto) {
          const sum = valorServicoNumerico + valorMaterialNumerico;
          if (Math.abs(sum - valorNumerico) > 0.01) return false;
        }
        // Validação do escopo detalhado (mín 100 caracteres) quando requer
        if (requerEscopoDetalhado && escopoDetalhadoMinuta.length < 100) return false;
        // Validação de Due Diligence quando requer
        if (requerDueDiligence && !dueDiligenceConfirmada) return false;
        return true;
      }
      case 'fornecedor': {
        if (!fornecedor) return false;
        // Fornecimento exclusivo requires justification
        if (fornecimentoExclusivo && !justificativaExclusividade.trim()) return false;
        // If using exception, require justification
        if (requires3CNPJs && !fornecimentoExclusivo && excecaoFornecedores && !justificativaFornecedores.trim()) return false;
        // If NOT using exception and NOT exclusive, require 3 suppliers
        if (requires3CNPJs && !fornecimentoExclusivo && !excecaoFornecedores && (!fornecedorConcorrente1 || !fornecedorConcorrente2)) return false;
        return true;
      }
      case 'anexos': {
        const requiredAttachments = getRequiredAttachments();
        const attachmentsOk = requiredAttachments.every(att => !att.required || !!anexos[att.tipo]);
        // Se marcou sem memorial, precisa justificar
        if (semMemorial && !justificativaSemMemorial.trim()) return false;
        return attachmentsOk;
      }
      default: return true;
    }
  };

  const goNext = () => {
    if (currentIndex < visibleSteps.length - 1) {
      const nextStep = visibleSteps[currentIndex + 1];
      track('step_viewed', { step: nextStep.id, index: currentIndex + 1 }, '/nova-solicitacao');
      setCurrentStep(nextStep.id);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(visibleSteps[currentIndex - 1].id);
    }
  };

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Nova Solicitação</h1>
          <p className="text-muted-foreground">Preencha os dados para criar uma solicitação</p>
        </div>

        {/* Step Indicator - Novo componente melhorado */}
        <StepIndicator
          steps={visibleSteps.map(s => ({ 
            id: s.id, 
            label: s.label 
          })) as StepIndicatorStep[]}
          currentStepIndex={currentIndex}
          onStepClick={(index) => {
            // Permite navegar apenas para passos anteriores já concluídos
            if (index < currentIndex) {
              setCurrentStep(visibleSteps[index].id);
            }
          }}
          showTimeEstimate
          draftSaved={hasDraft}
        />

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>{visibleSteps[currentIndex]?.label}</CardTitle>
              {currentStep === 'fornecedor' && requires3CNPJs && (
                <CardDescription className="text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  AC de serviços requer 3 fornecedores
                </CardDescription>
              )}
            </div>
            {hasDraft && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearDraft();
                  toast({
                    title: 'Rascunho limpo',
                    description: 'O formulário foi reiniciado.',
                  });
                  // Reset form to initial state
                  setCurrentStep('empreendimento');
                  setEmpreendimento('');
                  setDescricao('');
                  setValor('');
                  setTipoContratacao('');
                  setNaturezaOrcamentaria('');
                  setOrigemCusto('empreendimento');
                  setDataInicio('');
                  setDataFim('');
                  setParcelas('1');
                  setContratoMensal(false);
                  setFaturamentoDireto(false);
                  setValorServico('');
                  setValorMaterial('');
                  setRetencao6(false);
                  setTipoGarantia('nenhuma');
                  setDiasGarantia('');
                  setDiasGarantiaServico('');
                  setDiasGarantiaProduto('');
                  setCustoCliente(false);
                  setEmergencial(false);
                  setClienteId(null);
                  setFornecedor(null);
                  setFornecedorConcorrente1(null);
                  setFornecedorConcorrente2(null);
                  setExcecaoFornecedores(false);
                  setJustificativaFornecedores('');
                  setTemChamadoInfraspeak(false);
                  setChamadoCorretiva(false);
                  setSemMemorial(false);
                  setJustificativaSemMemorial('');
                  setAnexos({});
                  setOutrosAnexos([]);
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Limpar rascunho
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 'empreendimento' && (
              <div className="space-y-3">
                {loadingEmpreendimentos ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando empreendimentos...
                  </div>
                ) : allowedEmpreendimentos.length === 0 ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum empreendimento está vinculado a este usuário. Peça ao admin para configurar o empreendimento.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <RadioGroup
                    value={empreendimento}
                    onValueChange={(v) => setEmpreendimento(v as Empreendimento)}
                  >
                    {allowedEmpreendimentos.map((value) => (
                      <div
                        key={value}
                        className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      >
                        <RadioGroupItem value={value} id={value} />
                        <Label htmlFor={value} className="flex-1 cursor-pointer">
                          {EMPREENDIMENTO_LABELS[value]}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            )}

            {/* Rateio Preview - shown on descricao step when empreendimento = todos and valor > 0 */}
            {currentStep === 'descricao' && empreendimento === 'todos' && valorNumerico > 0 && (
              <RateioPreview
                valorTotal={valorNumerico}
                tipoRateio={tipoRateio}
                onTipoRateioChange={setTipoRateio}
                onRateioValoresChange={setRateioValores}
              />
            )}

            {currentStep === 'descricao' && (
              <div className="space-y-6">
                {/* Campo Descrição - Redesign */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="descricao" className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      O que você precisa?
                    </Label>
                    {isValidatingDescription && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        Analisando...
                      </span>
                    )}
                  </div>
                  
                  {/* Exemplos em Collapsible - Fora do campo */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary hover:bg-transparent gap-1">
                        <Sparkles className="h-3 w-3" />
                        Ver exemplos de boa descrição
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                        <AlertDescription className="text-sm space-y-2">
                          <p className="text-blue-800 dark:text-blue-200">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Bom:</span> "Aquisição de 4 luminárias para troca das atuais que estão queimadas. Será 2 para a portaria, 1 para o quiosque e 1 sala administrativa."
                          </p>
                          <p className="text-blue-800 dark:text-blue-200">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Bom:</span> "Contratação de serviço de reparo do ar-condicionado da sala administrativa, pois o equipamento apresentou falha e não está refrigerando."
                          </p>
                        </AlertDescription>
                      </Alert>
                    </CollapsibleContent>
                  </Collapsible>
                  
                  {/* Textarea com borda destacada */}
                  <Textarea
                    id="descricao"
                    placeholder="Descreva detalhadamente o serviço ou material necessário, incluindo quantidade, localização e motivo..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={5}
                    className={cn(
                      "min-h-[120px] border-2 transition-colors",
                      descricao.length > 0 && descriptionValidation?.isVague 
                        ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20" 
                        : descricao.length >= 50 
                          ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                          : "border-muted focus:border-primary focus:ring-primary/20"
                    )}
                  />
                  
                  {/* Contador de caracteres */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{descricao.length} caracteres</span>
                    {descricao.length < 50 && descricao.length > 0 && (
                      <span className="text-amber-600">Mínimo recomendado: 50 caracteres</span>
                    )}
                    {descricao.length >= 50 && !descriptionValidation?.isVague && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Descrição adequada
                      </span>
                    )}
                  </div>
                  
                  {/* AI Validation Alert */}
                  {descriptionValidation?.isVague && !isValidatingDescription && (
                    <Alert className="bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800 dark:text-amber-200">
                        <span className="font-medium">Descrição pode estar incompleta</span>
                        <p className="text-sm mt-1 text-amber-700 dark:text-amber-300">
                          {descriptionValidation.suggestion}
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Campo Valor */}
                <div className="space-y-2">
                  <Label htmlFor="valor" className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Qual o valor?
                  </Label>
                  <Input
                    id="valor"
                    placeholder="R$ 0,00"
                    value={valor ? formatCurrency(valor) : ''}
                    onChange={(e) => setValor(e.target.value.replace(/\D/g, ''))}
                    className="text-lg font-medium"
                  />
                  {valorNumerico > 0 && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {valorNumerico <= 1000 ? 'Fluxo: OC (até R$ 1.000)' : 'Fluxo: Definir tipo de contratação'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 'tipo' && valorNumerico > 1000 && (
              <div className="space-y-4">
                <RadioGroup value={tipoContratacao} onValueChange={(v) => setTipoContratacao(v as TipoContratacao)}>
                  {Object.entries(TIPO_CONTRATACAO_LABELS).map(([value, label]) => (
                    <div key={value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                      <RadioGroupItem value={value} id={value} />
                      <Label htmlFor={value} className="flex-1 cursor-pointer">
                        {label}
                        {value === 'servicos' && <span className="text-sm text-muted-foreground ml-2">(AC)</span>}
                        {value !== 'servicos' && <span className="text-sm text-muted-foreground ml-2">(OC)</span>}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Emergency checkbox - only for services */}
                {tipoContratacao === 'servicos' && (
                  <Alert className="bg-warning/10 border-warning">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Marque se for uma contratação emergencial</span>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="emergencial"
                          checked={emergencial}
                          onCheckedChange={(checked) => setEmergencial(!!checked)}
                        />
                        <Label htmlFor="emergencial" className="font-medium cursor-pointer">
                          Emergencial
                        </Label>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {emergencial && (
                  <Alert>
                    <Check className="h-4 w-4 text-success" />
                    <AlertDescription>
                      <strong>Emergencial:</strong> Dispensa mapa de cotação e orçamentos concorrentes.
                      Apenas chamado e orçamento escolhido serão exigidos.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {currentStep === 'natureza_servico' && (
              <NaturezaServicoStep
                valorNumerico={valorNumerico}
                obraCivil={naturezaObraCivil}
                alturaRisco={naturezaAlturaRisco}
                fossaFiltro={naturezaFossaFiltro}
                precoVariavel={naturezaPrecoVariavel}
                nenhumaOpcao={nenhumaOpcaoNatureza}
                onObraCivilChange={setNaturezaObraCivil}
                onAlturaRiscoChange={setNaturezaAlturaRisco}
                onFossaFiltroChange={setNaturezaFossaFiltro}
                onPrecoVariavelChange={setNaturezaPrecoVariavel}
                onNenhumaOpcaoChange={setNenhumaOpcaoNatureza}
              />
            )}

            {currentStep === 'detalhes' && (
              <div className="space-y-4">
                {/* Natureza Orçamentária - Show for AC OR for OC <= 1000 */}
                {(isAC || (isOC && valorNumerico <= 1000)) && (
                  <div>
                    <Label>Natureza Orçamentária</Label>
                    <Select value={naturezaOrcamentaria} onValueChange={(v) => setNaturezaOrcamentaria(v as NaturezaOrcamentaria)}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(NATUREZA_ORCAMENTARIA_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* For OC > 1000, show the auto-assigned natureza */}
                {isOCAbove1000 && naturezaOrcamentaria && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-muted-foreground text-sm">Natureza Orçamentária (automática)</Label>
                    <p className="font-medium">{NATUREZA_ORCAMENTARIA_LABELS[naturezaOrcamentaria]}</p>
                  </div>
                )}
                <div>
                  <Label>Origem do Custo</Label>
                  <Select 
                    value={origemCusto} 
                    onValueChange={(v) => {
                      setOrigemCusto(v as OrigemCusto);
                      if (v !== 'cliente') {
                        setClienteId(null);
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORIGEM_CUSTO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {origemCusto === 'cliente' && (
                  <ClienteSelect
                    empreendimento={empreendimento}
                    value={clienteId}
                    onChange={setClienteId}
                    required
                  />
                )}
                {isAC && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data Início</Label>
                        <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                      </div>
                      <div>
                        <Label>Data Fim</Label>
                        <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="contratoMensal"
                        checked={contratoMensal}
                        onCheckedChange={(checked) => handleContratoMensalChange(!!checked)}
                      />
                      <Label htmlFor="contratoMensal" className="cursor-pointer">Contrato Mensal</Label>
                    </div>
                    <div>
                      <Label>Parcelas (máx. 12)</Label>
                      <Select value={parcelas} onValueChange={setParcelas}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[...Array(12)].map((_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="retencao6"
                          checked={retencao6}
                          onCheckedChange={(checked) => setRetencao6(!!checked)}
                        />
                        <Label htmlFor="retencao6" className="cursor-pointer">Retenção de 6%</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="faturamentoDireto"
                          checked={faturamentoDireto}
                          onCheckedChange={(checked) => {
                            setFaturamentoDireto(!!checked);
                            if (!checked) {
                              setValorServico('');
                              setValorMaterial('');
                            }
                          }}
                        />
                        <Label htmlFor="faturamentoDireto" className="cursor-pointer">Faturamento Direto</Label>
                      </div>
                    </div>
                    {faturamentoDireto && (
                      <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Informe os valores separados de serviço e material.
                          <strong className="block mt-1">A soma deve ser igual ao valor total informado ({formatCurrency(valor)}).</strong>
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Valor do Serviço (R$)</Label>
                            <Input
                              placeholder="R$ 0,00"
                              value={valorServico ? formatCurrency(valorServico) : ''}
                              onChange={(e) => setValorServico(e.target.value.replace(/\D/g, ''))}
                            />
                          </div>
                          <div>
                            <Label>Valor do Material (R$)</Label>
                            <Input
                              placeholder="R$ 0,00"
                              value={valorMaterial ? formatCurrency(valorMaterial) : ''}
                              onChange={(e) => setValorMaterial(e.target.value.replace(/\D/g, ''))}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm font-medium">Total (FD):</span>
                          <span className={cn(
                            "font-bold",
                            Math.abs((valorServicoNumerico + valorMaterialNumerico) - valorNumerico) > 0.01 
                              ? "text-destructive" 
                              : "text-success"
                          )}>
                            {(valorServicoNumerico + valorMaterialNumerico).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        {Math.abs((valorServicoNumerico + valorMaterialNumerico) - valorNumerico) > 0.01 && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              A soma de Serviço + Material deve ser exatamente igual ao valor total ({formatCurrency(valor)}).
                              Diferença: {formatCurrency(String(Math.round(Math.abs((valorServicoNumerico + valorMaterialNumerico) - valorNumerico) * 100)))}.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                    {/* Flag: Chamado é uma corretiva? */}
                    <div className="flex items-center space-x-2 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                      <Checkbox
                        id="chamadoCorretiva"
                        checked={chamadoCorretiva}
                        onCheckedChange={(checked) => setChamadoCorretiva(!!checked)}
                      />
                      <Label htmlFor="chamadoCorretiva" className="cursor-pointer text-amber-800 dark:text-amber-200">
                        Chamado é uma corretiva?
                      </Label>
                    </div>
                    
                    {/* Tipo de Garantia - Estilizado com tema âmbar - Apenas para AC */}
                    <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 space-y-3">
                      <Label className="text-amber-800 dark:text-amber-200">Tipo de Garantia</Label>
                      <Select value={tipoGarantia} onValueChange={(v) => setTipoGarantia(v as TipoGarantia)}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIPO_GARANTIA_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {tipoGarantia !== 'nenhuma' && tipoGarantia !== 'ambos' && (
                        <div>
                          <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia</Label>
                          <Input
                            type="number"
                            value={diasGarantia}
                            onChange={(e) => setDiasGarantia(e.target.value)}
                            placeholder="Ex: 90"
                            className="bg-background"
                          />
                        </div>
                      )}
                      {tipoGarantia === 'ambos' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia (Serviço)</Label>
                            <Input
                              type="number"
                              value={diasGarantiaServico}
                              onChange={(e) => setDiasGarantiaServico(e.target.value)}
                              placeholder="Ex: 90"
                              className="bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia (Produto)</Label>
                            <Input
                              type="number"
                              value={diasGarantiaProduto}
                              onChange={(e) => setDiasGarantiaProduto(e.target.value)}
                              placeholder="Ex: 365"
                              className="bg-background"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Tipo de Garantia para OC - Visível quando é OC (não AC) */}
                {isOC && (
                  <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 space-y-3">
                    <Label className="text-amber-800 dark:text-amber-200">Tipo de Garantia</Label>
                    <Select value={tipoGarantia} onValueChange={(v) => setTipoGarantia(v as TipoGarantia)}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPO_GARANTIA_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {tipoGarantia !== 'nenhuma' && tipoGarantia !== 'ambos' && (
                      <div>
                        <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia</Label>
                        <Input
                          type="number"
                          value={diasGarantia}
                          onChange={(e) => setDiasGarantia(e.target.value)}
                          placeholder="Ex: 90"
                          className="bg-background"
                        />
                      </div>
                    )}
                    {tipoGarantia === 'ambos' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia (Serviço)</Label>
                          <Input
                            type="number"
                            value={diasGarantiaServico}
                            onChange={(e) => setDiasGarantiaServico(e.target.value)}
                            placeholder="Ex: 90"
                            className="bg-background"
                          />
                        </div>
                        <div>
                          <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia (Produto)</Label>
                          <Input
                            type="number"
                            value={diasGarantiaProduto}
                            onChange={(e) => setDiasGarantiaProduto(e.target.value)}
                            placeholder="Ex: 365"
                            className="bg-background"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Escopo Detalhado para Minuta - Fluxo Jurídico */}
                <EscopoDetalhadoField
                  instrumentoJuridico={instrumentoJuridico}
                  escopo={escopoDetalhadoMinuta}
                  onEscopoChange={setEscopoDetalhadoMinuta}
                />

                {/* Due Diligence Module - Fluxo Jurídico */}
                <DueDiligenceModule
                  valorNumerico={valorNumerico}
                  confirmada={dueDiligenceConfirmada}
                  numeroProjuris={dueDiligenceNumeroProjuris}
                  temProcessoProjuris={temProcessoProjuris}
                  onConfirmadaChange={setDueDiligenceConfirmada}
                  onNumeroProjurisChange={setDueDiligenceNumeroProjuris}
                  onTemProcessoChange={setTemProcessoProjuris}
                />

                {/* Retenção Técnica Alert - Fluxo Jurídico */}
                <RetencaoTecnicaAlert
                  instrumentoJuridico={instrumentoJuridico}
                  valorNumerico={valorNumerico}
                  dataInicio={dataInicio}
                  dataFim={dataFim}
                />
              </div>
            )}

            {currentStep === 'fornecedor' && (
              <div className="space-y-6">
                <SupplierSearch
                  label="Fornecedor Principal"
                  required
                  value={fornecedor}
                  onChange={setFornecedor}
                />

                {/* Validações do Fornecedor */}
                {fornecedor && (
                  <div className="space-y-3 mt-4">
                    {/* MEI Alert */}
                    {fornecedor.is_mei && (
                      <MEIAlertBadge 
                        showInlineAlert 
                        valorTotal={valorNumerico}
                      />
                    )}

                    {/* CNAE Compatibility Badge */}
                    {fornecedor.cnae_principal_codigo && (
                      <CNAECompatibilityBadge
                        descricao={descricao}
                        fornecedor={fornecedor}
                        enabled={descricao.length >= 20}
                      />
                    )}
                  </div>
                )}

                {/* Fornecimento Exclusivo */}
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fornecimentoExclusivo"
                      checked={fornecimentoExclusivo}
                      onCheckedChange={(checked) => {
                        setFornecimentoExclusivo(!!checked);
                        if (!checked) {
                          setJustificativaExclusividade('');
                        }
                      }}
                    />
                    <Label htmlFor="fornecimentoExclusivo" className="cursor-pointer font-medium text-purple-800 dark:text-purple-200">
                      Fornecimento Exclusivo
                    </Label>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Marque esta opção se este fornecedor é o único disponível no mercado para este serviço/material.
                  </p>
                  {fornecimentoExclusivo && (
                    <div className="pt-2">
                      <Label htmlFor="justificativaExclusividade" className="text-purple-800 dark:text-purple-200">
                        Justificativa da exclusividade *
                      </Label>
                      <Textarea
                        id="justificativaExclusividade"
                        placeholder="Explique por que não existem outros fornecedores disponíveis no mercado para este serviço/material..."
                        value={justificativaExclusividade}
                        onChange={(e) => setJustificativaExclusividade(e.target.value)}
                        rows={3}
                        className="mt-2 bg-background"
                      />
                    </div>
                  )}
                </div>

                {requires3CNPJs && !fornecimentoExclusivo && (
                  <div className="p-4 rounded-lg bg-muted/30 border space-y-4">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Concorrência com 3 fornecedores?</Label>
                      <p className="text-sm text-muted-foreground">
                        AC de serviços não emergencial normalmente requer 3 fornecedores com cotações.
                      </p>
                      <RadioGroup 
                        value={excecaoFornecedores ? 'nao' : 'sim'} 
                        onValueChange={(v) => {
                          setExcecaoFornecedores(v === 'nao');
                          if (v === 'sim') {
                            setJustificativaFornecedores('');
                          }
                        }}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="3forn-sim" />
                          <Label htmlFor="3forn-sim" className="cursor-pointer">Sim, tenho 3 fornecedores</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="3forn-nao" />
                          <Label htmlFor="3forn-nao" className="cursor-pointer">Não (exceção)</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {!excecaoFornecedores && (
                      <>
                        <SupplierSearch
                          label="Fornecedor Concorrente 1"
                          required
                          value={fornecedorConcorrente1}
                          onChange={setFornecedorConcorrente1}
                        />
                        <SupplierSearch
                          label="Fornecedor Concorrente 2"
                          required
                          value={fornecedorConcorrente2}
                          onChange={setFornecedorConcorrente2}
                        />
                      </>
                    )}
                    
                    {excecaoFornecedores && (
                      <div className="pt-4 border-t">
                        <Label htmlFor="justificativa" className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          Justificativa para exceção (obrigatória)
                        </Label>
                        <Textarea
                          id="justificativa"
                          placeholder="Explique por que não foi possível obter 3 orçamentos de fornecedores diferentes..."
                          value={justificativaFornecedores}
                          onChange={(e) => setJustificativaFornecedores(e.target.value)}
                          rows={3}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentStep === 'anexos' && (
              <div className="space-y-4">
                {/* OC - Água/Energia info */}
                {isOC && (naturezaOrcamentaria === 'agua' || naturezaOrcamentaria === 'energia_eletrica') && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Água/Energia:</strong> Anexe a fatura (obrigatório) e a planilha de rateio (opcional).
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* OC - Demais naturezas */}
                {isOC && !(naturezaOrcamentaria === 'agua' || naturezaOrcamentaria === 'energia_eletrica') && (
                  <>
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Proposta do Fornecedor:</strong> Anexe a proposta do fornecedor em PDF (obrigatório).
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <Checkbox
                        id="temChamado"
                        checked={temChamadoInfraspeak}
                        onCheckedChange={(checked) => setTemChamadoInfraspeak(!!checked)}
                      />
                      <Label htmlFor="temChamado" className="cursor-pointer">
                        Existe chamado Infraspeak?
                      </Label>
                    </div>
                  </>
                )}
                
                {isAC && !emergencial && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Anexe os documentos em formato PDF (máx. 100MB cada)
                    </p>
                    
                    {/* Flag: Sem Memorial */}
                    <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="semMemorial"
                          checked={semMemorial}
                          onCheckedChange={(checked) => {
                            setSemMemorial(!!checked);
                            if (!checked) setJustificativaSemMemorial('');
                          }}
                        />
                        <Label htmlFor="semMemorial" className="cursor-pointer text-sm">
                          Não tenho memorial descritivo/escopo para esta solicitação
                        </Label>
                      </div>
                      {semMemorial && (
                        <Textarea
                          placeholder="Justifique por que não possui memorial descritivo/escopo..."
                          value={justificativaSemMemorial}
                          onChange={(e) => setJustificativaSemMemorial(e.target.value)}
                          rows={2}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>
                )}
                
                {isAC && emergencial && (
                  <p className="text-sm text-muted-foreground">
                    Anexe os documentos obrigatórios em formato PDF (máx. 100MB cada)
                  </p>
                )}
                
                {/* AC - Água/Energia fatura obrigatória + rateio opcional */}
                {isAC && (naturezaOrcamentaria === 'agua' || naturezaOrcamentaria === 'energia_eletrica') && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Água/Energia:</strong> Anexe a fatura (obrigatório) e a planilha de rateio (opcional).
                    </AlertDescription>
                  </Alert>
                )}
                
                {origemCusto === 'cliente' && (
                  <Alert className="bg-warning/10 border-warning">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription>
                      <strong>Origem Cliente:</strong> É obrigatório anexar o comunicado ao cliente.
                    </AlertDescription>
                  </Alert>
                )}
                
                <MultiFileUpload
                  requirements={getRequiredAttachments()}
                  files={anexos}
                  onFilesChange={setAnexos}
                />
                
                {/* Outros Anexos (opcional) */}
                <OtherFilesUpload
                  files={outrosAnexos}
                  onFilesChange={setOutrosAnexos}
                  maxFiles={5}
                />
              </div>
            )}

            {currentStep === 'revisao' && (
              <div className="space-y-4">
                {/* Descrição com expand/collapse */}
                <Collapsible defaultOpen className="rounded-lg border p-3 bg-muted/30">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <span className="font-medium text-sm">Descrição do Serviço/Material</span>
                    <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <p className="text-sm whitespace-pre-wrap">{descricao}</p>
                  </CollapsibleContent>
                </Collapsible>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-medium">
                      {isAC ? 'AC - Autorização de Contratação' : 'OC - Ordem de Compra'}
                      {emergencial && <span className="ml-2 text-warning">(Emergencial)</span>}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Empreendimento</span>
                    <span>{empreendimento && EMPREENDIMENTO_LABELS[empreendimento]}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Valor Total</span>
                    <span className="font-medium">
                      {faturamentoDireto 
                        ? (valorServicoNumerico + valorMaterialNumerico).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : formatCurrency(valor)
                      }
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Natureza Orçamentária</span>
                    <span>{naturezaOrcamentaria && NATUREZA_ORCAMENTARIA_LABELS[naturezaOrcamentaria]}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Origem do Custo</span>
                    <span>{ORIGEM_CUSTO_LABELS[origemCusto]}</span>
                  </div>
                  {origemCusto === 'cliente' && clienteNome && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Cliente</span>
                      <span className="font-medium">{clienteNome}</span>
                    </div>
                  )}
                  {tipoContratacao && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Tipo de Contratação</span>
                      <span>{TIPO_CONTRATACAO_LABELS[tipoContratacao]}</span>
                    </div>
                  )}
                  
                  {/* Detalhes do AC */}
                  {isAC && (
                    <>
                      {dataInicio && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Data de Início</span>
                          <span>{new Date(dataInicio).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                        </div>
                      )}
                      {dataFim && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Data de Término</span>
                          <span>{new Date(dataFim).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Parcelas</span>
                        <span>{parcelas}x</span>
                      </div>
                      {contratoMensal && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Contrato Mensal</span>
                          <span className="text-success">Sim</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Flag Faturamento Direto */}
                  {faturamentoDireto && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Faturamento Direto</span>
                      <span className="text-success font-medium">Sim</span>
                    </div>
                  )}
                  {retencao6 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Retenção 6%</span>
                      <span className="text-success">Sim</span>
                    </div>
                  )}
                  {custoCliente && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Custo do Cliente</span>
                      <span className="text-success">Sim</span>
                    </div>
                  )}

                  {/* Garantia */}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Garantia</span>
                    <span>
                      {TIPO_GARANTIA_LABELS[tipoGarantia]}
                      {tipoGarantia !== 'nenhuma' && tipoGarantia !== 'ambos' && diasGarantia && (
                        <span className="ml-1">({diasGarantia} dias)</span>
                      )}
                      {tipoGarantia === 'ambos' && (
                        <span className="ml-1">
                          (Serviço: {diasGarantiaServico || '—'} dias, Produto: {diasGarantiaProduto || '—'} dias)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Fornecedores */}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Fornecedor</span>
                    <span>{fornecedor?.razao_social || fornecedor?.cnpj}</span>
                  </div>

                  {/* Badge de compatibilidade CNAE na revisão */}
                  {fornecedor && fornecedor.cnae_principal_codigo && descricao.length >= 20 && (
                    <div className="py-3 border-t">
                      <span className="text-muted-foreground text-sm block mb-2">Validação CNAE</span>
                      <CNAECompatibilityBadge
                        descricao={descricao}
                        fornecedor={fornecedor}
                        enabled={true}
                      />
                    </div>
                  )}

                  {/* Alerta MEI na revisão */}
                  {fornecedor?.is_mei && (
                    <div className="py-3 border-t">
                      <MEIAlertBadge 
                        showInlineAlert 
                        valorTotal={valorNumerico}
                      />
                    </div>
                  )}
                  {requires3CNPJs && (
                    <>
                      {fornecedorConcorrente1 && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Concorrente 1</span>
                          <span>{fornecedorConcorrente1?.razao_social || fornecedorConcorrente1?.cnpj}</span>
                        </div>
                      )}
                      {fornecedorConcorrente2 && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Concorrente 2</span>
                          <span>{fornecedorConcorrente2?.razao_social || fornecedorConcorrente2?.cnpj}</span>
                        </div>
                      )}
                      {justificativaFornecedores.trim() && (
                        <div className="py-2 border-b">
                          <span className="text-muted-foreground text-sm flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-warning" />
                            Justificativa (exceção 3 fornecedores)
                          </span>
                          <p className="text-sm mt-1">{justificativaFornecedores}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Lista de anexos */}
                  <div className="pt-2">
                    <span className="text-muted-foreground text-sm">Anexos ({Object.values(anexos).filter(Boolean).length})</span>
                    <div className="mt-2 space-y-1">
                      {Object.entries(anexos)
                        .filter(([_, file]) => file !== null)
                        .map(([tipo, file]) => (
                          <div key={tipo} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{file?.file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {((file?.file.size || 0) / 1024).toFixed(0)} KB
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spacer for sticky footer on mobile */}
        <div className="h-20 sm:hidden" />

        <div className="flex justify-between sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t sm:border-t-0 p-4 sm:p-0 sm:static sm:bg-transparent sm:backdrop-blur-none -mx-4 sm:mx-0 z-10">
          <Button variant="ghost" onClick={goBack} disabled={currentIndex === 0} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          {currentStep === 'revisao' ? (
            <Button onClick={handleSubmit} disabled={submitting} className="shadow-lg sm:shadow-none">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Enviar Solicitação
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canProceed()} className="shadow-lg sm:shadow-none">
              Próximo <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}