import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { differenceInCalendarDays, startOfWeek, format, subDays } from 'date-fns';
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
  data_oc: string; // date when numero_chamado_fluig was first assigned
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
  week: string; // YYYY-WW
  weekLabel: string;
  avg: number;
  year: number;
}

const HISTOGRAM_BUCKETS = [
  { label: '0-1d', min: 0, max: 1 },
  { label: '2-5d', min: 2, max: 5 },
  { label: '6-10d', min: 6, max: 10 },
  { label: '11-15d', min: 11, max: 15 },
  { label: '15-30d', min: 16, max: 30 },
  { label: '30d+', min: 31, max: Infinity },
];

export function useEficienciaDashboard(filters: EficienciaFilters) {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['eficiencia-dashboard', filters],
    queryFn: async () => {
      // Fetch solicitações that have a numero_chamado_fluig (OC emitted)
      // and the history entry when it was added
      let query = supabase
        .from('solicitacoes')
        .select('id, protocolo, created_at, status, empreendimento, valor, numero_chamado_fluig')
        .not('numero_chamado_fluig', 'is', null)
        .gte('created_at', filters.dataInicio)
        .lte('created_at', filters.dataFim + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (filters.empreendimento) {
        query = query.eq('empreendimento', filters.empreendimento);
      }

      const { data: sols, error: solError } = await query;
      if (solError) throw solError;

      if (!sols || sols.length === 0) return { entries: [], sols: [] };

      // Fetch the history entries where numero_fluig was added
      const solIds = sols.map(s => s.id);
      const { data: histData } = await supabase
        .from('historico_solicitacoes')
        .select('solicitacao_id, created_at')
        .in('solicitacao_id', solIds)
        .eq('acao', 'numero_fluig_adicionado')
        .order('created_at', { ascending: true });

      // Map: solicitacao_id -> first fluig date
      const fluigDateMap = new Map<string, string>();
      if (histData) {
        for (const h of histData) {
          if (!fluigDateMap.has(h.solicitacao_id)) {
            fluigDateMap.set(h.solicitacao_id, h.created_at);
          }
        }
      }

      // Build entries with lead time
      const entries: LeadTimeEntry[] = sols.map(s => {
        const dataOc = fluigDateMap.get(s.id) || s.created_at; // fallback to created_at if no history
        const leadTime = differenceInCalendarDays(new Date(dataOc), new Date(s.created_at));
        return {
          id: s.id,
          protocolo: s.protocolo || '',
          created_at: s.created_at,
          data_oc: dataOc,
          lead_time_dias: Math.max(0, leadTime),
          empreendimento: s.empreendimento as Empreendimento,
          status: s.status,
          valor: s.valor,
        };
      });

      // Also fetch count of all new solicitations in period (for throughput)
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
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const entries = data?.entries || [];

  // KPI 1: Lead Time Médio
  const avgLeadTime = entries.length > 0
    ? entries.reduce((sum, e) => sum + e.lead_time_dias, 0) / entries.length
    : 0;

  // KPI 2: % Same-Day (Flash)
  const sameDayCount = entries.filter(e => e.lead_time_dias === 0).length;
  const sameDayPercent = entries.length > 0 ? (sameDayCount / entries.length) * 100 : 0;

  // KPI 3: Backlog Crítico (open > 15 days without OC)
  // This needs a separate count - handled by separate query
  const { data: backlogData } = useQuery({
    queryKey: ['eficiencia-backlog', filters.empreendimento],
    queryFn: async () => {
      const cutoff = subDays(new Date(), 15).toISOString();
      let query = supabase
        .from('solicitacoes')
        .select('id', { count: 'exact', head: true })
        .is('numero_chamado_fluig', null)
        .lt('created_at', cutoff)
        .not('status', 'in', '(concluida,rejeitado,cancelado)');

      if (filters.empreendimento) {
        query = query.eq('empreendimento', filters.empreendimento);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // KPI 4: Volume vs Vazão
  const ocEmitted = entries.length;

  // Histogram
  const histogram: HistogramBucket[] = HISTOGRAM_BUCKETS.map(bucket => ({
    ...bucket,
    count: entries.filter(e => e.lead_time_dias >= bucket.min && e.lead_time_dias <= bucket.max).length,
  }));

  // Weekly averages for line chart
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

  return {
    entries,
    avgLeadTime: Math.round(avgLeadTime * 10) / 10,
    sameDayPercent: Math.round(sameDayPercent),
    sameDayCount,
    backlogCritico: backlogData || 0,
    ocEmitted,
    histogram,
    weeklyAverages,
    isLoading,
    error,
    refetch,
  };
}
