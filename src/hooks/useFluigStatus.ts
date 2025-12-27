import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FluigStatus {
  solicitacao_fluig: string;
  responsavel_atual: string | null;
  localizacao: string | null;
  situacao: string | null;
  data_lancamento: string | null;
  gerencia_conclusao: string | null;
  gerencia_facilities_conclusao: string | null;
  gerencia_financeiro_conclusao: string | null;
  diretoria_conclusao: string | null;
  ultima_movimentacao: string | null;
}

interface FluigEvento {
  id: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
}

async function fetchFluigData(numeroChamadoFluig: string) {
  // Fetch snapshot data
  const { data: snapshotData, error: snapshotError } = await supabase
    .from('fluig_painel_snapshot')
    .select('solicitacao_fluig, responsavel_atual, localizacao, situacao, data_lancamento, gerencia_conclusao, gerencia_facilities_conclusao, gerencia_financeiro_conclusao, diretoria_conclusao')
    .eq('solicitacao_fluig', numeroChamadoFluig.trim())
    .maybeSingle();

  if (snapshotError) {
    throw snapshotError;
  }

  if (!snapshotData) {
    return { status: null, eventos: [] };
  }

  // Fetch events
  const { data: eventosData, error: eventosError } = await supabase
    .from('fluig_painel_eventos')
    .select('id, campo_alterado, valor_anterior, valor_novo, created_at')
    .eq('solicitacao_fluig', numeroChamadoFluig.trim())
    .order('created_at', { ascending: false });

  if (eventosError) {
    throw eventosError;
  }

  const status: FluigStatus = {
    ...snapshotData,
    ultima_movimentacao: eventosData?.[0]?.created_at || snapshotData.data_lancamento,
  };

  return { 
    status, 
    eventos: (eventosData || []) as FluigEvento[] 
  };
}

export function useFluigStatus(numeroChamadoFluig: string | null | undefined) {
  return useQuery({
    queryKey: ['fluig-status', numeroChamadoFluig],
    queryFn: () => fetchFluigData(numeroChamadoFluig!),
    enabled: !!numeroChamadoFluig,
    staleTime: 5 * 60 * 1000, // 5 minutos antes de considerar stale
    gcTime: 10 * 60 * 1000,   // Manter em cache por 10 minutos
  });
}
