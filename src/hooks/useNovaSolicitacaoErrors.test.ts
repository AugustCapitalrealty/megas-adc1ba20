import { describe, it, expect } from 'vitest';
import { computeStepErrors } from './useNovaSolicitacaoErrors';
import type { FormState, DerivedValues } from '@/components/nova-solicitacao/types';

// Helper para montar FormState/Derived mínimos para a etapa 'anexos'.
function baseFormState(overrides: Partial<FormState> = {}): FormState {
  return {
    empreendimento: 'mega_canoas' as any,
    descricao: 'descrição suficientemente longa para passar nas regras',
    valor: '50000',
    tipoContratacao: '',
    naturezaOrcamentaria: 'manutencao_imoveis' as any,
    origemCusto: 'empreendimento',
    dataInicio: '',
    dataFim: '',
    parcelas: '1',
    contratoMensal: false,
    faturamentoDireto: false,
    valorServico: '',
    valorMaterial: '',
    retencao6: false,
    tipoGarantia: 'nenhuma',
    diasGarantia: '',
    diasGarantiaServico: '',
    diasGarantiaProduto: '',
    custoCliente: false,
    emergencial: false,
    fornecedor: null,
    fornecedorConcorrente1: null,
    fornecedorConcorrente2: null,
    clienteId: null,
    clienteNome: '',
    excecaoFornecedores: false,
    justificativaFornecedores: '',
    fornecimentoExclusivo: false,
    justificativaExclusividade: '',
    temChamadoInfraspeak: false,
    chamadoCorretiva: false,
    semMemorial: false,
    justificativaSemMemorial: '',
    naturezaObraCivil: false,
    naturezaAlturaRisco: false,
    naturezaFossaFiltro: false,
    naturezaPrecoVariavel: false,
    nenhumaOpcaoNatureza: false,
    escopoDetalhadoMinuta: '',
    dueDiligenceConfirmada: false,
    dueDiligenceNumeroProjuris: '',
    temProcessoProjuris: false,
    tipoRateio: 'por_area',
    rateioValores: [],
    rateioEmpreendimentosSelecionados: [],
    anexos: {},
    outrosAnexos: [],
    ...overrides,
  };
}

const derived: DerivedValues = {
  valorNumerico: 500,
  valorServicoNumerico: 0,
  valorMaterialNumerico: 0,
  isOC: true,
  isAC: false,
  isOCAbove1000: false,
  showEmergencial: false,
  showNaturezaServicoStep: false,
  requerFluxoJuridico: false,
  instrumentoJuridico: 'oc',
  requerEscopoDetalhado: false,
  requerDueDiligence: false,
  requires3CNPJs: false,
};

const required = [
  { tipo: 'proposta', label: 'Proposta', required: true },
];

describe('computeStepErrors — etapa anexos', () => {
  it('reporta erro quando não há anexo nenhum', () => {
    const errors = computeStepErrors('anexos', baseFormState(), derived, required);
    expect(errors.anexos).toBeTruthy();
    expect(errors.anexos).toContain('Proposta');
  });

  it('aceita anexo novo no formState', () => {
    const fs = baseFormState({
      anexos: { proposta: { file: new File([''], 'p.pdf') } as any },
    });
    const errors = computeStepErrors('anexos', fs, derived, required);
    expect(errors.anexos).toBeUndefined();
  });

  it('aceita anexo persistido no servidor (Set)', () => {
    const persisted = new Set(['proposta']);
    const errors = computeStepErrors('anexos', baseFormState(), derived, required, persisted);
    expect(errors.anexos).toBeUndefined();
  });

  it('mantém validação quando o anexo persistido é de tipo diferente do exigido', () => {
    const persisted = new Set(['outros']);
    const errors = computeStepErrors('anexos', baseFormState(), derived, required, persisted);
    expect(errors.anexos).toBeTruthy();
  });

  it('cenário do bug: valor alterado no formState + anexo persistido continua liberando envio', () => {
    // Usuário reabriu rascunho, editou o valor (mexeu no input), anexo já estava salvo.
    const fs = baseFormState({ valor: '99999' });
    const persisted = new Set(['proposta']);
    const errors = computeStepErrors('anexos', fs, derived, required, persisted);
    expect(errors.anexos).toBeUndefined();
  });

  it('exige justificativa quando "sem memorial" está marcado', () => {
    const fs = baseFormState({ semMemorial: true, justificativaSemMemorial: '   ' });
    const persisted = new Set(['proposta']);
    const errors = computeStepErrors('anexos', fs, derived, required, persisted);
    expect(errors.justificativaSemMemorial).toBeTruthy();
  });
});