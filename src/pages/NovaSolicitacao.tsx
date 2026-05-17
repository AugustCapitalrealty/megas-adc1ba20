import { logger } from '@/lib/logger';
import { useRef, useEffect, useState } from 'react';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  EMPREENDIMENTO_LABELS,
  type Empreendimento,
} from '@/types';
import { AlertTriangle, RotateCcw, History, X, Command, Sparkles, ShieldCheck, User as UserIcon, Building2, FileText, Tag, Settings, Truck, Paperclip, Send } from 'lucide-react';
import { notifyBackofficeNewSolicitacao } from '@/hooks/useNotificationEmail';
import { StepIndicator, type Step as StepIndicatorStep } from '@/components/StepIndicator';
import { NaturezaServicoStep } from '@/components/NaturezaServicoStep';
import { useNovaSolicitacaoForm } from '@/hooks/useNovaSolicitacaoForm';
import type { Step, StepDefinition } from '@/components/nova-solicitacao/types';
import { FormSummarySidebar } from '@/components/nova-solicitacao/FormSummarySidebar';
import { FieldError } from '@/components/nova-solicitacao/FieldError';
import { FluxoBadge } from '@/components/nova-solicitacao/FluxoBadge';
import { useStepErrors } from '@/hooks/useNovaSolicitacaoErrors';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

// Step components
import { EmpreendimentoStep } from '@/components/nova-solicitacao/steps/EmpreendimentoStep';
import { DescricaoStep } from '@/components/nova-solicitacao/steps/DescricaoStep';
import { TipoStep } from '@/components/nova-solicitacao/steps/TipoStep';
import { DetalhesStep } from '@/components/nova-solicitacao/steps/DetalhesStep';
import { FornecedorStep } from '@/components/nova-solicitacao/steps/FornecedorStep';
import { AnexosStep } from '@/components/nova-solicitacao/steps/AnexosStep';
import { RevisaoStep } from '@/components/nova-solicitacao/steps/RevisaoStep';
import { FormNavigation } from '@/components/nova-solicitacao/FormNavigation';

