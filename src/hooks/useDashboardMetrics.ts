import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import type { RequestStatus, Empreendimento } from '@/types';

interface StatusCount {
  status: RequestStatus;
  count: number;
}

interface RecentSolicitacao {
  id: string;
  protocolo: string;
  descricao: string;
  valor: number;
  status: RequestStatus;
  tipo: 'AC' | 'OC';
  empreendimento: Empreendimento;
  created_at: string;
  fornecedor_nome: string | null;
}

interface DashboardMetrics {
  total: number;
  pendingActions: number;
  pendingCorrections: number;
  pendingAcceptance: number;
  pendingNfBoleto: number;
  pendingInfoRequests: number;
  inProgress: number;
  concluded: number;
  recentSolicitacoes: RecentSolicitacao[];
  statusCounts: StatusCount[];
  isLoading: boolean;
}

type ViewMode = 'minhas' | 'geral';

export function useDashboardMetrics(viewMode: ViewMode = 'minhas'): DashboardMetrics {
  const { user, isBackofficeOrAdmin } = useAuth();
  const { empreendimentos, loading: loadingEmp, hasAllAccess } = useUserEmpreendimentos(user?.id);

  const isGeralMode = viewMode === 'geral' && (isBackofficeOrAdmin || empreendimentos.length > 0);

  const { data: solicitacoes, isLoading: loadingSol } = useQuery({
    queryKey: ['dashboard-user-solicitacoes', user?.id, viewMode, isBackofficeOrAdmin, empreendimentos],
    queryFn: async () => {
      let query = supabase
        .from('solicitacoes')
        .select('id, protocolo, descricao, valor, status, tipo, empreendimento, created_at, fornecedor:fornecedores(razao_social, nome_fantasia)')
        .order('created_at', { ascending: false });

      if (isGeralMode) {
        if (isBackofficeOrAdmin || hasAllAccess) {
          // No user_id filter — fetch all
        } else if (empreendimentos.length > 0) {
          query = query.in('empreendimento', empreendimentos);
        }
      } else {
        query = query.eq('user_id', user!.id);
      }

      // Limit to 1000 to avoid Supabase default cap issues
      query = query.limit(1000);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !loadingEmp,
    staleTime: 30_000, // 30s stale time to avoid excessive refetches
  });

  const allSol = solicitacoes || [];

  // Count by status
  const statusCounts: StatusCount[] = [];
  const statusMap = new Map<RequestStatus, number>();
  allSol.forEach(s => {
    statusMap.set(s.status as RequestStatus, (statusMap.get(s.status as RequestStatus) || 0) + 1);
  });
  statusMap.forEach((count, status) => {
    statusCounts.push({ status, count });
  });

  // Pending actions
  const pendingCorrections = allSol.filter(s => s.status === 'pendente_correcao').length;
  const pendingAcceptance = allSol.filter(s => s.status === 'aguardando_aceite').length;
  const pendingNfBoleto = allSol.filter(s => s.status === 'aguardando_nf_boleto').length;
  const pendingInfoRequests = allSol.filter(s => s.status === 'aguardando_informacoes').length;

  // In progress statuses
  const inProgressStatuses: RequestStatus[] = ['recebido', 'em_analise', 'em_processamento', 'aprovado', 'liberado_fornecedor', 'enviado_fornecedor'];
  const inProgress = allSol.filter(s => inProgressStatuses.includes(s.status as RequestStatus)).length;

  const concluded = allSol.filter(s => s.status === 'concluida').length;

  // Recent 5
  const recentSolicitacoes: RecentSolicitacao[] = allSol.slice(0, 5).map(s => {
    const forn = s.fornecedor as any;
    return {
      id: s.id,
      protocolo: s.protocolo || '',
      descricao: s.descricao,
      valor: s.valor,
      status: s.status as RequestStatus,
      tipo: s.tipo as 'AC' | 'OC',
      empreendimento: s.empreendimento as Empreendimento,
      created_at: s.created_at,
      fornecedor_nome: forn?.nome_fantasia || forn?.razao_social || null,
    };
  });

  return {
    total: allSol.length,
    pendingActions: pendingCorrections + pendingAcceptance + pendingNfBoleto + pendingInfoRequests,
    pendingCorrections,
    pendingAcceptance,
    pendingNfBoleto,
    pendingInfoRequests,
    inProgress,
    concluded,
    recentSolicitacoes,
    statusCounts,
    isLoading: loadingSol || loadingEmp,
  };
}
