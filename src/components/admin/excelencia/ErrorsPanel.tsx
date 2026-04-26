import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle2, RefreshCw, Bug } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ErrorRow {
  id: string;
  message: string;
  stack: string | null;
  source: string | null;
  url: string | null;
  severity: 'error' | 'warning' | 'fatal';
  fingerprint: string | null;
  resolved: boolean;
  created_at: string;
  user_id: string | null;
}

interface Grouped {
  fingerprint: string;
  message: string;
  source: string | null;
  severity: ErrorRow['severity'];
  count: number;
  lastSeen: string;
  resolved: boolean;
  sampleId: string;
  affectedUsers: number;
}

const SEVERITY_TONE: Record<ErrorRow['severity'], string> = {
  warning: 'bg-warning/10 text-warning border-warning/30',
  error: 'bg-destructive/10 text-destructive border-destructive/30',
  fatal: 'bg-destructive text-destructive-foreground border-destructive',
};

export function ErrorsPanel() {
  const [rows, setRows] = useState<ErrorRow[] | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('error_logs')
        .select('id,message,stack,source,url,severity,fingerprint,resolved,created_at,user_id')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (error) { toast.error('Falha ao carregar erros'); setRows([]); return; }
      setRows((data ?? []) as ErrorRow[]);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const grouped: Grouped[] = useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, Grouped & { users: Set<string> }>();
    for (const r of rows) {
      const key = r.fingerprint ?? r.message;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (r.created_at > existing.lastSeen) existing.lastSeen = r.created_at;
        existing.resolved = existing.resolved && r.resolved;
        if (r.user_id) existing.users.add(r.user_id);
      } else {
        const users = new Set<string>();
        if (r.user_id) users.add(r.user_id);
        map.set(key, {
          fingerprint: key, message: r.message, source: r.source, severity: r.severity,
          count: 1, lastSeen: r.created_at, resolved: r.resolved, sampleId: r.id,
          affectedUsers: 0, users,
        });
      }
    }
    const list = Array.from(map.values()).map((g) => ({ ...g, affectedUsers: g.users.size }));
    return list
      .filter((g) => showResolved || !g.resolved)
      .sort((a, b) => (b.lastSeen > a.lastSeen ? 1 : -1));
  }, [rows, showResolved]);

  const total = rows?.length ?? 0;
  const unresolved = rows?.filter((r) => !r.resolved).length ?? 0;
  const fatals = rows?.filter((r) => r.severity === 'fatal').length ?? 0;

  async function markResolved(fp: string) {
    const { error } = await supabase
      .from('error_logs')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('fingerprint', fp).eq('resolved', false);
    if (error) { toast.error('Não foi possível marcar como resolvido'); return; }
    toast.success('Marcado como resolvido');
    setRefreshKey((k) => k + 1);
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiMini icon={Bug} label="Eventos (7d)" value={rows ? total : null} />
        <KpiMini icon={AlertTriangle} label="Não resolvidos" value={rows ? unresolved : null} tone={unresolved > 0 ? 'warning' : 'success'} />
        <KpiMini icon={AlertTriangle} label="Fatais" value={rows ? fatals : null} tone={fatals > 0 ? 'destructive' : 'success'} />
      </div>

      <Card className="p-4 rounded-xl ring-1 ring-border/40 bg-card/60 backdrop-blur">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold">Erros agrupados por fingerprint</h3>
            <p className="text-xs text-muted-foreground">Últimos 7 dias · capturados via ErrorBoundary, window.onerror e unhandledrejection</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowResolved((v) => !v)}>
              {showResolved ? 'Ocultar resolvidos' : 'Mostrar resolvidos'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRefreshKey((k) => k + 1)} className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </Button>
          </div>
        </div>

        {rows === null ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success mb-2" />
            Nenhum erro {showResolved ? '' : 'pendente '}registrado nos últimos 7 dias 🎉
          </div>
        ) : (
          <ScrollArea className="h-[480px] pr-2">
            <ul className="space-y-2">
              {grouped.map((g) => (
                <li key={g.fingerprint}
                  className="rounded-lg border border-border/60 bg-background/60 p-3 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline" className={SEVERITY_TONE[g.severity]}>{g.severity}</Badge>
                        {g.source && <Badge variant="outline" className="text-[10px]">{g.source}</Badge>}
                        {g.resolved && (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> resolvido
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium break-words">{g.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {g.count}× · {g.affectedUsers} usuário(s) · último{' '}
                        {formatDistanceToNow(new Date(g.lastSeen), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!g.resolved && (
                      <Button size="sm" variant="ghost" onClick={() => markResolved(g.fingerprint)}>
                        Resolver
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </Card>
    </section>
  );
}

function KpiMini({ icon: Icon, label, value, tone = 'default' }: {
  icon: typeof Bug; label: string; value: number | null;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}) {
  const toneClass: Record<string, string> = {
    default: 'text-foreground', success: 'text-success',
    warning: 'text-warning', destructive: 'text-destructive',
  };
  return (
    <Card className="p-3 rounded-xl ring-1 ring-border/40 bg-card/60 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      {value === null ? <Skeleton className="h-7 w-16" /> : (
        <div className={`text-2xl font-semibold tabular-nums ${toneClass[tone]}`}>{value}</div>
      )}
    </Card>
  );
}
