import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import type { RequestStatus, Empreendimento } from '@/types';
import { subDays, startOfDay, format } from 'date-fns';

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

interface TrendData {
  total: number[];
  pending: number[];
  inProgress: number[];
  concluded: number[];
}

interface DashboardMetrics {
  total: number;
  pendingActions: number;
  pendingCorrections: number;
  pendingAcceptance: number;
  pendingNfBoleto: number;
  pendingInfoRequests: number;
  pendingJustificativas: number;
  pendingJustificativasOwn: number;
  inProgress: number;
  concluded: number;
  // Backoffice-specific KPIs
  newInQueue: number;
  inAnalysis: number;
  waitingSolicitor: number;
  inApproval: number;
  recentSolicitacoes: RecentSolicitacao[];
  statusCounts: StatusCount[];
  trend: TrendData;
  isLoading: boolean;
  error: Error | null;
}

type ViewMode = 'minhas' | 'geral';

export function useDashboardMetrics(viewMode: ViewMode = 'minhas', effectiveUserId?: string): DashboardMetrics {
  const { user, isBackofficeOrAdmin } = useAuth();
  const targetUserId = effectiveUserId || user?.id;
  const { empreendimentos, loading: loadingEmp, hasAllAccess } = useUserEmpreendimentos(targetUserId);

  const { data: solicitacoes, isLoading: loadingSol, error } = useQuery({
    queryKey: ['dashboard-user-solicitacoes', user?.id, viewMode, isBackofficeOrAdmin, empreendimentos],
    queryFn: async () => {
      // Compute mode inside queryFn to avoid stale closures
      const isGeralMode = viewMode === 'geral' && (isBackofficeOrAdmin || empreendimentos.length > 0);

      console.log('[DashboardMetrics] Fetching:', { viewMode, isGeralMode, isBackofficeOrAdmin, empreendimentos, userId: user?.id });

      let query = supabase
        .from('solicitacoes')
        .select('id, protocolo, descricao, valor, status, tipo, empreendimento, created_at, fornecedor:fornecedores!solicitacoes_fornecedor_id_fkey(razao_social, nome_fantasia)')
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

      query = query.limit(1000);

      const { data, error } = await query;
      if (error) {
        console.error('[DashboardMetrics] Query error:', error);
        throw error;
      }
      console.log('[DashboardMetrics] Fetched:', data?.length, 'solicitações');
      return data;
    },
    enabled: !!user?.id && !loadingEmp,
    staleTime: 120_000,
  });

  // Query for OCs pending justification (day >= 23, no NF, no forecast)
  const { data: justificativasData, isLoading: loadingJust } = useQuery({
    queryKey: ['dashboard-justificativas-pendentes', user?.id, empreendimentos],
    queryFn: async () => {
      // Business rule: justifications only required from day 23 onwards
      const dayOfMonth = new Date().getDate();
      if (dayOfMonth < 23) return { total: 0, own: 0 };

      // Fetch OCs with their solicitacoes
      const { data: ocs, error } = await supabase
        .from('documentos_emitidos')
        .select('id, solicitacao_id, solicitacoes!documentos_emitidos_solicitacao_id_fkey(user_id, status, natureza_orcamentaria, empreendimento)')
        .eq('tipo_documento', 'OC');

      if (error) throw error;
      if (!ocs) return { total: 0, own: 0 };

      // Filter valid OCs
      const validOcs = ocs.filter(oc => {
        const sol = oc.solicitacoes as any;
        if (!sol) return false;
        if (sol.status === 'concluida' || sol.status === 'cancelado') return false;
        if (sol.natureza_orcamentaria === 'agua' || sol.natureza_orcamentaria === 'energia_eletrica') return false;
        if (!hasAllAccess && empreendimentos.length > 0 && !empreendimentos.includes(sol.empreendimento)) return false;
        return true;
      });

      // Check which OCs have NFs or forecasts
      const solIds = [...new Set(validOcs.map(oc => oc.solicitacao_id))];
      if (solIds.length === 0) return { total: 0, own: 0 };

      const [nfResult, acompResult] = await Promise.all([
        supabase.from('documentos_fiscais').select('solicitacao_id').in('solicitacao_id', solIds),
        supabase.from('oc_acompanhamento').select('solicitacao_id, previsao_nf').in('solicitacao_id', solIds),
      ]);

      const solsWithNf = new Set((nfResult.data || []).map(d => d.solicitacao_id));
      const today = new Date().toISOString().slice(0, 10);
      const solsWithForecast = new Set(
        (acompResult.data || []).filter(a => a.previsao_nf && a.previsao_nf >= today).map(a => a.solicitacao_id)
      );

      const pendingOcs = validOcs.filter(oc => !solsWithNf.has(oc.solicitacao_id) && !solsWithForecast.has(oc.solicitacao_id));

      const total = pendingOcs.length;
      const own = pendingOcs.filter(oc => (oc.solicitacoes as any)?.user_id === user!.id).length;

      return { total, own };
    },
    enabled: !!user?.id && !loadingEmp,
    staleTime: 30_000,
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

  // Backoffice-specific KPIs
  const newInQueue = allSol.filter(s => s.status === 'recebido').length;
  const inAnalysis = allSol.filter(s => s.status === 'em_analise' || s.status === 'aprovado' || s.status === 'em_processamento').length;
  const waitingSolicitor = allSol.filter(s => s.status === 'pendente_correcao' || s.status === 'aguardando_informacoes').length;
  const inApproval = allSol.filter(s => s.status === 'aguardando_aceite').length;

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

  const pendingJustificativas = justificativasData?.total ?? 0;
  const pendingJustificativasOwn = justificativasData?.own ?? 0;

  // 7-day trend calculation
  const pendingStatuses: RequestStatus[] = ['pendente_correcao', 'aguardando_aceite', 'aguardando_nf_boleto', 'aguardando_informacoes'];
  const trend: TrendData = (() => {
    const totalArr: number[] = [];
    const pendingArr: number[] = [];
    const inProgressArr: number[] = [];
    const concludedArr: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStr = format(startOfDay(subDays(new Date(), i)), 'yyyy-MM-dd');
      const created = allSol.filter(s => s.created_at.slice(0, 10) === dayStr);
      totalArr.push(created.length);
      pendingArr.push(created.filter(s => pendingStatuses.includes(s.status as RequestStatus)).length);
      inProgressArr.push(created.filter(s => inProgressStatuses.includes(s.status as RequestStatus)).length);
      concludedArr.push(created.filter(s => s.status === 'concluida').length);
    }
    return { total: totalArr, pending: pendingArr, inProgress: inProgressArr, concluded: concludedArr };
  })();

  return {
    total: allSol.length,
    pendingActions: pendingCorrections + pendingAcceptance + pendingNfBoleto + pendingInfoRequests + pendingJustificativas,
    pendingCorrections,
    pendingAcceptance,
    pendingNfBoleto,
    pendingInfoRequests,
    pendingJustificativas,
    pendingJustificativasOwn,
    inProgress,
    concluded,
    newInQueue,
    inAnalysis,
    waitingSolicitor,
    inApproval,
    recentSolicitacoes,
    statusCounts,
    trend,
    isLoading: loadingSol || loadingEmp || loadingJust,
    error: error as Error | null,
  };
}
