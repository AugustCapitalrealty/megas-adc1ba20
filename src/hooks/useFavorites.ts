import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_favorites' as any)
        .select('solicitacao_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data || []).map((f: any) => f.solicitacao_id as string);
    },
    enabled: !!user,
    staleTime: 300_000,
  });

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const toggleFavorite = useCallback(async (solicitacaoId: string) => {
    if (!user) return;
    const isFav = favoriteSet.has(solicitacaoId);

    // Optimistic update
    queryClient.setQueryData<string[]>(['favorites', user.id], (old = []) =>
      isFav ? old.filter(id => id !== solicitacaoId) : [...old, solicitacaoId]
    );

    if (isFav) {
      await supabase
        .from('user_favorites' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('solicitacao_id', solicitacaoId);
    } else {
      await supabase
        .from('user_favorites' as any)
        .insert({ user_id: user.id, solicitacao_id: solicitacaoId } as any);
    }
  }, [user, favoriteSet, queryClient]);

  const sortWithFavorites = useCallback(<T extends { id: string }>(items: T[]): T[] => {
    if (favoriteSet.size === 0) return items;
    const favs = items.filter(i => favoriteSet.has(i.id));
    const rest = items.filter(i => !favoriteSet.has(i.id));
    return [...favs, ...rest];
  }, [favoriteSet]);

  return { favoriteSet, toggleFavorite, sortWithFavorites };
}
