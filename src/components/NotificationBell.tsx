import { useEffect, useCallback, useMemo } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  solicitacao_id: string | null;
  created_at: string;
}

const MAX_VISIBLE = 8;

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, tipo, titulo, mensagem, lida, solicitacao_id, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user,
    staleTime: 300_000,
  });

  const unreadCount = notifications.filter(n => !n.lida).length;

  // Group notifications: actions first, then info
  const grouped = useMemo(() => {
    const actions = notifications.filter(n => n.tipo === 'action_required');
    const info = notifications.filter(n => n.tipo !== 'action_required');
    return { actions, info };
  }, [notifications]);

  const visibleActions = grouped.actions.slice(0, MAX_VISIBLE);
  const visibleInfo = grouped.info.slice(0, MAX_VISIBLE - visibleActions.length);
  const hasMore = notifications.length > visibleActions.length + visibleInfo.length;

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ lida: true })
      .eq('id', notificationId);

    queryClient.setQueryData<Notification[]>(['notifications', user?.id], old =>
      old?.map(n => (n.id === notificationId ? { ...n, lida: true } : n)) || []
    );
  }, [queryClient, user?.id]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.lida).map(n => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from('notifications')
      .update({ lida: true })
      .in('id', unreadIds);

    queryClient.setQueryData<Notification[]>(['notifications', user?.id], old =>
      old?.map(n => ({ ...n, lida: true })) || []
    );
  }, [notifications, queryClient, user?.id]);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.solicitacao_id) {
      const { data } = await supabase
        .from('solicitacoes')
        .select('protocolo')
        .eq('id', notification.solicitacao_id)
        .single();

      if (data?.protocolo) {
        navigate(`/minhas-solicitacoes?search=${data.protocolo}`);
      } else {
        navigate('/minhas-solicitacoes');
      }
    }
  }, [markAsRead, navigate]);

  const renderItem = (notification: Notification) => (
    <DropdownMenuItem
      key={notification.id}
      className={cn(
        'flex flex-col items-start p-3 cursor-pointer',
        !notification.lida && 'bg-accent/50'
      )}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start gap-2 w-full">
        {!notification.lida && (
          <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{notification.titulo}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.mensagem}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </div>
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-muted-foreground text-sm">
            Nenhuma notificação
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {/* Action required group */}
            {visibleActions.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-destructive uppercase tracking-wider">
                  Ações pendentes
                </div>
                {visibleActions.map(renderItem)}
              </>
            )}
            
            {/* Info group */}
            {visibleInfo.length > 0 && (
              <>
                {visibleActions.length > 0 && <DropdownMenuSeparator />}
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Informativo
                </div>
                {visibleInfo.map(renderItem)}
              </>
            )}

            {/* View all */}
            {hasMore && (
              <>
                <DropdownMenuSeparator />
                <div className="px-3 py-2 text-center">
                  <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => navigate('/minhas-solicitacoes')}>
                    Ver todas as notificações
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
