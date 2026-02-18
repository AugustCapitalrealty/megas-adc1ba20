import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfWeek, format, subDays } from 'date-fns';
import { calcularDiasUteis, isMesmoDia } from '@/lib/business-days';
import type { Empreendimento } from '@/types';

export interface EficienciaFilters {
  dataInicio: string;
  dataFim: string;
  empreendimento: Empreendimento | null;
}

export interface LeadTimeEntry {
  id: string;
  protocolo: string;
  created_at: string;
  data_oc: string;
  lead_time_dias: number;
  empreendimento: Empreendimento;
  status: string;
  valor: number;
}

export interface HistogramBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface WeeklyAverage {
  week: string;
  weekLabel: string;
  avg: number;
  year: number;
}

export interface EmpreendimentoLeadTime {
  empreendimento: Empreendimento;
  avg: number;
  count: number;
}

export interface RankingEntry {
  id: string;
  nome: string;
  count: number;
}

export interface EtapaTempo {
  etapa: string;
  avgDias: number;
}

const HISTOGRAM_BUCKETS = [
  { label: '0d', min: 0, max: 0 },
  { label: '1-2d', min: 1, max: 2 },
  { label: '3-5d', min: 3, max: 5 },
  { label: '6-10d', min: 6, max: 10 },
  { label: '11-15d', min: 11, max: 15 },
  { label: '15d+', min: 16, max: Infinity },
];

// Status groups for stage timing
const ETAPA_MAP: Record<string, string> = {
  recebido: 'Fila / Análise',
  em_analise: 'Fila / Análise',
  pendente_correcao: 'Correção Solicitante',
  aguardando_informacoes: 'Correção Solicitante',
  em_processamento: 'Aprovação',
  aprovado: 'Processamento OC',
};

