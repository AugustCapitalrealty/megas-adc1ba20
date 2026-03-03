import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Empreendimento } from '@/types';

export function useUserEmpreendimentos(userId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-empreendimentos', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_empreendimentos')
        .select('empreendimento')
        .eq('user_id', userId!);

      if (error) throw error;
      return (data || []).map(d => d.empreendimento as Empreendimento);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const empreendimentos = data || [];

  return {
    empreendimentos,
    loading: isLoading,
    hasAllAccess: empreendimentos.includes('todos'),
  };
}
