import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type RequestStatus, type Empreendimento } from '@/types';

export interface SolicitacaoBackoffice {
  id: string;
  protocolo: string;
  tipo: string;
  status: RequestStatus;
  empreendimento: Empreendimento;
  valor: number;
  created_at: string;
  updated_at: string;
  descricao: string;
  emergencial: boolean;
  numero_chamado_fluig: string | null;
  numero_projuris: string | null;
  fornecedor_cnpj: string | null;
  fornecedor_razao: string | null;
  solicitante_nome: string | null;
  solicitante_email: string | null;
  cliente_nome: string | null;
  total_anexos: number;
  total_docs_fiscais: number;
  total_docs_emitidos: number;
  ultima_atualizacao_status: string | null;
  data_pendente_correcao: string | null;
  fornecedor_email_contato: string | null;
  fornecedor_telefone_contato: string | null;
  data_execucao_servico?: string | null;
  // Computed fields
  responsavelId?: string | null;
  responsavelNome?: string | null;
  dataAprovacao?: string | null;
}

interface UseBackofficeSolicitacoesOptions {
  status?: RequestStatus;
  empreendimento?: Empreendimento;
  search?: string;
  limit?: number;
  offset?: number;
  responsavelId?: string;
}

export function useBackofficeSolicitacoes(options: UseBackofficeSolicitacoesOptions = {}) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoBackoffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSolicitacoes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_solicitacoes_backoffice', {
        p_status: options.status || null,
        p_empreendimento: options.empreendimento || null,
        p_search: options.search || null,
        p_limit: options.limit || 100,
        p_offset: options.offset || 0,
        p_responsavel_id: options.responsavelId || null,
      });

      if (rpcError) throw rpcError;

      setSolicitacoes((data || []).map((item) => ({
        ...item,
        responsavelId: item.responsavel_id,
        responsavelNome: item.responsavel_nome,
        dataAprovacao: item.data_aprovacao,
      })));
    } catch (err) {
      console.error('Error fetching solicitacoes:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch solicitacoes'));
    } finally {
      setLoading(false);
    }
  }, [options.status, options.empreendimento, options.search, options.limit, options.offset, options.responsavelId]);

  useEffect(() => {
    fetchSolicitacoes();
  }, [fetchSolicitacoes]);

  return {
    solicitacoes,
    loading,
    error,
    refetch: fetchSolicitacoes,
  };
}

// Hook for counts by status
export function useBackofficeCounts() {
  const [counts, setCounts] = useState<Record<RequestStatus, number>>({} as Record<RequestStatus, number>);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      const { data, error } = await supabase.rpc('get_solicitacoes_count_by_status');
      
      if (!error && data) {
        const countMap = {} as Record<RequestStatus, number>;
        data.forEach((item: { status: RequestStatus; count: number }) => {
          countMap[item.status] = Number(item.count);
        });
        setCounts(countMap);
      }
      setLoading(false);
    }

    fetchCounts();
  }, []);

  return { counts, loading };
}