export function useEficienciaDashboard(filters: EficienciaFilters) {
  const { user } = useAuth();

  // Fetch holidays once
  const { data: feriados } = useQuery({
    queryKey: ['feriados-eficiencia'],
    queryFn: async () => {
      const { data } = await supabase
        .from('feriados')
        .select('data');
      return (data || []).map(f => f.data);
    },
    staleTime: 600_000,
  });

  const feriadosList = feriados || [];

  // Main query: solicitações + documentos_emitidos
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['eficiencia-dashboard', filters, feriadosList.length],
    queryFn: async () => {
      // 1. Fetch documentos_emitidos in period (this is our end mark)
      let docsQuery = supabase
        .from('documentos_emitidos')
        .select('solicitacao_id, created_at')
        .gte('created_at', filters.dataInicio)
        .lte('created_at', filters.dataFim + 'T23:59:59')
        .order('created_at', { ascending: true });

      const { data: docs, error: docsError } = await docsQuery;
      if (docsError) throw docsError;

      if (!docs || docs.length === 0) return { entries: [], totalNew: 0 };

      // Map: solicitacao_id -> first doc emission date
      const docDateMap = new Map<string, string>();
      for (const d of docs) {
        if (!docDateMap.has(d.solicitacao_id)) {
          docDateMap.set(d.solicitacao_id, d.created_at);
        }
      }

      const solIds = Array.from(docDateMap.keys());

      // 2. Fetch the corresponding solicitações
      let solQuery = supabase
        .from('solicitacoes')
        .select('id, protocolo, created_at, status, empreendimento, valor')
        .in('id', solIds);

      if (filters.empreendimento) {
        solQuery = solQuery.eq('empreendimento', filters.empreendimento);
      }

      const { data: sols, error: solError } = await solQuery;
      if (solError) throw solError;

      // 3. Build entries with business day lead time
      const entries: LeadTimeEntry[] = (sols || []).map(s => {
        const dataOc = docDateMap.get(s.id)!;
        const leadTime = calcularDiasUteis(new Date(s.created_at), new Date(dataOc), feriadosList);
        return {
          id: s.id,
          protocolo: s.protocolo || '',
          created_at: s.created_at,
          data_oc: dataOc,
          lead_time_dias: leadTime,
          empreendimento: s.empreendimento as Empreendimento,
          status: s.status,
          valor: s.valor,
        };
      });

      // 4. Count total new in period (for throughput context)
      let countQuery = supabase
        .from('solicitacoes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', filters.dataInicio)
        .lte('created_at', filters.dataFim + 'T23:59:59');

      if (filters.empreendimento) {
        countQuery = countQuery.eq('empreendimento', filters.empreendimento);
      }

      const { count: totalNewCount } = await countQuery;

      return { entries, totalNew: totalNewCount || 0 };
    },
    enabled: !!user?.id && feriadosList.length > 0,
    staleTime: 30_000,
  });

  const entries = data?.entries || [];

  // KPI 1: Lead Time Médio (dias úteis)
  const avgLeadTime = entries.length > 0
    ? entries.reduce((sum, e) => sum + e.lead_time_dias, 0) / entries.length
    : 0;

  // KPI 2: % Same-Day (mesmo dia calendário)
  const sameDayCount = entries.filter(e =>
    isMesmoDia(new Date(e.created_at), new Date(e.data_oc))
  ).length;
  const sameDayPercent = entries.length > 0 ? (sameDayCount / entries.length) * 100 : 0;

  // KPI 3: Backlog Crítico (>15 dias úteis sem doc emitido)
  const { data: backlogData } = useQuery({
    queryKey: ['eficiencia-backlog', filters.empreendimento, feriadosList.length],
    queryFn: async () => {
      // Get open solicitações without any documento_emitido
      let query = supabase
        .from('solicitacoes')
        .select('id, created_at')
        .is('numero_chamado_fluig', null)
        .not('status', 'in', '(concluida,rejeitado,cancelado)');

      if (filters.empreendimento) {
        query = query.eq('empreendimento', filters.empreendimento);
      }

      const { data: openSols } = await query;
      if (!openSols) return 0;

      // Check which ones DON'T have a doc emitted
      const openIds = openSols.map(s => s.id);
      if (openIds.length === 0) return 0;

      const { data: docsEmitted } = await supabase
        .from('documentos_emitidos')
        .select('solicitacao_id')
        .in('solicitacao_id', openIds);

      const emittedSet = new Set((docsEmitted || []).map(d => d.solicitacao_id));
      const withoutDoc = openSols.filter(s => !emittedSet.has(s.id));

      // Count those with >15 business days
      const now = new Date();
      return withoutDoc.filter(s => {
        const dias = calcularDiasUteis(new Date(s.created_at), now, feriadosList);
        return dias > 15;
      }).length;
    },
    enabled: !!user?.id && feriadosList.length > 0,
    staleTime: 30_000,
  });

  // KPI 4: Vazão
  const ocEmitted = entries.length;

  // Histogram
  const histogram: HistogramBucket[] = HISTOGRAM_BUCKETS.map(bucket => ({
    ...bucket,
    count: entries.filter(e =>
      e.lead_time_dias >= bucket.min && e.lead_time_dias <= bucket.max
    ).length,
  }));

  // Weekly averages
  const weeklyMap = new Map<string, { sum: number; count: number; year: number }>();
  entries.forEach(e => {
    const date = new Date(e.data_oc);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const key = format(weekStart, 'yyyy-MM-dd');
    const year = date.getFullYear();
    const existing = weeklyMap.get(key) || { sum: 0, count: 0, year };
    existing.sum += e.lead_time_dias;
    existing.count += 1;
    weeklyMap.set(key, existing);
  });

  const weeklyAverages: WeeklyAverage[] = Array.from(weeklyMap.entries())
    .map(([key, val]) => ({
      week: key,
      weekLabel: format(new Date(key), 'dd/MM'),
      avg: Math.round((val.sum / val.count) * 10) / 10,
      year: val.year,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // Lead Time por Empreendimento
  const leadTimePorEmpreendimento: EmpreendimentoLeadTime[] = (() => {
    const map = new Map<string, { sum: number; count: number }>();
    entries.forEach(e => {
      if (e.empreendimento === 'todos') return;
      const existing = map.get(e.empreendimento) || { sum: 0, count: 0 };
      existing.sum += e.lead_time_dias;
      existing.count += 1;
      map.set(e.empreendimento, existing);
    });
    return Array.from(map.entries()).map(([emp, val]) => ({
      empreendimento: emp as Empreendimento,
      avg: Math.round((val.sum / val.count) * 10) / 10,
      count: val.count,
    }));
  })();

  // Taxa de Retrabalho — calculada via RPC no banco para evitar truncamento de 1000 linhas
  const { data: retrabalhoData } = useQuery({
    queryKey: ['eficiencia-retrabalho', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_retrabalho_eficiencia', {
        p_data_inicio: filters.dataInicio,
        p_data_fim: filters.dataFim + 'T23:59:59',
        p_empreendimento: filters.empreendimento || null,
      });

      if (error) throw error;
      const row = data?.[0];
      return {
        count: Number(row?.retrabalho_count ?? 0),
        total: Number(row?.total_count ?? 0),
      };
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Tempo por Etapa
  const { data: etapaData } = useQuery({
    queryKey: ['eficiencia-etapas', filters, feriadosList.length],
    queryFn: async () => {
      const solIds = entries.map(e => e.id);
      if (solIds.length === 0) return [];

      const { data: hist } = await supabase
        .from('historico_solicitacoes')
        .select('solicitacao_id, status_anterior, status_novo, created_at')
        .in('solicitacao_id', solIds)
        .order('created_at', { ascending: true });

      if (!hist || hist.length === 0) return [];

      // Group by solicitacao, compute time in each status
      const solHistMap = new Map<string, typeof hist>();
      hist.forEach(h => {
        const arr = solHistMap.get(h.solicitacao_id) || [];
        arr.push(h);
        solHistMap.set(h.solicitacao_id, arr);
      });

      const etapaTotals = new Map<string, { totalDias: number; count: number }>();

      solHistMap.forEach((events) => {
        for (let i = 0; i < events.length - 1; i++) {
          const statusAtual = events[i].status_novo;
          if (!statusAtual) continue;
          const etapa = ETAPA_MAP[statusAtual];
          if (!etapa) continue;

          const inicio = new Date(events[i].created_at);
          const fim = new Date(events[i + 1].created_at);
          const dias = calcularDiasUteis(inicio, fim, feriadosList);

          const existing = etapaTotals.get(etapa) || { totalDias: 0, count: 0 };
          existing.totalDias += dias;
          existing.count += 1;
          etapaTotals.set(etapa, existing);
        }
      });

      return Array.from(etapaTotals.entries()).map(([etapa, val]) => ({
        etapa,
        avgDias: Math.round((val.totalDias / val.count) * 10) / 10,
      }));
    },
    enabled: entries.length > 0 && feriadosList.length > 0,
    staleTime: 30_000,
  });

  // Top Solicitantes
  const { data: topSolicitantes } = useQuery({
    queryKey: ['eficiencia-top-solicitantes', filters],
    queryFn: async () => {
      // We need user_id from solicitações in the period
      let query = supabase
        .from('solicitacoes')
        .select('user_id')
        .gte('created_at', filters.dataInicio)
        .lte('created_at', filters.dataFim + 'T23:59:59');

      if (filters.empreendimento) {
        query = query.eq('empreendimento', filters.empreendimento);
      }

      const { data: sols } = await query;
      if (!sols || sols.length === 0) return [];

      // Count by user_id
      const countMap = new Map<string, number>();
      sols.forEach(s => {
        countMap.set(s.user_id, (countMap.get(s.user_id) || 0) + 1);
      });

      const topIds = Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // Fetch names
      const userIds = topIds.map(([id]) => id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return topIds.map(([id, count]) => {
        const p = profileMap.get(id);
        return {
          id,
          nome: p?.full_name || p?.email || 'Desconhecido',
          count,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Top Fornecedores
  const { data: topFornecedores } = useQuery({
    queryKey: ['eficiencia-top-fornecedores', filters],
    queryFn: async () => {
      let query = supabase
        .from('solicitacoes')
        .select('fornecedor_id')
        .not('fornecedor_id', 'is', null)
        .gte('created_at', filters.dataInicio)
        .lte('created_at', filters.dataFim + 'T23:59:59');

      if (filters.empreendimento) {
        query = query.eq('empreendimento', filters.empreendimento);
      }

      const { data: sols } = await query;
      if (!sols || sols.length === 0) return [];

      const countMap = new Map<string, number>();
      sols.forEach(s => {
        if (s.fornecedor_id) {
          countMap.set(s.fornecedor_id, (countMap.get(s.fornecedor_id) || 0) + 1);
        }
      });

      const topIds = Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const fornIds = topIds.map(([id]) => id);
      const { data: fornecedores } = await supabase
        .from('fornecedores')
        .select('id, razao_social, nome_fantasia')
        .in('id', fornIds);

      const fornMap = new Map((fornecedores || []).map(f => [f.id, f]));

      return topIds.map(([id, count]) => {
        const f = fornMap.get(id);
        return {
          id,
          nome: f?.razao_social || f?.nome_fantasia || 'Desconhecido',
          count,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  return {
    entries,
    avgLeadTime: Math.round(avgLeadTime * 10) / 10,
    sameDayPercent: Math.round(sameDayPercent),
    sameDayCount,
    backlogCritico: backlogData || 0,
    ocEmitted,
    histogram,
    weeklyAverages,
    leadTimePorEmpreendimento,
    retrabalho: retrabalhoData || { count: 0, total: 0 },
    etapas: etapaData || [],
    topSolicitantes: topSolicitantes || [],
    topFornecedores: topFornecedores || [],
    isLoading,
    error,
    refetch,
  };
}
