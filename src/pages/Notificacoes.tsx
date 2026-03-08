import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Search, CheckCheck, Trash2, Filter, Loader2 } from 'lucide-react';

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

export default function Notificacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
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

  // Apply filters
  const filtered = notifications.filter(n => {
    if (search && !n.titulo.toLowerCase().includes(search.toLowerCase()) && !n.mensagem.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== 'all' && n.prioridade !== filterPriority) return false;
    if (filterRead === 'unread' && n.lida) return false;
    if (filterRead === 'read' && !n.lida) return false;
    if (filterType !== 'all' && n.tipo !== filterType) return false;
    return true;
  });

  const paginated = filtered.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

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
            {notifications.filter(n => !n.lida).length} não lida(s) de {notifications.length} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notificações..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>

        <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterRead} onValueChange={(v) => { setFilterRead(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Lidas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="unread">Não lidas</SelectItem>
            <SelectItem value="read">Lidas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="action_required">Ação necessária</SelectItem>
            <SelectItem value="info">Informativo</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="status_change">Status</SelectItem>
          </SelectContent>
        </Select>
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
              {search || filterPriority !== 'all' || filterRead !== 'all' || filterType !== 'all'
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

          {paginated.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                'cursor-pointer hover:shadow-sm transition-all',
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
                </div>
              </CardContent>
            </Card>
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
