import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Activity, MousePointerClick, Eye, Users } from 'lucide-react';

interface EventRow {
  event_name: string;
  page: string | null;
  created_at: string;
  user_id: string;
}

export function AnalyticsPanel() {
  const [rows, setRows] = useState<EventRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_name,page,created_at,user_id')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (cancelled) return;
      if (error) { setRows([]); return; }
      setRows((data ?? []) as EventRow[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    if (!rows) return null;
    const eventCounts = new Map<string, number>();
    const pageCounts = new Map<string, number>();
    const dau = new Set<string>();
    const dailyByDay = new Map<string, Set<string>>();
    for (const r of rows) {
      eventCounts.set(r.event_name, (eventCounts.get(r.event_name) ?? 0) + 1);
      if (r.page) pageCounts.set(r.page, (pageCounts.get(r.page) ?? 0) + 1);
      dau.add(r.user_id);
      const day = r.created_at.slice(0, 10);
      const set = dailyByDay.get(day) ?? new Set<string>();
      set.add(r.user_id);
      dailyByDay.set(day, set);
    }
    return {
      total: rows.length,
      uniqueUsers: dau.size,
      topEvents: Array.from(eventCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
      topPages: Array.from(pageCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
      dailyTrend: Array.from(dailyByDay.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([day, users]) => ({ day, users: users.size })),
    };
  }, [rows]);

  const maxDaily = stats?.dailyTrend.reduce((m, d) => Math.max(m, d.users), 0) ?? 0;

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiMini icon={MousePointerClick} label="Eventos (7d)" value={stats?.total ?? null} />
        <KpiMini icon={Users} label="Usuários ativos (7d)" value={stats?.uniqueUsers ?? null} />
        <KpiMini icon={Activity} label="Tipos de evento" value={stats?.topEvents.length ?? null} />
      </div>

      <Card className="p-4 rounded-xl ring-1 ring-border/40 bg-card/60 backdrop-blur">
        <h3 className="text-sm font-semibold mb-3">Usuários ativos por dia</h3>
        {!stats ? <Skeleton className="h-32 w-full" /> :
         stats.dailyTrend.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum evento registrado.</p>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {stats.dailyTrend.map((d) => {
              const h = maxDaily > 0 ? Math.max(8, (d.users / maxDaily) * 100) : 8;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary/80 hover:bg-primary rounded-t transition-colors"
                    style={{ height: `${h}%` }} title={`${d.day}: ${d.users} usuários`} />
                  <span className="text-[10px] text-muted-foreground tabular-nums">{d.day.slice(5)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4 rounded-xl ring-1 ring-border/40 bg-card/60 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Top eventos</h3>
          </div>
          {!stats ? <Skeleton className="h-40 w-full" /> : (
            <ul className="space-y-1.5">
              {stats.topEvents.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs truncate">{name}</span>
                  <Badge variant="outline" className="tabular-nums">{count}</Badge>
                </li>
              ))}
              {stats.topEvents.length === 0 && <p className="text-xs text-muted-foreground">Nenhum evento.</p>}
            </ul>
          )}
        </Card>

        <Card className="p-4 rounded-xl ring-1 ring-border/40 bg-card/60 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Páginas mais acessadas</h3>
          </div>
          {!stats ? <Skeleton className="h-40 w-full" /> : (
            <ul className="space-y-1.5">
              {stats.topPages.map(([page, count]) => (
                <li key={page} className="flex items-center justify-between text-sm gap-2">
                  <span className="text-xs truncate">{page}</span>
                  <Badge variant="outline" className="tabular-nums shrink-0">{count}</Badge>
                </li>
              ))}
              {stats.topPages.length === 0 && <p className="text-xs text-muted-foreground">Sem páginas.</p>}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}

function KpiMini({ icon: Icon, label, value }: {
  icon: typeof Activity; label: string; value: number | null;
}) {
  return (
    <Card className="p-3 rounded-xl ring-1 ring-border/40 bg-card/60 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      {value === null ? <Skeleton className="h-7 w-16" /> : (
        <div className="text-2xl font-semibold tabular-nums">{value.toLocaleString('pt-BR')}</div>
      )}
    </Card>
  );
}
