import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useDescriptionValidation } from '@/hooks/useDescriptionValidation';
import { useCNAEValidation } from '@/hooks/useCNAEValidation';
import { supabase } from '@/integrations/supabase/client';
import {
  EMPREENDIMENTO_LABELS,
  type Empreendimento,
  type NaturezaOrcamentaria,
  type TipoContratacao,
  type OrigemCusto,
  type TipoGarantia,
  type Fornecedor,
  type InstrumentoJuridico,
  ANEXO_LABELS,
} from '@/types';
import type { UploadedFile } from '@/components/FileUpload';
import type { RateioValor } from '@/components/RateioPreview';
import type { Step, DerivedValues, FormSetters } from '@/components/nova-solicitacao/types';
import { NATUREZAS_ISENTAS_ANEXOS, NATUREZAS_AGUA_ENERGIA, TIPO_TO_NATUREZA } from '@/components/nova-solicitacao/types';

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

function parseFornecedorRow(data: any): Fornecedor {
  return {
    ...data,
    cnaes_secundarios: Array.isArray(data.cnaes_secundarios)
      ? data.cnaes_secundarios.map((item: any) => ({ codigo: item.codigo ?? 0, descricao: item.descricao ?? '' }))
      : null,
  } as Fornecedor;
}

export function useNovaSolicitacaoForm(effectiveUserId: string | undefined) {
  const { toast } = useToast();
  const location = useLocation();
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useFormPersistence();

  const duplicateFrom = (location.state as { duplicateFrom?: DuplicateData })?.duplicateFrom;
  const draftLoadedRef = useRef(false);

  // Allowed empreendimentos
  const [allowedEmpreendimentos, setAllowedEmpreendimentos] = useState<Empreendimento[]>([]);
  const [loadingEmpreendimentos, setLoadingEmpreendimentos] = useState(true);

  // Step & submitting
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
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [fornecedorConcorrente1, setFornecedorConcorrente1] = useState<Fornecedor | null>(null);
  const [fornecedorConcorrente2, setFornecedorConcorrente2] = useState<Fornecedor | null>(null);

  // Cliente
  const [clienteId, setClienteId] = useState<string | null>(duplicateFrom?.cliente_id || null);
  const [clienteNome, setClienteNome] = useState('');

  // Exceção fornecedores
  const [excecaoFornecedores, setExcecaoFornecedores] = useState(false);
  const [justificativaFornecedores, setJustificativaFornecedores] = useState('');
  const [fornecimentoExclusivo, setFornecimentoExclusivo] = useState(false);
  const [justificativaExclusividade, setJustificativaExclusividade] = useState('');

  // Chamados/memorial
  const [temChamadoInfraspeak, setTemChamadoInfraspeak] = useState(false);
  const [chamadoCorretiva, setChamadoCorretiva] = useState(false);
  const [semMemorial, setSemMemorial] = useState(false);
  const [justificativaSemMemorial, setJustificativaSemMemorial] = useState('');

  // Natureza serviço
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
  const [rateioEmpreendimentosSelecionados, setRateioEmpreendimentosSelecionados] = useState<string[]>([]);

  // Anexos
  const [anexos, setAnexos] = useState<Record<string, UploadedFile | null>>({});
  const [outrosAnexos, setOutrosAnexos] = useState<UploadedFile[]>([]);

  // AI validations
  const { isValidating: isValidatingDescription, validationResult: descriptionValidation } = useDescriptionValidation(descricao);
  const { validationResult: cnaeValidationResult } = useCNAEValidation({
    descricao,
    fornecedor,
    enabled: !!fornecedor?.cnae_principal_codigo && descricao.length >= 20,
  });

  // Derived values
  const valorNumerico = parseFloat(valor.replace(/\D/g, '')) / 100 || 0;
  const valorServicoNumerico = parseFloat(valorServico.replace(/\D/g, '')) / 100 || 0;
  const valorMaterialNumerico = parseFloat(valorMaterial.replace(/\D/g, '')) / 100 || 0;
  const isOC = valorNumerico <= 1000 || (valorNumerico > 1000 && tipoContratacao !== 'servicos');
  const isAC = valorNumerico > 1000 && tipoContratacao === 'servicos';
  const isOCAbove1000 = valorNumerico > 1000 && tipoContratacao !== '' && tipoContratacao !== 'servicos';
  const showEmergencial = isAC;
  const showNaturezaServicoStep = isAC;

  const requerFluxoJuridico = isAC && (
    valorNumerico >= 10000 ||
    naturezaObraCivil ||
    naturezaAlturaRisco ||
    naturezaFossaFiltro ||
    naturezaPrecoVariavel
  );

  const instrumentoJuridico = useMemo((): InstrumentoJuridico => {
    if (!isAC) return 'oc';
    if (naturezaObraCivil) return 'contrato_empreitada';
    if (naturezaAlturaRisco || naturezaFossaFiltro || naturezaPrecoVariavel) return 'termo_contratacao';
    if (valorNumerico >= 70000) return 'contrato_prestacao';
    if (valorNumerico >= 10000) return 'termo_contratacao';
    return 'oc';
  }, [valorNumerico, naturezaObraCivil, naturezaAlturaRisco, naturezaFossaFiltro, naturezaPrecoVariavel, isAC]);

  const requerEscopoDetalhado = isAC && instrumentoJuridico !== 'oc';
  const requerDueDiligence = isAC && valorNumerico >= 50000;
  const requires3CNPJs = isAC && !emergencial;

  const derived: DerivedValues = {
    valorNumerico,
    valorServicoNumerico,
    valorMaterialNumerico,
    isOC,
    isAC,
    isOCAbove1000,
    showEmergencial,
    showNaturezaServicoStep,
    requerFluxoJuridico,
    instrumentoJuridico,
    requerEscopoDetalhado,
    requerDueDiligence,
    requires3CNPJs,
  };

  const formState = {
    empreendimento, descricao, valor, tipoContratacao, naturezaOrcamentaria, origemCusto,
    dataInicio, dataFim, parcelas, contratoMensal, faturamentoDireto,
    valorServico, valorMaterial, retencao6, tipoGarantia,
    diasGarantia, diasGarantiaServico, diasGarantiaProduto,
    custoCliente, emergencial,
    fornecedor, fornecedorConcorrente1, fornecedorConcorrente2,
    clienteId, clienteNome,
    excecaoFornecedores, justificativaFornecedores,
    fornecimentoExclusivo, justificativaExclusividade,
    temChamadoInfraspeak, chamadoCorretiva, semMemorial, justificativaSemMemorial,
    naturezaObraCivil, naturezaAlturaRisco, naturezaFossaFiltro, naturezaPrecoVariavel,
    nenhumaOpcaoNatureza, escopoDetalhadoMinuta,
    dueDiligenceConfirmada, dueDiligenceNumeroProjuris, temProcessoProjuris,
    tipoRateio, rateioValores,
    anexos, outrosAnexos,
  };

  const setters: FormSetters = {
    setEmpreendimento, setDescricao, setValor, setTipoContratacao,
    setNaturezaOrcamentaria, setOrigemCusto,
    setDataInicio, setDataFim, setParcelas, setContratoMensal,
    setFaturamentoDireto, setValorServico, setValorMaterial, setRetencao6,
    setTipoGarantia, setDiasGarantia, setDiasGarantiaServico, setDiasGarantiaProduto,
    setCustoCliente, setEmergencial,
    setFornecedor, setFornecedorConcorrente1, setFornecedorConcorrente2,
    setClienteId, setClienteNome,
    setExcecaoFornecedores, setJustificativaFornecedores,
    setFornecimentoExclusivo, setJustificativaExclusividade,
    setTemChamadoInfraspeak, setChamadoCorretiva,
    setSemMemorial, setJustificativaSemMemorial,
    setNaturezaObraCivil, setNaturezaAlturaRisco, setNaturezaFossaFiltro, setNaturezaPrecoVariavel,
    setNenhumaOpcaoNatureza, setEscopoDetalhadoMinuta,
    setDueDiligenceConfirmada, setDueDiligenceNumeroProjuris, setTemProcessoProjuris,
    setTipoRateio, setRateioValores,
    setAnexos, setOutrosAnexos,
  };

  // Fetch allowed empreendimentos
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

      setEmpreendimento((current) => {
        if (allowed.length === 1) return allowed[0];
        if (current && allowed.includes(current as Empreendimento)) return current;
        return '';
      });
    };
    fetchAllowedEmpreendimentos();
  }, [effectiveUserId]);

  // Auto-set natureza for OC above 1000
  useEffect(() => {
    if (isOCAbove1000 && tipoContratacao) {
      const autoNatureza = TIPO_TO_NATUREZA[tipoContratacao];
      if (autoNatureza) setNaturezaOrcamentaria(autoNatureza);
    }
  }, [tipoContratacao, isOCAbove1000]);

  // Load fornecedor from duplicateFrom
  useEffect(() => {
    if (duplicateFrom?.fornecedor_id) {
      supabase
        .from('fornecedores')
        .select('*')
        .eq('id', duplicateFrom.fornecedor_id)
        .single()
        .then(({ data }) => {
          if (data) setFornecedor(parseFornecedorRow(data));
        });
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

  // Load draft
  useEffect(() => {
    if (duplicateFrom || draftLoadedRef.current) return;
    const draft = loadDraft();
    if (draft) {
      draftLoadedRef.current = true;
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
      const loadForn = (id: string, setter: (f: Fornecedor | null) => void) => {
        supabase.from('fornecedores').select('*').eq('id', id).single().then(({ data }) => {
          if (data) setter(parseFornecedorRow(data));
        });
      };
      if (draft.fornecedorId) loadForn(draft.fornecedorId, setFornecedor);
      if (draft.fornecedorConcorrente1Id) loadForn(draft.fornecedorConcorrente1Id, setFornecedorConcorrente1);
      if (draft.fornecedorConcorrente2Id) loadForn(draft.fornecedorConcorrente2Id, setFornecedorConcorrente2);

      toast({ title: 'Rascunho restaurado', description: 'Os dados do formulário foram recuperados.' });
    }
  }, [duplicateFrom, loadDraft, toast]);

  // Save draft
  useEffect(() => {
    if (!empreendimento && !descricao && !valor) return;
    if (submitting) return;
    saveDraft({
      currentStep, empreendimento, descricao, valor, tipoContratacao, naturezaOrcamentaria,
      origemCusto, dataInicio, dataFim, parcelas, contratoMensal, faturamentoDireto,
      valorServico, valorMaterial, retencao6, tipoGarantia, diasGarantia, diasGarantiaServico,
      diasGarantiaProduto, custoCliente, emergencial, clienteId, excecaoFornecedores,
      justificativaFornecedores, temChamadoInfraspeak, chamadoCorretiva, semMemorial,
      justificativaSemMemorial, fornecedorId: fornecedor?.id || null,
      fornecedorConcorrente1Id: fornecedorConcorrente1?.id || null,
      fornecedorConcorrente2Id: fornecedorConcorrente2?.id || null,
      naturezaObraCivil, naturezaAlturaRisco, naturezaFossaFiltro, naturezaPrecoVariavel,
      nenhumaOpcaoNatureza, escopoDetalhadoMinuta, dueDiligenceConfirmada,
      dueDiligenceNumeroProjuris, temProcessoProjuris,
    });
  }, [
    currentStep, empreendimento, descricao, valor, tipoContratacao, naturezaOrcamentaria,
    origemCusto, dataInicio, dataFim, parcelas, contratoMensal, faturamentoDireto,
    valorServico, valorMaterial, retencao6, tipoGarantia, diasGarantia, diasGarantiaServico,
    diasGarantiaProduto, custoCliente, emergencial, clienteId, excecaoFornecedores,
    justificativaFornecedores, temChamadoInfraspeak, chamadoCorretiva, semMemorial,
    justificativaSemMemorial, fornecedor?.id, fornecedorConcorrente1?.id, fornecedorConcorrente2?.id,
    naturezaObraCivil, naturezaAlturaRisco, naturezaFossaFiltro, naturezaPrecoVariavel,
    nenhumaOpcaoNatureza, escopoDetalhadoMinuta, dueDiligenceConfirmada, dueDiligenceNumeroProjuris,
    temProcessoProjuris, saveDraft, submitting,
  ]);

  // Fetch cliente nome
  useEffect(() => {
    if (!clienteId) { setClienteNome(''); return; }
    supabase.from('clientes').select('nome').eq('id', clienteId).single().then(({ data }) => {
      if (data) setClienteNome(data.nome);
    });
  }, [clienteId]);

  // Get required attachments
  const getRequiredAttachments = () => {
    const isAguaEnergia = naturezaOrcamentaria && NATUREZAS_AGUA_ENERGIA.includes(naturezaOrcamentaria);
    let attachments: { tipo: string; label: string; required: boolean }[] = [];

    if (isOC) {
      if (isAguaEnergia) {
        attachments = [
          { tipo: 'fatura_agua_energia', label: ANEXO_LABELS.fatura_agua_energia, required: true },
          { tipo: 'rateio', label: ANEXO_LABELS.rateio, required: false },
        ];
      } else {
        attachments = [
          { tipo: 'orcamento_escolhido', label: 'Proposta do Fornecedor (PDF)', required: true },
        ];
        if (temChamadoInfraspeak) {
          attachments.push({ tipo: 'chamado_preventiva', label: 'Chamado Infraspeak', required: false });
        }
      }
    } else if (isAC) {
      if (emergencial) {
        attachments = [
          { tipo: 'orcamento_escolhido', label: ANEXO_LABELS.orcamento_escolhido, required: true },
        ];
        if (chamadoCorretiva) {
          attachments.unshift({ tipo: 'chamado_preventiva', label: ANEXO_LABELS.chamado_preventiva, required: true });
        }
      } else {
        attachments = [
          { tipo: 'escopo_detalhado', label: ANEXO_LABELS.escopo_detalhado, required: !semMemorial },
          { tipo: 'orcamento_escolhido', label: ANEXO_LABELS.orcamento_escolhido, required: true },
        ];
        if (chamadoCorretiva) {
          attachments.unshift({ tipo: 'chamado_preventiva', label: ANEXO_LABELS.chamado_preventiva, required: true });
        }
        if (!excecaoFornecedores && !fornecimentoExclusivo) {
          attachments.push(
            { tipo: 'orcamento_concorrente_1', label: ANEXO_LABELS.orcamento_concorrente_1, required: true },
            { tipo: 'orcamento_concorrente_2', label: ANEXO_LABELS.orcamento_concorrente_2, required: true },
            { tipo: 'mapa_cotacao', label: ANEXO_LABELS.mapa_cotacao, required: true },
          );
        } else {
          attachments.push(
            { tipo: 'justificativa_anexo', label: 'Comprovação da Justificativa (ex: e-mail, aceite)', required: true },
          );
        }
      }
      if (isAguaEnergia) {
        attachments.push(
          { tipo: 'fatura_agua_energia', label: ANEXO_LABELS.fatura_agua_energia, required: true },
          { tipo: 'rateio', label: ANEXO_LABELS.rateio, required: false },
        );
      }
    }

    if (origemCusto === 'cliente') {
      attachments.push({ tipo: 'comunicado_cliente', label: ANEXO_LABELS.comunicado_cliente, required: true });
    }
    return attachments;
  };

  // Format currency helper
  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Handle contrato mensal change
  const handleContratoMensalChange = (checked: boolean) => {
    setContratoMensal(checked);
    setParcelas(checked ? '12' : '1');
  };

  // Reset form
  const resetForm = () => {
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
  };

  return {
    // State
    formState,
    derived,
    setters,
    currentStep,
    setCurrentStep,
    submitting,
    setSubmitting,

    // Empreendimentos
    allowedEmpreendimentos,
    loadingEmpreendimentos,

    // Draft
    hasDraft,
    clearDraft,

    // AI validations
    isValidatingDescription,
    descriptionValidation,
    cnaeValidationResult,

    // Helpers
    getRequiredAttachments,
    formatCurrency,
    handleContratoMensalChange,
    resetForm,
  };
}
