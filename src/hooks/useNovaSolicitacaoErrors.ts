import { useMemo } from 'react';
import type { FormState, DerivedValues, Step } from '@/components/nova-solicitacao/types';
import { validarSignatario } from '@/lib/signatarios';

export type FieldErrors = Partial<Record<string, string>>;

/**
 * Computes inline validation errors for the current step.
 * Errors only show after a field has been touched OR after the user attempts to advance.
 */
export function computeStepErrors(
  step: Step,
  formState: FormState,
  derived: DerivedValues,
  attachmentsRequired: { tipo: string; required: boolean; label: string }[],
  persistedAnexoTipos: Set<string> = new Set(),
): FieldErrors {
  const errors: FieldErrors = {};

  switch (step) {
    case 'empreendimento':
      if (!formState.empreendimento) errors.empreendimento = 'Selecione um empreendimento.';
      break;

    case 'descricao':
      if (!formState.descricao.trim()) {
        errors.descricao = 'Descreva o serviço ou material.';
      } else if (formState.descricao.trim().length < 20) {
        errors.descricao = 'Mínimo de 20 caracteres.';
      }
      if (derived.valorNumerico <= 0) errors.valor = 'Informe um valor maior que zero.';
      break;

    case 'tipo':
      if (derived.valorNumerico > 1000 && !formState.tipoContratacao) {
        errors.tipoContratacao = 'Selecione o tipo de contratação.';
      }
      break;

    case 'natureza_servico': {
      // For AC, require an explicit choice (any natureza checkbox OR "nenhuma")
      if (derived.showNaturezaServicoStep) {
        const algumaMarcada =
          formState.naturezaObraCivil ||
          formState.naturezaAlturaRisco ||
          formState.naturezaFossaFiltro ||
          formState.naturezaPrecoVariavel ||
          formState.nenhumaOpcaoNatureza;
        if (!algumaMarcada) {
          errors.naturezaServico = 'Marque pelo menos uma opção (ou "Nenhuma das opções acima").';
        }
      }
      break;
    }

    case 'detalhes': {
      if (!formState.naturezaOrcamentaria) {
        errors.naturezaOrcamentaria = 'Selecione a natureza orçamentária.';
      }
      if (formState.origemCusto === 'cliente' && !formState.clienteId) {
        errors.clienteId = 'Selecione o cliente.';
      }
      if (formState.faturamentoDireto) {
        const sum = derived.valorServicoNumerico + derived.valorMaterialNumerico;
        if (Math.abs(sum - derived.valorNumerico) > 0.01) {
          errors.faturamentoDireto = 'A soma de Serviço + Material deve ser igual ao valor total.';
        }
      }
      if (derived.requerEscopoDetalhado && formState.escopoDetalhadoMinuta.trim().length < 100) {
        errors.escopoDetalhadoMinuta = `O escopo detalhado precisa ter pelo menos 100 caracteres (${formState.escopoDetalhadoMinuta.trim().length}/100).`;
      }
      if (derived.requerDueDiligence && !formState.dueDiligenceConfirmada) {
        errors.dueDiligenceConfirmada = 'Confirme a due diligence para prosseguir.';
      }
      // Garantia: prazo obrigatório sempre que houver tipo de garantia
      if (formState.tipoGarantia === 'servico' || formState.tipoGarantia === 'ambos') {
        const dias = Number(formState.diasGarantiaServico || formState.diasGarantia || 0);
        if (!dias || dias <= 0) errors.diasGarantiaServico = 'Informe os dias de garantia do serviço.';
      }
      if (formState.tipoGarantia === 'produto' || formState.tipoGarantia === 'ambos') {
        const dias = Number(formState.diasGarantiaProduto || formState.diasGarantia || 0);
        if (!dias || dias <= 0) errors.diasGarantiaProduto = 'Informe os dias de garantia do produto.';
      }
      // Signatários (Webdox): obrigatórios quando o instrumento não é OC
      if (derived.instrumentoJuridico !== 'oc') {
        Object.assign(errors, validarSignatario('representanteLegal', {
          nome: formState.representanteLegalNome,
          cpf: formState.representanteLegalCpf,
          email: formState.representanteLegalEmail,
          telefone: formState.representanteLegalTelefone,
        }));
        Object.assign(errors, validarSignatario('testemunha', {
          nome: formState.testemunhaNome,
          cpf: formState.testemunhaCpf,
          email: formState.testemunhaEmail,
          telefone: formState.testemunhaTelefone,
        }));
      }
      // Rateio: required when empreendimento === 'todos'
      if (formState.empreendimento === 'todos') {
        if (!formState.rateioValores || formState.rateioValores.length < 2) {
          errors.rateio = 'Configure o rateio entre pelo menos 2 empreendimentos.';
        } else {
          const somaRateio = formState.rateioValores.reduce(
            (acc, r: any) => acc + (Number(r?.valor) || 0),
            0,
          );
          if (Math.abs(somaRateio - derived.valorNumerico) > 0.01) {
            errors.rateio = `A soma do rateio (${somaRateio.toFixed(2)}) deve ser igual ao valor total (${derived.valorNumerico.toFixed(2)}).`;
          }
        }
      }
      break;
    }

    case 'fornecedor': {
      if (!formState.fornecedor) errors.fornecedor = 'Selecione o fornecedor principal.';
      if (formState.fornecimentoExclusivo && !formState.justificativaExclusividade.trim()) {
        errors.justificativaExclusividade = 'Informe a justificativa de exclusividade.';
      }
      if (derived.requires3CNPJs && !formState.fornecimentoExclusivo) {
        if (formState.excecaoFornecedores && !formState.justificativaFornecedores.trim()) {
          errors.justificativaFornecedores = 'Informe a justificativa para a exceção.';
        }
        if (!formState.excecaoFornecedores) {
          if (!formState.fornecedorConcorrente1) errors.fornecedorConcorrente1 = 'Selecione o concorrente 1.';
          if (!formState.fornecedorConcorrente2) errors.fornecedorConcorrente2 = 'Selecione o concorrente 2.';
        }
      }
      break;
    }

    case 'anexos': {
      const missing = attachmentsRequired.filter(
        (a) => a.required && !formState.anexos[a.tipo] && !persistedAnexoTipos.has(a.tipo),
      );
      if (missing.length > 0) {
        errors.anexos = `Anexos obrigatórios faltando: ${missing.map(a => a.label).join(', ')}.`;
      }
      if (formState.semMemorial && !formState.justificativaSemMemorial.trim()) {
        errors.justificativaSemMemorial = 'Informe a justificativa para a ausência do memorial.';
      }
      break;
    }
  }

  return errors;
}

export function useStepErrors(
  step: Step,
  formState: FormState,
  derived: DerivedValues,
  attachmentsRequired: { tipo: string; required: boolean; label: string }[],
  persistedAnexoTipos: Set<string> = new Set(),
): FieldErrors {
  return useMemo(
    () => computeStepErrors(step, formState, derived, attachmentsRequired, persistedAnexoTipos),
    [step, formState, derived, attachmentsRequired, persistedAnexoTipos],
  );
}