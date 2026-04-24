import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Empreendimento } from '@/types';
import { SlaStatus } from '@/components/SlaBadge';
import { differenceInCalendarDays, parseISO, format, subDays, addDays } from 'date-fns';

export interface SlaData {
  id: string;
  protocolo: string;
  created_at: string;
  solicitante_nome: string | null;
  solicitante_email: string | null;
  status: string;
  empreendimento: Empreendimento;
  numero_chamado_fluig: string | null;
  dias_uteis_backoffice: number; // Now supports decimal values (e.g., 0.5, 1.2)
  passou_cadastro: boolean;
  data_fluig_rm: string | null;
  status_sla: SlaStatus;
  sla_estourado: boolean;
}

export interface SlaFilters {
  dataInicio: string | null;
  dataFim: string | null;
  empreendimento: Empreendimento | null;
  statusSla: SlaStatus | null;
}

export interface SlaStats {
  total: number;
  noPrazo: number;
  atencao: number;
  estourado: number;
  percentualNoPrazo: number;
  tempoMedio: number;
  // Comparação com período anterior (mesmo tamanho de janela)
  totalAnterior: number;
  percentualNoPrazoAnterior: number;
  tempoMedioAnterior: number;
  // Tendência diária (últimos 14 dias da janela atual)
  tendenciaDiaria: { date: string; total: number; noPrazo: number; estourado: number }[];
  // Top 5 ofensores (maior dias_uteis_backoffice na janela)
  topOfensores: SlaData[];
}

const META_PERCENTUAL = 80; // meta de % no prazo

export function useSlaDashboard(filters: SlaFilters) {
  const [data, setData] = useState<SlaData[]>([]);
  const [dataPrevio, setDataPrevio] = useState<SlaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_sla_dashboard', {
        p_data_inicio: filters.dataInicio,
        p_data_fim: filters.dataFim,
        p_empreendimento: filters.empreendimento,
        p_status_sla: filters.statusSla,
      });

      if (rpcError) throw rpcError;

      setData((result as SlaData[]) || []);

      // Período anterior (mesma duração imediatamente antes)
      if (filters.dataInicio && filters.dataFim) {
        const ini = parseISO(filters.dataInicio);
        const fim = parseISO(filters.dataFim);
        const dur = Math.max(1, differenceInCalendarDays(fim, ini) + 1);
        const prevFim = subDays(ini, 1);
        const prevIni = subDays(prevFim, dur - 1);
        const { data: prev } = await supabase.rpc('get_sla_dashboard', {
          p_data_inicio: format(prevIni, 'yyyy-MM-dd'),
          p_data_fim: format(prevFim, 'yyyy-MM-dd'),
          p_empreendimento: filters.empreendimento,
          p_status_sla: null,
        });
        setDataPrevio((prev as SlaData[]) || []);
      } else {
        setDataPrevio([]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados de SLA:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.dataInicio, filters.dataFim, filters.empreendimento, filters.statusSla]);

  const computeStats = (rows: SlaData[]) => {
    const total = rows.length;
    const noPrazo = rows.filter(d => d.status_sla === 'no_prazo').length;
    const atencao = rows.filter(d => d.status_sla === 'atencao').length;
    const estourado = rows.filter(d => d.status_sla === 'estourado').length;
    return {
      total, noPrazo, atencao, estourado,
      percentualNoPrazo: total > 0 ? Math.round((noPrazo / total) * 100) : 0,
      tempoMedio: total > 0
        ? Math.round((rows.reduce((acc, d) => acc + d.dias_uteis_backoffice, 0) / total) * 10) / 10
        : 0,
    };
  };

  // Tendência diária dos últimos 14 dias da janela
  const buildTendencia = () => {
    if (!filters.dataFim) return [];
    const fim = parseISO(filters.dataFim);
    const inicio = filters.dataInicio
      ? parseISO(filters.dataInicio)
      : subDays(fim, 13);
    const diaInicial = subDays(fim, Math.min(13, differenceInCalendarDays(fim, inicio)));
    const dias: { date: string; total: number; noPrazo: number; estourado: number }[] = [];
    for (let i = 0; i <= differenceInCalendarDays(fim, diaInicial); i++) {
      const d = addDays(diaInicial, i);
      const key = format(d, 'yyyy-MM-dd');
      const rows = data.filter(r => r.created_at.slice(0, 10) === key);
      dias.push({
        date: key,
        total: rows.length,
        noPrazo: rows.filter(r => r.status_sla === 'no_prazo').length,
        estourado: rows.filter(r => r.status_sla === 'estourado').length,
      });
    }
    return dias;
  };

  const atual = computeStats(data);
  const previo = computeStats(dataPrevio);

  // Calculate stats
  const stats: SlaStats = {
    ...atual,
    totalAnterior: previo.total,
    percentualNoPrazoAnterior: previo.percentualNoPrazo,
    tempoMedioAnterior: previo.tempoMedio,
    tendenciaDiaria: buildTendencia(),
    topOfensores: [...data]
      .sort((a, b) => b.dias_uteis_backoffice - a.dias_uteis_backoffice)
      .slice(0, 5),
  };

  return {
    data,
    loading,
    error,
    stats,
    meta: META_PERCENTUAL,
    refetch: fetchData,
  };
}
