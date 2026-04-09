import { useRef } from 'react';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  EMPREENDIMENTO_LABELS,
  type Empreendimento,
} from '@/types';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { notifyBackofficeNewSolicitacao } from '@/hooks/useNotificationEmail';
import { StepIndicator, type Step as StepIndicatorStep } from '@/components/StepIndicator';
import { NaturezaServicoStep } from '@/components/NaturezaServicoStep';
import { useNovaSolicitacaoForm } from '@/hooks/useNovaSolicitacaoForm';
import type { Step, StepDefinition } from '@/components/nova-solicitacao/types';

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
  const { user, effectiveProfile } = useAuth();
  const track = useTrackEvent();
  const { toast } = useToast();
  const navigate = useNavigate();
  const effectiveUserId = effectiveProfile?.id ?? user?.id;

  const form = useNovaSolicitacaoForm(effectiveUserId);
  const {
    formState, derived, setters,
    currentStep, setCurrentStep, submitting, setSubmitting,
    allowedEmpreendimentos, loadingEmpreendimentos,
    hasDraft, clearDraft,
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

  // canProceed logic
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'empreendimento': return !!formState.empreendimento;
      case 'descricao': return !!formState.descricao && derived.valorNumerico > 0;
      case 'tipo': return derived.valorNumerico <= 1000 || !!formState.tipoContratacao;
      case 'natureza_servico': return true;
      case 'detalhes': {
        if (!formState.naturezaOrcamentaria) return false;
        if (formState.origemCusto === 'cliente' && !formState.clienteId) return false;
        if (formState.faturamentoDireto) {
          const sum = derived.valorServicoNumerico + derived.valorMaterialNumerico;
          if (Math.abs(sum - derived.valorNumerico) > 0.01) return false;
        }
        if (derived.requerEscopoDetalhado && formState.escopoDetalhadoMinuta.length < 100) return false;
        if (derived.requerDueDiligence && !formState.dueDiligenceConfirmada) return false;
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

  const goNext = () => {
    if (currentIndex < visibleSteps.length - 1) {
      const nextStep = visibleSteps[currentIndex + 1];
      track('step_viewed', { step: nextStep.id, index: currentIndex + 1 }, '/nova-solicitacao');
      setCurrentStep(nextStep.id);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) setCurrentStep(visibleSteps[currentIndex - 1].id);
  };

  // Upload attachments
  const uploadAnexos = async (solicitacaoId: string) => {
    const uploadPromises = Object.entries(formState.anexos)
      .filter(([_, file]) => file !== null)
      .map(async ([tipo, uploadedFile]) => {
        if (!uploadedFile) return;
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
      });

    const outrosPromises = formState.outrosAnexos.map(async (uploadedFile, index) => {
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
    });

    await Promise.all([...uploadPromises, ...outrosPromises]);
  };

  // Submit
  const isSubmittingRef = useRef(false);

  const handleSubmit = async () => {
    if (isSubmittingRef.current || submitting) return;
    if (!user || !formState.empreendimento || !formState.naturezaOrcamentaria || !formState.fornecedor) return;
    
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
        return;
      }

      const insertData = {
        user_id: user.id,
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
        const { data: insertResult, error } = await supabase
          .from('solicitacoes')
          .insert(insertData as any)
          .select('id, protocolo')
          .single();

        if (!error) { data = insertResult; break; }

        if (error.code === '23505' && error.message?.includes('protocolo')) {
          console.warn(`[SUBMIT][RETRY] Conflito de protocolo na tentativa ${attempt}/${maxRetries}:`, error.message);
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
          // Solicitação criada mas anexos falharam — notificar o usuário
          toast({
            title: 'Solicitação criada com pendência',
            description: `Protocolo: ${data.protocolo}. Alguns anexos podem não ter sido enviados. Entre em contato com o backoffice.`,
            variant: 'destructive',
            duration: 10000,
          });
          clearDraft();
          navigate(`/minhas-solicitacoes?created=${data.protocolo}`);
          return;
        }
      }

      await supabase.from('historico_solicitacoes').insert({ solicitacao_id: data.id, user_id: user.id, acao: 'criacao', status_novo: 'recebido' });

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
      navigate(`/minhas-solicitacoes?created=${data.protocolo}`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro desconhecido';
      const errorCode = error?.code || 'N/A';
      console.error('[SUBMIT] Erro ao criar solicitação:', { message: errorMessage, code: errorCode });
      const userMessage = errorCode === '23505' && errorMessage?.includes('protocolo')
        ? 'Conflito ao gerar número de protocolo. Por favor, tente novamente em alguns segundos.'
        : errorMessage;
      toast({ title: 'Erro ao criar solicitação', description: userMessage, variant: 'destructive' });
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const stepProps = { formState, derived, setters };

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Nova Solicitação</h1>
          <p className="text-muted-foreground">Preencha os dados para criar uma solicitação</p>
        </div>

        <StepIndicator
          steps={visibleSteps.map(s => ({ id: s.id, label: s.label })) as StepIndicatorStep[]}
          currentStepIndex={currentIndex}
          onStepClick={(index) => { if (index < currentIndex) setCurrentStep(visibleSteps[index].id); }}
          showTimeEstimate
          draftSaved={hasDraft}
        />

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>{visibleSteps[currentIndex]?.label}</CardTitle>
              {currentStep === 'fornecedor' && derived.requires3CNPJs && (
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
                  resetForm();
                  toast({ title: 'Rascunho limpo', description: 'O formulário foi reiniciado.' });
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
              <EmpreendimentoStep {...stepProps} allowedEmpreendimentos={allowedEmpreendimentos} loadingEmpreendimentos={loadingEmpreendimentos} />
            )}
            {currentStep === 'descricao' && (
              <DescricaoStep {...stepProps} isValidatingDescription={isValidatingDescription} descriptionValidation={descriptionValidation} formatCurrency={formatCurrency} />
            )}
            {currentStep === 'tipo' && <TipoStep {...stepProps} />}
            {currentStep === 'natureza_servico' && (
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
            )}
            {currentStep === 'detalhes' && (
              <DetalhesStep {...stepProps} formatCurrency={formatCurrency} handleContratoMensalChange={handleContratoMensalChange} />
            )}
            {currentStep === 'fornecedor' && <FornecedorStep {...stepProps} />}
            {currentStep === 'anexos' && <AnexosStep {...stepProps} getRequiredAttachments={getRequiredAttachments} />}
            {currentStep === 'revisao' && <RevisaoStep {...stepProps} formatCurrency={formatCurrency} />}
          </CardContent>
        </Card>

        <div className="h-20 sm:hidden" />

        <FormNavigation
          currentStep={currentStep}
          visibleSteps={visibleSteps}
          currentIndex={currentIndex}
          submitting={submitting}
          canProceed={canProceed()}
          onNext={goNext}
          onBack={goBack}
          onSubmit={handleSubmit}
        />
      </div>
    </>
  );
}
