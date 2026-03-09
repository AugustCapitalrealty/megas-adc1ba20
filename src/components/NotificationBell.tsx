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
  prioridade: string;
}

const MAX_VISIBLE = 8;

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, tipo, titulo, mensagem, lida, solicitacao_id, created_at, prioridade')
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
  const hasCritical = notifications.some(n => !n.lida && n.prioridade === 'critical');

  // Group by priority
  const grouped = useMemo(() => {
    const sorted = [...notifications].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.prioridade] ?? 2;
      const pb = PRIORITY_ORDER[b.prioridade] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const urgent = sorted.filter(n => n.prioridade === 'critical' || n.prioridade === 'high');
    const actions = sorted.filter(n => n.tipo === 'action_required' && n.prioridade !== 'critical' && n.prioridade !== 'high');
    const info = sorted.filter(n => n.tipo !== 'action_required' && n.prioridade !== 'critical' && n.prioridade !== 'high');
    return { urgent, actions, info };
  }, [notifications]);

  const visibleUrgent = grouped.urgent.slice(0, MAX_VISIBLE);
  const remaining = MAX_VISIBLE - visibleUrgent.length;
  const visibleActions = grouped.actions.slice(0, Math.max(0, remaining));
  const visibleInfo = grouped.info.slice(0, Math.max(0, remaining - visibleActions.length));
  const hasMore = notifications.length > visibleUrgent.length + visibleActions.length + visibleInfo.length;

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

  const getPriorityIndicator = (prioridade: string) => {
    if (prioridade === 'critical') return 'border-l-2 border-l-destructive';
    if (prioridade === 'high') return 'border-l-2 border-l-warning';
    return '';
  };

  const getActionLabel = (notification: Notification) => {
    if (notification.tipo !== 'action_required') return null;
    if (notification.titulo.includes('Correção')) return 'Ver correção';
    if (notification.titulo.includes('OC')) return 'Ver OC';
    if (notification.titulo.includes('NF')) return 'Ver NF';
    if (notification.titulo.includes('SLA')) return 'Ver solicitação';
    if (notification.titulo.includes('Informações')) return 'Responder';
    return 'Ver detalhes';
  };

  const renderItem = (notification: Notification) => (
    <DropdownMenuItem
      key={notification.id}
      className={cn(
        'flex flex-col items-start p-3 cursor-pointer',
        !notification.lida && 'bg-accent/50',
        getPriorityIndicator(notification.prioridade)
      )}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start gap-2 w-full">
        {!notification.lida && (
          <span className={cn(
            'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
            notification.prioridade === 'critical' ? 'bg-destructive animate-pulse' : 'bg-primary'
          )} />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{notification.titulo}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.mensagem}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
            </p>
            {notification.tipo === 'action_required' && notification.solicitacao_id && (
              <span className="text-xs font-medium text-primary">
                {getActionLabel(notification)} →
              </span>
            )}
          </div>
        </div>
      </div>
    </DropdownMenuItem>
  );

  const renderGroup = (label: string, items: Notification[], className?: string) => {
    if (items.length === 0) return null;
    return (
      <>
        <div className={cn('px-3 py-1.5 text-xs font-medium uppercase tracking-wider', className)}>
          {label}
        </div>
        {items.map(renderItem)}
      </>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unreadCount > 0 ? `Notificações (${unreadCount} não lidas)` : 'Notificações'}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className={cn(
              'absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs flex items-center justify-center',
              hasCritical
                ? 'bg-destructive text-destructive-foreground animate-pulse'
                : 'bg-destructive text-destructive-foreground'
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
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
            {renderGroup('🔴 Urgente', visibleUrgent, 'text-destructive')}
            
            {visibleActions.length > 0 && visibleUrgent.length > 0 && <DropdownMenuSeparator />}
            {renderGroup('Ações pendentes', visibleActions, 'text-warning')}
            
            {visibleInfo.length > 0 && (visibleUrgent.length > 0 || visibleActions.length > 0) && <DropdownMenuSeparator />}
            {renderGroup('Informativo', visibleInfo, 'text-muted-foreground')}

            {/* View all */}
            <DropdownMenuSeparator />
            <div className="px-3 py-2 text-center">
              <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => navigate('/notificacoes')}>
                Ver todas as notificações
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
