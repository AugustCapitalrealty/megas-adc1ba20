import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UnreadMessageInfo } from '@/components/UnreadMessageBanner';

interface UseUnreadMessagesOptions {
  solicitacaoIds: string[];
  userId: string | undefined;
  isBackoffice: boolean;
}

export function useUnreadMessages({ solicitacaoIds, userId, isBackoffice }: UseUnreadMessagesOptions) {
  const [unreadMap, setUnreadMap] = useState<Record<string, UnreadMessageInfo>>({});

  const fetchUnread = useCallback(async () => {
    if (!userId || solicitacaoIds.length === 0) {
      setUnreadMap({});
      return;
    }

    // Fetch unread messages NOT sent by the current user
    const { data, error } = await supabase
      .from('solicitacao_mensagens')
      .select('id, solicitacao_id, mensagem, created_at, user_id')
      .in('solicitacao_id', solicitacaoIds)
      .eq('lida', false)
      .neq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      setUnreadMap({});
      return;
    }

    // Get unique sender IDs
    const senderIds = [...new Set(data.map(m => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', senderIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || p.email || 'Usuário']) || []);

    // Group by solicitacao_id
    const map: Record<string, UnreadMessageInfo> = {};
    for (const msg of data) {
      if (!map[msg.solicitacao_id]) {
        map[msg.solicitacao_id] = {
          solicitacao_id: msg.solicitacao_id,
          count: 0,
          last_message: msg.mensagem,
          last_sender_name: profileMap.get(msg.user_id) || 'Usuário',
          last_created_at: msg.created_at,
        };
      }
      map[msg.solicitacao_id].count++;
    }

    setUnreadMap(map);
  }, [userId, solicitacaoIds.join(',')]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  const markAsRead = useCallback(async (solicitacaoId: string) => {
    if (!userId) return;

    await supabase
      .from('solicitacao_mensagens')
      .update({ lida: true } as any)
      .eq('solicitacao_id', solicitacaoId)
      .eq('lida', false)
      .neq('user_id', userId);

    setUnreadMap(prev => {
      const next = { ...prev };
      delete next[solicitacaoId];
      return next;
    });
  }, [userId]);

  return { unreadMap, markAsRead, refetchUnread: fetchUnread };
}
