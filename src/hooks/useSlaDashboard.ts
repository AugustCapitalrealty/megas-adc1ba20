import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Empreendimento } from '@/types';
import { SlaStatus } from '@/components/SlaBadge';

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
}

export function useSlaDashboard(filters: SlaFilters) {
  const [data, setData] = useState<SlaData[]>([]);
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

  // Calculate stats
  const stats: SlaStats = {
    total: data.length,
    noPrazo: data.filter(d => d.status_sla === 'no_prazo').length,
    atencao: data.filter(d => d.status_sla === 'atencao').length,
    estourado: data.filter(d => d.status_sla === 'estourado').length,
    percentualNoPrazo: data.length > 0 
      ? Math.round((data.filter(d => d.status_sla === 'no_prazo').length / data.length) * 100) 
      : 0,
    tempoMedio: data.length > 0
      ? Math.round((data.reduce((acc, d) => acc + d.dias_uteis_backoffice, 0) / data.length) * 10) / 10
      : 0,
  };

  return {
    data,
    loading,
    error,
    stats,
    refetch: fetchData,
  };
}