export default function NovaSolicitacao() {
  const { user, effectiveProfile, effectiveRoles } = useAuth();
  const track = useTrackEvent();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rascunhoId = searchParams.get('rascunho');
  const effectiveUserId = effectiveProfile?.id ?? user?.id;

  const form = useNovaSolicitacaoForm(effectiveUserId, { disableLocalDraft: !!rascunhoId });
  const {
    formState, derived, setters,
    currentStep, setCurrentStep, submitting, setSubmitting,
    allowedEmpreendimentos, loadingEmpreendimentos,
    hasDraft, clearDraft, lastSavedAt, justRestored, dismissRestoredBanner,
    isValidatingDescription, descriptionValidation, cnaeValidationResult,
    getRequiredAttachments, formatCurrency, handleContratoMensalChange, resetForm,
  } = form;

  // Steps definition
  const steps: StepDefinition[] = [
    { id: 'empreendimento', label: 'Local', show: true, description: 'Escolha o empreendimento' },
    { id: 'descricao', label: 'Descrição', show: true, description: 'Descreva o serviço e informe o valor' },
    { id: 'tipo', label: 'Tipo', show: derived.valorNumerico > 1000, description: 'Defina o tipo de contratação' },
    { id: 'natureza_servico', label: 'Natureza', show: derived.showNaturezaServicoStep, description: 'Indique características especiais' },
    { id: 'detalhes', label: 'Detalhes', show: true, description: 'Complete os detalhes financeiros' },
    { id: 'fornecedor', label: 'Fornecedor', show: true, description: 'Selecione o fornecedor principal' },
    { id: 'anexos', label: 'Anexos', show: true, description: 'Envie os documentos necessários' },
    { id: 'revisao', label: 'Enviar', show: true, description: 'Revise e envie' },
  ];

  const visibleSteps = steps.filter((s) => s.show);
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);

  // Inline validation errors (only shown after attempt to advance)
  const requiredAttachments = getRequiredAttachments();
  const stepErrors = useStepErrors(currentStep, formState, derived, requiredAttachments);
  const [showErrors, setShowErrors] = useState(false);

  // Reset error display when step changes
  useEffect(() => {
    setShowErrors(false);
  }, [currentStep]);

  // Focus management: move focus to step heading when step changes
  const stepContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = stepContainerRef.current;
    if (!node) return;
    // Focus first input/textarea/select inside the step, fallback to heading
    const focusable = node.querySelector<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]'
    );
    if (focusable) {
      focusable.focus({ preventScroll: true });
    }
  }, [currentStep]);

  // canProceed logic — validates a specific step
  const validateStep = (stepId: Step): boolean => {
    switch (stepId) {
      case 'empreendimento': return !!formState.empreendimento;
      case 'descricao': return !!formState.descricao && derived.valorNumerico > 0;
      case 'tipo': return derived.valorNumerico <= 1000 || !!formState.tipoContratacao;
      case 'natureza_servico': {
        if (!derived.showNaturezaServicoStep) return true;
        return (
          formState.naturezaObraCivil ||
          formState.naturezaAlturaRisco ||
          formState.naturezaFossaFiltro ||
          formState.naturezaPrecoVariavel ||
          formState.nenhumaOpcaoNatureza
        );
      }
      case 'detalhes': {
        if (!formState.naturezaOrcamentaria) return false;
        if (formState.origemCusto === 'cliente' && !formState.clienteId) return false;
        if (formState.faturamentoDireto) {
          const sum = derived.valorServicoNumerico + derived.valorMaterialNumerico;
          if (Math.abs(sum - derived.valorNumerico) > 0.01) return false;
        }
        if (derived.requerEscopoDetalhado && formState.escopoDetalhadoMinuta.length < 100) return false;
        if (derived.requerDueDiligence && !formState.dueDiligenceConfirmada) return false;
        if (formState.empreendimento === 'todos') {
          if (!formState.rateioValores || formState.rateioValores.length < 2) return false;
          const soma = formState.rateioValores.reduce(
            (acc: number, r: any) => acc + (Number(r?.valor) || 0),
            0,
          );
          if (Math.abs(soma - derived.valorNumerico) > 0.01) return false;
        }
        return true;
      }
      case 'fornecedor': {
        if (!formState.fornecedor) return false;
        if (formState.fornecimentoExclusivo && !formState.justificativaExclusividade.trim()) return false;
        if (derived.requires3CNPJs && !formState.fornecimentoExclusivo && formState.excecaoFornecedores && !formState.justificativaFornecedores.trim()) return false;
        if (derived.requires3CNPJs && !formState.fornecimentoExclusivo && !formState.excecaoFornecedores && (!formState.fornecedorConcorrente1 || !formState.fornecedorConcorrente2)) return false;
        return true;
      }
      case 'anexos': {
        const requiredAttachments = getRequiredAttachments();
        const attachmentsOk = requiredAttachments.every(att => !att.required || !!formState.anexos[att.tipo]);
        if (formState.semMemorial && !formState.justificativaSemMemorial.trim()) return false;
        return attachmentsOk;
      }
      default: return true;
    }
  };

  const canProceed = (): boolean => validateStep(currentStep);

  // First invalid step (excluding revisao) — used to gate the Submit button
  const firstInvalidStep: Step | null = (() => {
    for (const s of visibleSteps) {
      if (s.id === 'revisao') continue;
      if (!validateStep(s.id)) return s.id;
    }
    return null;
  })();
  const canSubmit = firstInvalidStep === null;
  const firstInvalidStepLabel = firstInvalidStep
    ? visibleSteps.find((s) => s.id === firstInvalidStep)?.label ?? null
    : null;

  // List of all invalid step ids (for visual hint in StepIndicator)
  const invalidStepIds: string[] = visibleSteps
    .filter((s) => s.id !== 'revisao' && !validateStep(s.id))
    .map((s) => s.id);

  // Detect: draft restored on anexos/revisao but no anexos uploaded yet
  const restoredWithoutAnexos =
    justRestored &&
    (currentStep === 'anexos' || currentStep === 'revisao') &&
    Object.values(formState.anexos).every((f) => !f) &&
    formState.outrosAnexos.length === 0;

  useEffect(() => {
    if (restoredWithoutAnexos && currentStep === 'revisao') {
      // Send user back to anexos so they can re-upload and see the issue clearly
      setCurrentStep('anexos');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoredWithoutAnexos]);

  const goNext = () => {
    // Block advance and surface inline errors if any
    if (Object.keys(stepErrors).length > 0) {
      setShowErrors(true);
      return;
    }
    if (currentIndex < visibleSteps.length - 1) {
      const nextStep = visibleSteps[currentIndex + 1];
      track('step_viewed', { step: nextStep.id, index: currentIndex + 1 }, '/nova-solicitacao');
      setCurrentStep(nextStep.id);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) setCurrentStep(visibleSteps[currentIndex - 1].id);
  };

  // Keyboard shortcuts: Ctrl/Cmd + ArrowRight = next, Ctrl/Cmd + ArrowLeft = back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentStep !== 'revisao') goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, currentIndex, stepErrors]);

  // Upload attachments
  // Upload attachments. Returns the list of `tipo` keys that were uploaded successfully
  // (used by draft save to clear only the confirmed file refs).
  // For "typed" anexos we dedup: any previous file of the same tipo is removed first,
  // so saving a draft twice doesn't duplicate attachments.
  const uploadAnexos = async (solicitacaoId: string): Promise<{ uploadedTipos: string[] }> => {
    const uploadedTipos: string[] = [];

    // Typed anexos — replace previous file of same tipo
    for (const [tipo, uploadedFile] of Object.entries(formState.anexos)) {
      if (!uploadedFile) continue;
      const { data: existing } = await supabase
        .from('anexos')
        .select('id, storage_path')
        .eq('solicitacao_id', solicitacaoId)
        .eq('tipo', tipo);
      if (existing && existing.length > 0) {
        const paths = existing.map((a: any) => a.storage_path).filter(Boolean);
        if (paths.length > 0) {
          await supabase.storage.from('anexos').remove(paths);
        }
        await supabase.from('anexos').delete().in('id', existing.map((a: any) => a.id));
      }
      const { file } = uploadedFile;
      const fileExt = file.name.split('.').pop();
      const filePath = `${solicitacaoId}/${tipo}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from('anexos').insert({
        solicitacao_id: solicitacaoId, tipo, nome_arquivo: file.name,
        storage_path: filePath, mime_type: file.type, tamanho_bytes: file.size,
      });
      if (dbError) throw dbError;
      uploadedTipos.push(tipo);
    }

    // Outros — always append
    for (let index = 0; index < formState.outrosAnexos.length; index++) {
      const uploadedFile = formState.outrosAnexos[index];
      const { file } = uploadedFile;
      const fileExt = file.name.split('.').pop();
      const filePath = `${solicitacaoId}/outros_${Date.now()}_${index}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('anexos').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from('anexos').insert({
        solicitacao_id: solicitacaoId, tipo: 'outros', nome_arquivo: file.name,
        storage_path: filePath, mime_type: file.type, tamanho_bytes: file.size,
      });
      if (dbError) throw dbError;
    }

    return { uploadedTipos };
  };

  // Submit
  const isSubmittingRef = useRef(false);
  // When attachment upload fails after a successful insert, we keep the id here
  // and offer a manual retry button instead of leaving the user without remediation.
  const [pendingAnexosFor, setPendingAnexosFor] = useState<{ id: string; protocolo: string } | null>(null);

  // Server-side draft (status = 'rascunho')
  const [draftId, setDraftId] = useState<string | null>(rascunhoId);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(!!rascunhoId);
  // Optimistic concurrency: snapshot of updated_at when the draft was loaded
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<string | null>(null);
  // Anexos already persisted server-side (loaded from a draft we're continuing)
  const [existingAnexos, setExistingAnexos] = useState<Array<{ id: string; tipo: string; nome_arquivo: string }>>([]);
  // Dirty flag — anything filled that hasn't been persisted in this session
  const dirtyRef = useRef(false);

  // Load existing rascunho when ?rascunho=id is present
  useEffect(() => {
    if (!rascunhoId || !effectiveUserId) return;
    let cancelled = false;
    (async () => {
      setLoadingDraft(true);
      try {
        const { data, error } = await supabase
          .from('solicitacoes')
          .select('*, fornecedor:fornecedores!solicitacoes_fornecedor_id_fkey(*), conc1:fornecedores!solicitacoes_fornecedor_concorrente_1_id_fkey(*), conc2:fornecedores!solicitacoes_fornecedor_concorrente_2_id_fkey(*)')
          .eq('id', rascunhoId)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          toast({ title: 'Rascunho não encontrado', variant: 'destructive' });
          navigate('/nova-solicitacao', { replace: true });
          return;
        }
        if (data.status !== 'rascunho') {
          toast({ title: 'Esta solicitação já foi enviada', description: 'Não é mais um rascunho.', variant: 'destructive' });
          navigate('/minhas-solicitacoes', { replace: true });
          return;
        }
        // Populate form via setters
        const s = data as any;
        if (s.empreendimento) setters.setEmpreendimento(s.empreendimento);
        if (s.descricao) setters.setDescricao(s.descricao);
        if (s.valor != null) setters.setValor(String(s.valor));
        if (s.tipo_contratacao) setters.setTipoContratacao(s.tipo_contratacao);
        if (s.natureza_orcamentaria) setters.setNaturezaOrcamentaria(s.natureza_orcamentaria);
        if (s.origem_custo) setters.setOrigemCusto(s.origem_custo);
        if (s.data_inicio) setters.setDataInicio(s.data_inicio);
        if (s.data_fim) setters.setDataFim(s.data_fim);
        if (s.parcelas) setters.setParcelas(String(s.parcelas));
        setters.setContratoMensal(!!s.contrato_mensal);
        setters.setFaturamentoDireto(!!s.faturamento_direto);
        if (s.valor_servico != null) setters.setValorServico(String(s.valor_servico));
        if (s.valor_material != null) setters.setValorMaterial(String(s.valor_material));
        setters.setRetencao6(!!s.retencao_6_porcento);
        if (s.tipo_garantia) setters.setTipoGarantia(s.tipo_garantia);
        if (s.dias_garantia != null) setters.setDiasGarantia(String(s.dias_garantia));
        if (s.dias_garantia_servico != null) setters.setDiasGarantiaServico(String(s.dias_garantia_servico));
        if (s.dias_garantia_produto != null) setters.setDiasGarantiaProduto(String(s.dias_garantia_produto));
        setters.setCustoCliente(!!s.custo_cliente);
        setters.setEmergencial(!!s.emergencial);
        if (s.cliente_id) setters.setClienteId(s.cliente_id);
        setters.setExcecaoFornecedores(!!s.excecao_fornecedores);
        if (s.justificativa_fornecedores) setters.setJustificativaFornecedores(s.justificativa_fornecedores);
        setters.setFornecimentoExclusivo(!!s.fornecimento_exclusivo);
        if (s.justificativa_exclusividade) setters.setJustificativaExclusividade(s.justificativa_exclusividade);
        if (s.justificativa_sem_memorial) {
          setters.setSemMemorial(true);
          setters.setJustificativaSemMemorial(s.justificativa_sem_memorial);
        }
        setters.setNaturezaObraCivil(!!s.natureza_servico_obra_civil);
        setters.setNaturezaAlturaRisco(!!s.natureza_servico_altura_risco);
        setters.setNaturezaFossaFiltro(!!s.natureza_servico_fossa_filtro);
        setters.setNaturezaPrecoVariavel(!!s.natureza_servico_preco_variavel);
        if (s.escopo_detalhado_minuta) setters.setEscopoDetalhadoMinuta(s.escopo_detalhado_minuta);
        setters.setDueDiligenceConfirmada(!!s.due_diligence_confirmada);
        if (s.due_diligence_numero_projuris) {
          setters.setTemProcessoProjuris(true);
          setters.setDueDiligenceNumeroProjuris(s.due_diligence_numero_projuris);
        }
        if (s.tipo_rateio) setters.setTipoRateio(s.tipo_rateio);
        if (Array.isArray(s.rateio_valores)) setters.setRateioValores(s.rateio_valores);
        if (s.fornecedor) setters.setFornecedor(s.fornecedor);
        if (s.conc1) setters.setFornecedorConcorrente1(s.conc1);
        if (s.conc2) setters.setFornecedorConcorrente2(s.conc2);
        setDraftId(s.id);
        setLoadedUpdatedAt(s.updated_at ?? null);
        // Carregar anexos já enviados (apenas para exibir banner — não populamos File objects)
        const { data: anexosRows } = await supabase
          .from('anexos')
          .select('id, tipo, nome_arquivo')
          .eq('solicitacao_id', s.id);
        setExistingAnexos(anexosRows || []);
        // Disable localStorage draft so it doesn't conflict
        clearDraft();
        toast({ title: 'Rascunho carregado', description: 'Continue de onde parou.' });
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rascunhoId, effectiveUserId]);

  // Build a partial payload for rascunho (skips invalid casts)
  const buildDraftPayload = () => {
    const valorNum = derived.valorNumerico || null;
    return {
      user_id: effectiveUserId ?? user?.id,
      empreendimento: formState.empreendimento || null,
      descricao: formState.descricao || null,
      valor: valorNum,
      tipo: derived.valorNumerico > 0 ? (derived.isAC ? 'AC' : 'OC') : null,
      natureza_orcamentaria: formState.naturezaOrcamentaria || null,
      origem_custo: formState.origemCusto,
      cliente_id: formState.origemCusto === 'cliente' ? formState.clienteId : null,
      fornecedor_id: formState.fornecedor?.id || null,
      fornecedor_concorrente_1_id: formState.fornecedorConcorrente1?.id || null,
      fornecedor_concorrente_2_id: formState.fornecedorConcorrente2?.id || null,
      tipo_contratacao: formState.tipoContratacao || null,
      data_inicio: formState.dataInicio || null,
      data_fim: formState.dataFim || null,
      parcelas: parseInt(formState.parcelas) || 1,
      contrato_mensal: formState.contratoMensal,
      faturamento_direto: formState.faturamentoDireto,
      valor_servico: derived.valorServicoNumerico || null,
      valor_material: derived.valorMaterialNumerico || null,
      retencao_6_porcento: formState.retencao6,
      tipo_garantia: formState.tipoGarantia,
      dias_garantia: parseInt(formState.diasGarantia) || null,
      dias_garantia_servico: parseInt(formState.diasGarantiaServico) || null,
      dias_garantia_produto: parseInt(formState.diasGarantiaProduto) || null,
      custo_cliente: formState.custoCliente,
      emergencial: formState.emergencial,
      excecao_fornecedores: formState.excecaoFornecedores,
      justificativa_fornecedores: formState.justificativaFornecedores || null,
      fornecimento_exclusivo: formState.fornecimentoExclusivo,
      justificativa_exclusividade: formState.justificativaExclusividade || null,
      justificativa_sem_memorial: formState.semMemorial && formState.justificativaSemMemorial.trim() ? formState.justificativaSemMemorial.trim() : null,
      natureza_servico_obra_civil: formState.naturezaObraCivil,
      natureza_servico_altura_risco: formState.naturezaAlturaRisco,
      natureza_servico_fossa_filtro: formState.naturezaFossaFiltro,
      natureza_servico_preco_variavel: formState.naturezaPrecoVariavel,
      escopo_detalhado_minuta: formState.escopoDetalhadoMinuta || null,
      due_diligence_confirmada: formState.dueDiligenceConfirmada,
      due_diligence_numero_projuris: formState.dueDiligenceNumeroProjuris || null,
      tipo_rateio: formState.empreendimento === 'todos' ? formState.tipoRateio : null,
      rateio_valores: formState.empreendimento === 'todos' && formState.rateioValores.length > 0 ? formState.rateioValores : null,
      status: 'rascunho' as any,
    } as any;
  };

  const canSaveDraft = !!formState.empreendimento && !!formState.descricao.trim();

  const handleSaveDraft = async () => {
    if (!user || !canSaveDraft || savingDraft) return;
    setSavingDraft(true);
    try {
      const payload = buildDraftPayload();
      let id = draftId;
      if (id) {
        // Optimistic concurrency: bail if another tab/process edited the draft after we loaded it
        let q = supabase.from('solicitacoes').update(payload).eq('id', id);
        if (loadedUpdatedAt) q = q.eq('updated_at', loadedUpdatedAt);
        const { data: updated, error } = await q.select('id, updated_at').maybeSingle();
        if (error) throw error;
        if (!updated) {
          toast({
            title: 'Rascunho foi alterado em outra aba',
            description: 'Recarregue a página para evitar perda de dados.',
            variant: 'destructive',
          });
          return;
        }
        setLoadedUpdatedAt(updated.updated_at ?? null);
      } else {
        // Limite: 20 rascunhos por usuário
        const { count } = await supabase
          .from('solicitacoes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', effectiveUserId ?? user.id)
          .eq('status', 'rascunho' as any);
        if ((count ?? 0) >= 20) {
          toast({
            title: 'Limite de rascunhos atingido',
            description: 'Você já tem 20 rascunhos. Conclua ou exclua algum antes de criar outro.',
            variant: 'destructive',
          });
          return;
        }
        const { data, error } = await supabase.from('solicitacoes').insert(payload).select('id, updated_at').single();
        if (error) throw error;
        id = data.id;
        setDraftId(id);
        setLoadedUpdatedAt((data as any).updated_at ?? null);
      }
      // Upload any new attachments to this rascunho. Só limpa as refs em memória dos `tipos`
      // que subiram com sucesso — se um falhou, o arquivo permanece para nova tentativa.
      try {
        const { uploadedTipos } = await uploadAnexos(id!);
        if (uploadedTipos.length > 0) {
          const remaining = { ...formState.anexos };
          for (const tipo of uploadedTipos) delete remaining[tipo];
          setters.setAnexos(remaining);
        }
        setters.setOutrosAnexos([]);
        const { data: anexosRows } = await supabase
          .from('anexos').select('id, tipo, nome_arquivo').eq('solicitacao_id', id!);
        setExistingAnexos(anexosRows || []);
      } catch (anexoErr) {
        console.error('[DRAFT] Falha ao subir anexos:', anexoErr);
        toast({ title: 'Rascunho salvo, anexos pendentes', description: 'Tente reenviar os anexos.', variant: 'destructive' });
      }
      clearDraft();
      dirtyRef.current = false;
      toast({ title: 'Rascunho salvo', description: 'Você pode retomar mais tarde em Minhas Solicitações.' });
      track('draft_saved', { id }, '/nova-solicitacao');
    } catch (err: any) {
      console.error('[DRAFT] Erro ao salvar rascunho:', err);
      toast({ title: 'Erro ao salvar rascunho', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSavingDraft(false);
    }
  };

  const retryPendingAnexos = async () => {
    if (!pendingAnexosFor) return;
    setSubmitting(true);
    try {
      await uploadAnexos(pendingAnexosFor.id);
      toast({ title: 'Anexos enviados!', description: `Protocolo ${pendingAnexosFor.protocolo} concluído.` });
      clearDraft();
      const protocolo = pendingAnexosFor.protocolo;
      setPendingAnexosFor(null);
      navigate(`/minhas-solicitacoes?created=${protocolo}`);
    } catch (err: any) {
      console.error('[RETRY-UPLOAD] Falha:', err);
      toast({
        title: 'Falha ao reenviar',
        description: err?.message || 'Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current || submitting) return;
    let errorCooldown = false;

    if (!user) {
      toast({ title: 'Sessão não encontrada', description: 'Faça login novamente para enviar a solicitação.', variant: 'destructive' });
      track('submit_failed', { reason: 'no_session' }, '/nova-solicitacao');
      navigate('/login');
      return;
    }

    // Revalidate every step before submitting; jump to the first invalid step
    if (firstInvalidStep) {
      const stepLabel = visibleSteps.find(s => s.id === firstInvalidStep)?.label ?? 'etapa pendente';
      // If anexos step is the issue, list missing attachments to speed up correction
      let extraDescription = '';
      if (firstInvalidStep === 'anexos') {
        const missing = getRequiredAttachments()
          .filter((a) => a.required && !formState.anexos[a.tipo])
          .map((a) => a.label);
        if (missing.length > 0) {
          extraDescription = ` Faltando: ${missing.join(', ')}.`;
        }
      }
      toast({
        title: 'Faltam informações',
        description: `Complete a etapa "${stepLabel}" antes de enviar.${extraDescription}`,
        variant: 'destructive',
      });
      track('submit_failed', { reason: 'invalid_step', step: firstInvalidStep }, '/nova-solicitacao');
      setCurrentStep(firstInvalidStep);
      setShowErrors(true);
      return;
    }

    if (!formState.empreendimento || !formState.naturezaOrcamentaria || !formState.fornecedor) {
      const faltando: string[] = [];
      if (!formState.empreendimento) faltando.push('Empreendimento');
      if (!formState.naturezaOrcamentaria) faltando.push('Natureza Orçamentária');
      if (!formState.fornecedor) faltando.push('Fornecedor');
      toast({
        title: 'Faltam informações obrigatórias',
        description: `Preencha: ${faltando.join(', ')}.`,
        variant: 'destructive',
      });
      track('submit_failed', { reason: 'missing_required', fields: faltando.join(',') }, '/nova-solicitacao');
      if (!formState.empreendimento) setCurrentStep('empreendimento');
      else if (!formState.naturezaOrcamentaria) setCurrentStep('detalhes');
      else if (!formState.fornecedor) setCurrentStep('fornecedor');
      setShowErrors(true);
      return;
    }

    // Lock immediately — both ref and state
    isSubmittingRef.current = true;
    setSubmitting(true);

    // FD validation
    if (formState.faturamentoDireto) {
      const sum = derived.valorServicoNumerico + derived.valorMaterialNumerico;
      if (Math.abs(sum - derived.valorNumerico) > 0.01) {
        toast({ title: 'Valores inválidos', description: 'A soma de Serviço + Material deve ser igual ao valor total.', variant: 'destructive' });
        isSubmittingRef.current = false;
        setSubmitting(false);
        return;
      }
    }

    if (formState.fornecimentoExclusivo && !formState.justificativaExclusividade.trim()) {
      toast({ title: 'Justificativa obrigatória', description: 'Informe a justificativa para fornecimento exclusivo.', variant: 'destructive' });
      isSubmittingRef.current = false;
      setSubmitting(false);
      return;
    }

    if (derived.requires3CNPJs && !formState.fornecimentoExclusivo) {
      if (formState.excecaoFornecedores && !formState.justificativaFornecedores.trim()) {
        toast({ title: 'Justificativa obrigatória', description: 'Informe a justificativa para não apresentar 3 fornecedores.', variant: 'destructive' });
        isSubmittingRef.current = false;
        setSubmitting(false);
        return;
      }
      if (!formState.excecaoFornecedores && (!formState.fornecedorConcorrente1 || !formState.fornecedorConcorrente2)) {
        toast({ title: 'Fornecedores obrigatórios', description: 'Informe os 3 fornecedores ou selecione a opção de exceção.', variant: 'destructive' });
        isSubmittingRef.current = false;
        setSubmitting(false);
        return;
      }
    }

    const requiredAttachments = getRequiredAttachments();
    const missingAttachments = requiredAttachments.filter(att => att.required && !formState.anexos[att.tipo]).map(att => att.label);
    if (missingAttachments.length > 0) {
      toast({ title: 'Anexos obrigatórios', description: `Faltando: ${missingAttachments.join(', ')}`, variant: 'destructive' });
      isSubmittingRef.current = false;
      setSubmitting(false);
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast({ title: 'Sessão expirada', description: 'Por favor, faça login novamente.', variant: 'destructive' });
        isSubmittingRef.current = false;
        setSubmitting(false);
        navigate('/login');
        return;
      }

      const insertData = {
        user_id: effectiveUserId ?? user.id,
        empreendimento: formState.empreendimento as any,
        descricao: formState.descricao,
        valor: derived.valorNumerico,
        valor_servico: formState.faturamentoDireto && derived.valorServicoNumerico > 0 ? derived.valorServicoNumerico : null,
        valor_material: formState.faturamentoDireto && derived.valorMaterialNumerico > 0 ? derived.valorMaterialNumerico : null,
        tipo: (derived.isAC ? 'AC' : 'OC') as "AC" | "OC",
        natureza_orcamentaria: formState.naturezaOrcamentaria as any,
        origem_custo: formState.origemCusto,
        cliente_id: formState.origemCusto === 'cliente' ? formState.clienteId : null,
        fornecedor_id: formState.fornecedor.id,
        fornecedor_concorrente_1_id: !formState.excecaoFornecedores ? formState.fornecedorConcorrente1?.id || null : null,
        fornecedor_concorrente_2_id: !formState.excecaoFornecedores ? formState.fornecedorConcorrente2?.id || null : null,
        justificativa_fornecedores: derived.requires3CNPJs && formState.excecaoFornecedores ? formState.justificativaFornecedores.trim() : null,
        excecao_fornecedores: derived.requires3CNPJs && formState.excecaoFornecedores,
        tipo_contratacao: (formState.tipoContratacao || null) as any,
        data_inicio: formState.dataInicio || null,
        data_fim: formState.dataFim || null,
        parcelas: parseInt(formState.parcelas) || 1,
        contrato_mensal: formState.contratoMensal,
        faturamento_direto: formState.faturamentoDireto,
        retencao_6_porcento: formState.retencao6,
        tipo_garantia: formState.tipoGarantia,
        dias_garantia: formState.tipoGarantia !== 'ambos' && formState.diasGarantia ? parseInt(formState.diasGarantia) : null,
        dias_garantia_servico: formState.tipoGarantia === 'ambos' && formState.diasGarantiaServico ? parseInt(formState.diasGarantiaServico) : null,
        dias_garantia_produto: formState.tipoGarantia === 'ambos' && formState.diasGarantiaProduto ? parseInt(formState.diasGarantiaProduto) : null,
        custo_cliente: formState.custoCliente,
        emergencial: formState.emergencial,
        justificativa_sem_memorial: formState.semMemorial && formState.justificativaSemMemorial.trim() ? formState.justificativaSemMemorial.trim() : null,
        fornecimento_exclusivo: formState.fornecimentoExclusivo,
        justificativa_exclusividade: formState.fornecimentoExclusivo && formState.justificativaExclusividade.trim() ? formState.justificativaExclusividade.trim() : null,
        natureza_servico_obra_civil: formState.naturezaObraCivil,
        natureza_servico_altura_risco: formState.naturezaAlturaRisco,
        natureza_servico_fossa_filtro: formState.naturezaFossaFiltro,
        natureza_servico_preco_variavel: formState.naturezaPrecoVariavel,
        escopo_detalhado_minuta: derived.requerEscopoDetalhado ? formState.escopoDetalhadoMinuta.trim() : null,
        due_diligence_confirmada: derived.requerDueDiligence ? formState.dueDiligenceConfirmada : false,
        due_diligence_numero_projuris: formState.temProcessoProjuris ? formState.dueDiligenceNumeroProjuris.trim() || null : null,
        tipo_rateio: formState.empreendimento === 'todos' ? formState.tipoRateio : null,
        rateio_valores: formState.empreendimento === 'todos' && formState.rateioValores.length > 0 ? formState.rateioValores : null,
        ia_cnae_status: cnaeValidationResult?.status || null,
        ia_cnae_justificativa: cnaeValidationResult?.justificativa_curta || null,
        ia_cnae_avaliado_em: cnaeValidationResult ? new Date().toISOString() : null,
        ia_descricao_vaga: descriptionValidation?.isVague ?? null,
        ia_descricao_sugestao: descriptionValidation?.suggestion || null,
        ia_descricao_avaliado_em: descriptionValidation ? new Date().toISOString() : null,
      } as any;

      let data: { id: string; protocolo: string } | null = null;
      let lastError: any = null;
      const maxRetries = 2;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (draftId) {
          // Promote rascunho → recebido (trigger gera o protocolo)
          const { data: updateResult, error } = await supabase
            .from('solicitacoes')
            .update({ ...insertData, status: 'recebido' as any })
            .eq('id', draftId)
            .select('id, protocolo')
            .single();
          if (!error) { data = updateResult; break; }
          if (error.code === '23505' && error.message?.includes('protocolo')) {
            logger.warn(`[SUBMIT][RETRY] Conflito de protocolo (rascunho) ${attempt}/${maxRetries}`);
            lastError = error;
            if (attempt < maxRetries) await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
            continue;
          }
          throw error;
        }
        const { data: insertResult, error } = await supabase
          .from('solicitacoes')
          .insert(insertData as any)
          .select('id, protocolo')
          .single();

        if (!error) { data = insertResult; break; }

        if (error.code === '23505' && error.message?.includes('protocolo')) {
          logger.warn(`[SUBMIT][RETRY] Conflito de protocolo na tentativa ${attempt}/${maxRetries}:`, error.message);
          lastError = error;
          if (attempt < maxRetries) await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
          continue;
        }
        throw error;
      }

      if (!data) throw lastError || new Error('Não foi possível criar a solicitação. Tente novamente.');

      // Upload attachments with retry
      try {
        await uploadAnexos(data.id);
      } catch (anexoError: any) {
        console.error('[SUBMIT] Erro ao enviar anexos, retentando...', anexoError);
        // Retry once
        try {
          await uploadAnexos(data.id);
        } catch (retryError) {
          console.error('[SUBMIT] Falha no retry de anexos:', retryError);
          // Solicitação criada mas anexos falharam — manter usuário na tela com retry manual.
          // Não limpar o draft: anexos continuam no estado.
          setPendingAnexosFor({ id: data.id, protocolo: data.protocolo });
          toast({
            title: 'Falha ao enviar anexos',
            description: `Protocolo ${data.protocolo} criado. Clique em "Reenviar anexos" abaixo para concluir.`,
            variant: 'destructive',
            duration: 12000,
          });
          track('submit_failed', { reason: 'upload_failed', protocolo: data.protocolo }, '/nova-solicitacao');
          return;
        }
      }

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: data.id,
        user_id: user.id, // historico is who actually performed the action
        acao: 'criacao',
        status_novo: 'recebido',
      });

      const { data: userProfile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();

      try {
        await notifyBackofficeNewSolicitacao({
          protocolo: data.protocolo,
          descricao: formState.descricao.substring(0, 200),
          valor: derived.valorNumerico,
          empreendimento: EMPREENDIMENTO_LABELS[formState.empreendimento as Empreendimento],
          solicitacao_id: data.id,
          solicitante_nome: userProfile?.full_name || userProfile?.email || 'Solicitante',
          solicitante_email: userProfile?.email || undefined,
        });
      } catch (emailError) {
        console.error('[EMAIL] Erro ao enviar notificação:', emailError);
      }

      // Notify Google Chat spaces (nova entrada)
      try {
        await supabase.functions.invoke('gchat-notify-oc', {
          body: {
            tipo: 'nova_entrada',
            protocolo: data.protocolo,
            descricao: formState.descricao.substring(0, 200),
            valor: derived.valorNumerico,
            empreendimento: formState.empreendimento,
            solicitacao_id: data.id,
          },
        });
      } catch (gchatError) {
        console.error('[GCHAT] Erro ao notificar nova entrada:', gchatError);
      }

      clearDraft();
      toast({ title: 'Solicitação criada!', description: `Protocolo: ${data.protocolo}` });
      track('submit_success', { protocolo: data.protocolo, empreendimento: formState.empreendimento }, '/nova-solicitacao');
      navigate(`/minhas-solicitacoes?created=${data.protocolo}`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro desconhecido';
      const errorCode = error?.code || 'N/A';
      console.error('[SUBMIT] Erro ao criar solicitação:', { message: errorMessage, code: errorCode });
      const userMessage = errorCode === '23505' && errorMessage?.includes('protocolo')
        ? 'Conflito ao gerar número de protocolo. Por favor, tente novamente em alguns segundos.'
        : errorMessage;
      toast({ title: 'Erro ao criar solicitação', description: userMessage, variant: 'destructive' });
      errorCooldown = true;
    } finally {
      if (errorCooldown) {
        // Anti-spam cooldown: keep button disabled briefly after error
        setTimeout(() => {
          setSubmitting(false);
          isSubmittingRef.current = false;
        }, 800);
      } else {
        setSubmitting(false);
        isSubmittingRef.current = false;
      }
    }
  };

  const stepProps = { formState, derived, setters };

  // Persona label for the hero badge
  const personaLabel = (() => {
    if (effectiveRoles?.includes('admin')) return { label: 'Admin', icon: ShieldCheck };
    if (effectiveRoles?.includes('backoffice')) return { label: 'Backoffice', icon: ShieldCheck };
    return { label: 'Solicitante', icon: UserIcon };
  })();

  // First inline error message (used by FormNavigation tooltip)
  const firstErrorMessage = Object.values(stepErrors).find(Boolean) ?? null;
  const hasStepErrors = Object.keys(stepErrors).length > 0;

  // Steps with icons for the StepIndicator
  const stepIcons: Record<Step, any> = {
    empreendimento: Building2,
    descricao: FileText,
    tipo: Tag,
    natureza_servico: Sparkles,
    detalhes: Settings,
    fornecedor: Truck,
    anexos: Paperclip,
    revisao: Send,
  };

  return (
    <>
      <PageContainer width="default">
      <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
        <PageHeader
          icon={Send}
          title="Nova Solicitação"
          description="Wizard guiado · validações em tempo real · classificação automática AC/OC"
          actions={
            <>
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground/70">
                <personaLabel.icon className="h-3 w-3" />
                {personaLabel.label}
              </span>
              {derived.valorNumerico > 0 && (
                <FluxoBadge formState={formState} derived={derived} compact />
              )}
              {hasDraft && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearDraft();
                    resetForm();
                    toast({ title: 'Rascunho limpo', description: 'O formulário foi reiniciado.' });
                  }}
                  className="text-muted-foreground hover:text-destructive h-8"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Limpar rascunho
                </Button>
              )}
            </>
          }
        />

        <StepIndicator
          steps={visibleSteps.map(s => ({ id: s.id, label: s.label, icon: stepIcons[s.id] })) as StepIndicatorStep[]}
          currentStepIndex={currentIndex}
          onStepClick={(index) => {
            // Allow jumping to any step that is either before current OR currently invalid
            const target = visibleSteps[index];
            if (!target) return;
            if (index < currentIndex || invalidStepIds.includes(target.id)) {
              setCurrentStep(target.id);
            }
          }}
          showTimeEstimate
          draftSaved={hasDraft}
          lastSavedAt={lastSavedAt}
          invalidStepIds={invalidStepIds}
        />

        {pendingAnexosFor && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3 flex-wrap">
              <span>
                <span className="font-medium">Solicitação {pendingAnexosFor.protocolo} criada</span>, mas alguns
                anexos não foram enviados. Tente novamente para concluir.
              </span>
              <Button size="sm" variant="default" onClick={retryPendingAnexos} disabled={submitting}>
                {submitting ? 'Reenviando…' : 'Reenviar anexos'}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {restoredWithoutAnexos && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Reanexar arquivos:</span> seu rascunho foi restaurado, mas
              os arquivos não ficam salvos no navegador. Reenvie os anexos obrigatórios para concluir.
            </AlertDescription>
          </Alert>
        )}

        {justRestored && (
          <Alert className="bg-primary/5 border-primary/30 animate-fade-in">
            <History className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm">
                <span className="font-medium">Rascunho restaurado.</span>{' '}
                Continuamos de onde você parou.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearDraft();
                    resetForm();
                    dismissRestoredBanner();
                  }}
                  className="h-7 text-xs"
                >
                  Começar do zero
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={dismissRestoredBanner}
                  className="h-7 w-7"
                  aria-label="Dispensar"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card className="ring-1 ring-border/40 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="ds-text-h3">{visibleSteps[currentIndex]?.label}</CardTitle>
              {visibleSteps[currentIndex]?.description && (
                <CardDescription className="ds-text-body text-muted-foreground">
                  {visibleSteps[currentIndex]?.description}
                </CardDescription>
              )}
              {currentStep === 'fornecedor' && derived.requires3CNPJs && (
                <CardDescription className="text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  AC de serviços requer 3 fornecedores
                </CardDescription>
              )}
            </div>
            {currentStep !== 'descricao' && currentStep !== 'empreendimento' && derived.valorNumerico > 0 && (
              <FluxoBadge formState={formState} derived={derived} compact className="hidden sm:inline-flex" />
            )}
          </CardHeader>
          <CardContent className="space-y-4" ref={stepContainerRef}>
            <div key={currentStep} className="animate-fade-in motion-reduce:animate-none">
            {currentStep === 'empreendimento' && (
              <>
                {loadingEmpreendimentos ? (
                  <div
                    className="space-y-2"
                    role="status"
                    aria-live="polite"
                    aria-label="Carregando empreendimentos"
                  >
                    <Skeleton className="h-12 w-full ds-skeleton-shimmer" />
                    <Skeleton className="h-12 w-full ds-skeleton-shimmer" />
                    <Skeleton className="h-12 w-full ds-skeleton-shimmer" />
                  </div>
                ) : (
                  <EmpreendimentoStep {...stepProps} allowedEmpreendimentos={allowedEmpreendimentos} loadingEmpreendimentos={false} />
                )}
                {showErrors && <FieldError message={stepErrors.empreendimento} />}
              </>
            )}
            {currentStep === 'descricao' && (
              <>
                <DescricaoStep {...stepProps} isValidatingDescription={isValidatingDescription} descriptionValidation={descriptionValidation} formatCurrency={formatCurrency} />
                {(showErrors || formState.descricao.length > 0) && (
                  <>
                    <FieldError message={stepErrors.descricao} />
                  </>
                )}
                {(showErrors || derived.valorNumerico > 0 || formState.valor.length > 0) && (
                  <>
                    <FieldError message={stepErrors.valor} />
                  </>
                )}
              </>
            )}
            {currentStep === 'tipo' && (
              <>
                <TipoStep {...stepProps} />
                {showErrors && <FieldError message={stepErrors.tipoContratacao} />}
              </>
            )}
            {currentStep === 'natureza_servico' && (
              <>
                <NaturezaServicoStep
                  valorNumerico={derived.valorNumerico}
                  obraCivil={formState.naturezaObraCivil}
                  alturaRisco={formState.naturezaAlturaRisco}
                  fossaFiltro={formState.naturezaFossaFiltro}
                  precoVariavel={formState.naturezaPrecoVariavel}
                  nenhumaOpcao={formState.nenhumaOpcaoNatureza}
                  onObraCivilChange={setters.setNaturezaObraCivil}
                  onAlturaRiscoChange={setters.setNaturezaAlturaRisco}
                  onFossaFiltroChange={setters.setNaturezaFossaFiltro}
                  onPrecoVariavelChange={setters.setNaturezaPrecoVariavel}
                  onNenhumaOpcaoChange={setters.setNenhumaOpcaoNatureza}
                />
                {showErrors && <FieldError message={stepErrors.naturezaServico} />}
              </>
            )}
            {currentStep === 'detalhes' && (
              <>
                <DetalhesStep {...stepProps} formatCurrency={formatCurrency} handleContratoMensalChange={handleContratoMensalChange} />
                {showErrors && (
                  <div className="space-y-1">
                    <FieldError message={stepErrors.naturezaOrcamentaria} />
                    <FieldError message={stepErrors.clienteId} />
                    <FieldError message={stepErrors.faturamentoDireto} />
                    <FieldError message={stepErrors.escopoDetalhadoMinuta} />
                    <FieldError message={stepErrors.dueDiligenceConfirmada} />
                    <FieldError message={stepErrors.rateio} />
                  </div>
                )}
              </>
            )}
            {currentStep === 'fornecedor' && (
              <>
                <FornecedorStep {...stepProps} />
                {showErrors && (
                  <div className="space-y-1">
                    <FieldError message={stepErrors.fornecedor} />
                    <FieldError message={stepErrors.justificativaExclusividade} />
                    <FieldError message={stepErrors.fornecedorConcorrente1} />
                    <FieldError message={stepErrors.fornecedorConcorrente2} />
                    <FieldError message={stepErrors.justificativaFornecedores} />
                  </div>
                )}
              </>
            )}
            {currentStep === 'anexos' && (
              <>
                <AnexosStep {...stepProps} getRequiredAttachments={getRequiredAttachments} />
                {showErrors && (
                  <div className="space-y-1">
                    <FieldError message={stepErrors.anexos} />
                    <FieldError message={stepErrors.justificativaSemMemorial} />
                  </div>
                )}
              </>
            )}
            {currentStep === 'revisao' && <RevisaoStep {...stepProps} formatCurrency={formatCurrency} />}
            </div>
          </CardContent>
        </Card>

        {/* Keyboard shortcut hint (desktop only) */}
        <div className="hidden lg:flex items-center justify-end gap-2 ds-text-caption">
          <Command className="h-3 w-3" aria-hidden="true" />
          <span>
            Use{' '}
            <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px] shadow-sm">Ctrl</kbd>{' '}
            +{' '}
            <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px] shadow-sm">←</kbd>
            /
            <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px] shadow-sm">→</kbd>{' '}
            para navegar
          </span>
        </div>

        <div className="h-20 sm:hidden" />

        <FormNavigation
          currentStep={currentStep}
          visibleSteps={visibleSteps}
          currentIndex={currentIndex}
          submitting={submitting}
          canProceed={true}
          canSubmit={canSubmit}
          firstInvalidStepLabel={firstInvalidStepLabel}
          firstErrorMessage={firstErrorMessage}
          hasStepErrors={hasStepErrors}
          onNext={goNext}
          onBack={goBack}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          canSaveDraft={canSaveDraft}
          savingDraft={savingDraft}
          draftButtonLabel={draftId ? 'Atualizar Rascunho' : 'Salvar Rascunho'}
        />
        </div>

        {/* Persistent summary sidebar (desktop only) */}
        <aside className="hidden lg:block" aria-label="Resumo da solicitação">
          <FormSummarySidebar
            formState={formState}
            derived={derived}
            currentStepIndex={currentIndex}
            totalSteps={visibleSteps.length}
            onJumpToStep={(targetId) => {
              const target = visibleSteps.find((s) => s.id === targetId);
              if (!target) return;
              const targetIndex = visibleSteps.findIndex((s) => s.id === targetId);
              if (targetIndex < currentIndex || invalidStepIds.includes(targetId)) {
                setCurrentStep(targetId);
              }
            }}
          />
        </aside>
      </div>
      </PageContainer>
    </>
  );
}
