import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'nova_solicitacao_draft';
const DEBOUNCE_MS = 500;

export interface FormDraft {
  currentStep: string;
  empreendimento: string;
  descricao: string;
  valor: string;
  tipoContratacao: string;
  naturezaOrcamentaria: string;
  origemCusto: string;
  dataInicio: string;
  dataFim: string;
  parcelas: string;
  contratoMensal: boolean;
  faturamentoDireto: boolean;
  valorServico: string;
  valorMaterial: string;
  retencao6: boolean;
  tipoGarantia: string;
  diasGarantia: string;
  diasGarantiaServico: string;
  diasGarantiaProduto: string;
  custoCliente: boolean;
  emergencial: boolean;
  clienteId: string | null;
  excecaoFornecedores: boolean;
  justificativaFornecedores: string;
  temChamadoInfraspeak: boolean;
  chamadoCorretiva: boolean;
  semMemorial: boolean;
  justificativaSemMemorial: string;
  // Fornecedores são objetos complexos, salvamos apenas os IDs
  fornecedorId: string | null;
  fornecedorConcorrente1Id: string | null;
  fornecedorConcorrente2Id: string | null;
  // Novos campos do fluxo jurídico
  naturezaObraCivil: boolean;
  naturezaAlturaRisco: boolean;
  naturezaFossaFiltro: boolean;
  naturezaPrecoVariavel: boolean;
  nenhumaOpcaoNatureza: boolean;
  escopoDetalhadoMinuta: string;
  dueDiligenceConfirmada: boolean;
  dueDiligenceNumeroProjuris: string;
  temProcessoProjuris: boolean;
  savedAt: number;
}

export function useFormPersistence() {
  const [hasDraft, setHasDraft] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if there's a saved draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved) as FormDraft;
        // Check if draft is less than 24 hours old
        const isRecent = Date.now() - draft.savedAt < 24 * 60 * 60 * 1000;
        setHasDraft(isRecent);
        if (!isRecent) {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const saveDraft = useCallback((draft: Omit<FormDraft, 'savedAt'>) => {
    // Debounce the save to avoid too many writes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const draftWithTimestamp: FormDraft = {
        ...draft,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftWithTimestamp));
      setHasDraft(true);
    }, DEBOUNCE_MS);
  }, []);

  const loadDraft = useCallback((): FormDraft | null => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    try {
      const draft = JSON.parse(saved) as FormDraft;
      // Check if draft is less than 24 hours old
      const isRecent = Date.now() - draft.savedAt < 24 * 60 * 60 * 1000;
      if (!isRecent) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return draft;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    localStorage.removeItem(STORAGE_KEY);
    setHasDraft(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    hasDraft,
    saveDraft,
    loadDraft,
    clearDraft,
  };
}
