import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfDay, subDays, format } from 'date-fns';

export interface ProductivityMetrics {
  assumed: number;
  ocsEmitted: number;
  completed: number;
  periodStart: Date;
  periodEnd: Date;
  isLoading: boolean;
}

export function useProductivityMetrics(): ProductivityMetrics {
  const { user } = useAuth();
  const now = new Date();
  const periodStart = startOfDay(subDays(now, 6));
  const periodEnd = now;

  const { data, isLoading } = useQuery({
    queryKey: ['productivity-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) return { assumed: 0, ocsEmitted: 0, completed: 0 };

      const { data: historico, error } = await supabase
        .from('historico_solicitacoes')
        .select('acao, status_novo')
        .eq('user_id', user.id)
        .gte('created_at', periodStart.toISOString());

      if (error) throw error;

      const assumed = (historico || []).filter(h => h.acao === 'Assumido pelo backoffice').length;
      const ocsEmitted = (historico || []).filter(h => h.acao === 'documento_emitido').length;
      const completed = (historico || []).filter(h => h.status_novo === 'concluida').length;

      return { assumed, ocsEmitted, completed };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    assumed: data?.assumed ?? 0,
    ocsEmitted: data?.ocsEmitted ?? 0,
    completed: data?.completed ?? 0,
    periodStart,
    periodEnd,
    isLoading,
  };
}
