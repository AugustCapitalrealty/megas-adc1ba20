import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Search, CheckCheck, Loader2, Eye } from 'lucide-react';

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

const PAGE_SIZE = 50;

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Crítica',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baixa',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-warning text-warning-foreground',
  normal: 'bg-muted text-muted-foreground',
  low: 'bg-muted text-muted-foreground',
};

const TYPE_LABELS: Record<string, string> = {
  action_required: 'Ação necessária',
  info: 'Informativo',
  success: 'Sucesso',
  error: 'Erro',
  status_change: 'Mudança de status',
};

type TabFilter = 'all' | 'unread' | 'urgent';

function groupByDay(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const groups: Map<string, Notification[]> = new Map();
  const labels: Map<string, string> = new Map();

  for (const n of notifications) {
    const d = new Date(n.created_at);
    let key: string;
    if (isToday(d)) key = 'today';
    else if (isYesterday(d)) key = 'yesterday';
    else if (isThisWeek(d)) key = 'this_week';
    else key = 'older';

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  const order = ['today', 'yesterday', 'this_week', 'older'];
  const labelMap: Record<string, string> = {
    today: 'Hoje',
    yesterday: 'Ontem',
    this_week: 'Esta semana',
    older: 'Anteriores',
  };

  return order
    .filter(k => groups.has(k))
    .map(k => ({ label: labelMap[k], items: groups.get(k)! }));
}

export default function Notificacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications-full', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, tipo, titulo, mensagem, lida, solicitacao_id, created_at, prioridade')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Counts for tabs
  const unreadCount = useMemo(() => notifications.filter(n => !n.lida).length, [notifications]);
  const urgentCount = useMemo(() => notifications.filter(n => !n.lida && (n.prioridade === 'critical' || n.prioridade === 'high')).length, [notifications]);

  // Apply filters
  const filtered = useMemo(() => {
    return notifications.filter(n => {
      // Tab filter
      if (tab === 'unread' && n.lida) return false;
      if (tab === 'urgent' && (n.lida || (n.prioridade !== 'critical' && n.prioridade !== 'high'))) return false;
      // Search
      if (search && !n.titulo.toLowerCase().includes(search.toLowerCase()) && !n.mensagem.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [notifications, tab, search]);

  const paginated = filtered.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;
  const grouped = useMemo(() => groupByDay(paginated), [paginated]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map(n => n.id)));
    }
  };

  const markSelectedAsRead = useCallback(async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await supabase.from('notifications').update({ lida: true }).in('id', ids);
    queryClient.invalidateQueries({ queryKey: ['notifications-full', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    setSelected(new Set());
  }, [selected, queryClient, user?.id]);

  const markOneAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ lida: true }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['notifications-full', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
  }, [queryClient, user?.id]);

  const handleClick = useCallback(async (notification: Notification) => {
    if (!notification.lida) {
      await supabase.from('notifications').update({ lida: true }).eq('id', notification.id);
      queryClient.invalidateQueries({ queryKey: ['notifications-full', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
    if (notification.solicitacao_id) {
      const { data } = await supabase
        .from('solicitacoes')
        .select('protocolo')
        .eq('id', notification.solicitacao_id)
        .single();
      if (data?.protocolo) {
        navigate(`/minhas-solicitacoes?search=${data.protocolo}`);
      }
    }
  }, [navigate, queryClient, user?.id]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Central de Notificações
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {unreadCount} não lida(s) de {notifications.length} total
          </p>
        </div>
      </div>

      {/* Quick-filter tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as TabFilter); setPage(0); }} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread" className="gap-1.5">
              Não lidas
              {unreadCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs ml-1">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="urgent" className="gap-1.5">
              Urgentes
              {urgentCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs ml-1">{urgentCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notificações..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selected.size} selecionada(s)</span>
          <Button variant="outline" size="sm" onClick={markSelectedAsRead} className="gap-1.5">
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar como lidas
          </Button>
        </div>
      )}

      {/* Notification list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-1">Nenhuma notificação</h3>
            <p className="text-muted-foreground text-sm">
              {search || tab !== 'all'
                ? 'Nenhuma notificação encontrada com os filtros aplicados.'
                : 'Você será notificado quando houver atualizações.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {/* Select all */}
          <div className="flex items-center gap-3 px-4 py-2">
            <Checkbox
              checked={selected.size === paginated.length && paginated.length > 0}
              onCheckedChange={selectAll}
            />
            <span className="text-xs text-muted-foreground">Selecionar todas ({filtered.length})</span>
          </div>

          {grouped.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-4 py-2 mt-2">
                {group.label}
              </p>
              {group.items.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    'cursor-pointer hover:shadow-sm transition-all group',
                    !notification.lida && 'bg-accent/30 border-l-2',
                    notification.prioridade === 'critical' && !notification.lida && 'border-l-destructive',
                    notification.prioridade === 'high' && !notification.lida && 'border-l-warning',
                    notification.prioridade === 'normal' && !notification.lida && 'border-l-primary',
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected.has(notification.id)}
                        onCheckedChange={() => toggleSelect(notification.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => handleClick(notification)}
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {!notification.lida && (
                            <span className={cn(
                              'w-2 h-2 rounded-full flex-shrink-0',
                              notification.prioridade === 'critical' ? 'bg-destructive animate-pulse' : 'bg-primary'
                            )} />
                          )}
                          <p className="font-medium text-sm">{notification.titulo}</p>
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', PRIORITY_COLORS[notification.prioridade])}>
                            {PRIORITY_LABELS[notification.prioridade] || notification.prioridade}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {TYPE_LABELS[notification.tipo] || notification.tipo}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{notification.mensagem}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      {/* Inline mark-as-read */}
                      {!notification.lida && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            markOneAsRead(notification.id);
                          }}
                          aria-label="Marcar como lida"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}

          {hasMore && (
            <div className="text-center py-4">
              <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
