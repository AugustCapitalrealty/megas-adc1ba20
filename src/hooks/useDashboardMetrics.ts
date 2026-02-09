import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  inProgress: number;
  concluded: number;
  recentSolicitacoes: RecentSolicitacao[];
  statusCounts: StatusCount[];
  isLoading: boolean;
}

export function useDashboardMetrics(): DashboardMetrics {
  const { user } = useAuth();

  // Fetch user's solicitations count by status
  const { data: solicitacoes, isLoading: loadingSol } = useQuery({
    queryKey: ['dashboard-user-solicitacoes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes')
        .select('id, protocolo, descricao, valor, status, tipo, empreendimento, created_at, fornecedor:fornecedores(razao_social, nome_fantasia)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
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

  // Pending actions (user-facing)
  const pendingCorrections = allSol.filter(s => s.status === 'pendente_correcao').length;
  const pendingAcceptance = allSol.filter(s => s.status === 'oc_ac_emitida' || s.status === 'aguardando_aceite').length;
  const pendingNfBoleto = allSol.filter(s => s.status === 'aguardando_nf_boleto').length;

  // In progress statuses
  const inProgressStatuses: RequestStatus[] = ['recebido', 'em_analise', 'em_processamento', 'aprovado', 'liberado_fornecedor', 'enviado_fornecedor', 'aguardando_informacoes'];
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
    pendingActions: pendingCorrections + pendingAcceptance + pendingNfBoleto,
    pendingCorrections,
    pendingAcceptance,
    pendingNfBoleto,
    inProgress,
    concluded,
    recentSolicitacoes,
    statusCounts,
    isLoading: loadingSol,
  };
}
