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
        p_limit: options.limit || 500,
        p_offset: options.offset || 0,
      });

      if (rpcError) throw rpcError;

      // Fetch responsavel info for each solicitacao (batch by unique ids)
      const solicitacoesWithResponsavel = await enrichWithResponsavelInfo(data || []);
      
      setSolicitacoes(solicitacoesWithResponsavel);
    } catch (err) {
      console.error('Error fetching solicitacoes:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch solicitacoes'));
    } finally {
      setLoading(false);
    }
  }, [options.status, options.empreendimento, options.search, options.limit, options.offset]);

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

// Helper to batch fetch responsavel info
async function enrichWithResponsavelInfo(
  solicitacoes: SolicitacaoBackoffice[]
): Promise<SolicitacaoBackoffice[]> {
  if (solicitacoes.length === 0) return [];

  // Fetch all approval history in one query
  const solIds = solicitacoes.map(s => s.id);
  
  const { data: histData } = await supabase
    .from('historico_solicitacoes')
    .select('solicitacao_id, created_at, user_id')
    .in('solicitacao_id', solIds)
    .eq('status_novo', 'aprovado')
    .order('created_at', { ascending: false });

  // Create a map of solicitacao_id to first approval
  const approvalMap = new Map<string, { created_at: string; user_id: string }>();
  histData?.forEach(h => {
    if (!approvalMap.has(h.solicitacao_id)) {
      approvalMap.set(h.solicitacao_id, { created_at: h.created_at, user_id: h.user_id });
    }
  });

  // Get unique user ids
  const userIds = [...new Set(histData?.map(h => h.user_id) || [])];
  
  // Fetch all profiles in one query
  const profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    
    profiles?.forEach(p => {
      profileMap.set(p.id, p.full_name || p.email || 'Usuário');
    });
  }

  // Enrich solicitacoes
  return solicitacoes.map(sol => {
    const approval = approvalMap.get(sol.id);
    return {
      ...sol,
      dataAprovacao: approval?.created_at || null,
      responsavelId: approval?.user_id || null,
      responsavelNome: approval ? profileMap.get(approval.user_id) || null : null,
    };
  });
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
