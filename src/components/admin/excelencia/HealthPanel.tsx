import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cog,
  Inbox,
  RefreshCw,
  XCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CronRow {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  last_run_start: string | null;
  last_run_end: string | null;
  last_status: string;
  last_duration_ms: number | null;
  runs_last_24h: number;
  failures_last_24h: number;
}

interface Summary {
  cron_active_jobs: number;
  cron_failures_24h: number;
  stuck_pendentes: number;
  unread_action_24h: number;
  errors_24h: number;
  errors_7d: number;
  generated_at: string;
}

interface EdgeFnError {
  source: string;
  total: number;
  unique_users: number;
  last_seen: string;
}

function statusTone(status: string, fails24h: number) {
  if (status === 'succeeded' && fails24h === 0) return 'success';
  if (fails24h > 0) return 'destructive';
  if (status === 'never_ran') return 'muted';
  if (status === 'running') return 'warning';
  return 'warning';
}

const TONE_CLASS: Record<string, string> = {
  success: 'border-success/40 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
  muted: 'border-border bg-muted/30 text-muted-foreground',
};

export function HealthPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [crons, setCrons] = useState<CronRow[]>([]);
  const [edgeErrors, setEdgeErrors] = useState<EdgeFnError[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [summaryRes, cronRes, errorsRes] = await Promise.all([
        supabase.rpc('get_system_health_summary' as never),
        supabase.rpc('get_system_health_cron' as never),
        supabase
          .from('error_logs')
          .select('source, user_id, created_at')
          .gte('created_at', sevenDaysAgo)
          .eq('resolved', false),
      ]);

      if (summaryRes.error) throw summaryRes.error;
      if (cronRes.error) throw cronRes.error;
      if (errorsRes.error) throw errorsRes.error;

      setSummary(summaryRes.data as unknown as Summary);
      setCrons((cronRes.data ?? []) as unknown as CronRow[]);

      // Aggregate edge function errors by `source`
      const grouped = new Map<string, { total: number; users: Set<string>; last: string }>();
      for (const row of (errorsRes.data ?? []) as Array<{
        source: string | null;
        user_id: string | null;
        created_at: string;
      }>) {
        const src = row.source ?? 'unknown';
        const entry = grouped.get(src) ?? { total: 0, users: new Set<string>(), last: row.created_at };
        entry.total += 1;
        if (row.user_id) entry.users.add(row.user_id);
        if (row.created_at > entry.last) entry.last = row.created_at;
        grouped.set(src, entry);
      }
      setEdgeErrors(
        Array.from(grouped.entries())
          .map(([source, v]) => ({
            source,
            total: v.total,
            unique_users: v.users.size,
            last_seen: v.last,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar saúde do sistema');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000); // refresh every 1min
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <section aria-labelledby="health-summary" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="health-summary" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Resumo da operação
          </h2>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Atualizar
          </Button>
        </div>
        {error && (
          <Card className="border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </Card>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile
            icon={Cog}
            label="Cron jobs ativos"
            value={summary?.cron_active_jobs ?? null}
            tone="default"
            loading={loading && !summary}
          />
          <SummaryTile
            icon={XCircle}
            label="Falhas em cron 24h"
            value={summary?.cron_failures_24h ?? null}
            tone={(summary?.cron_failures_24h ?? 0) === 0 ? 'success' : 'destructive'}
            loading={loading && !summary}
          />
          <SummaryTile
            icon={Clock}
            label="Pendências paradas >5d"
            value={summary?.stuck_pendentes ?? null}
            tone={(summary?.stuck_pendentes ?? 0) === 0 ? 'success' : 'warning'}
            hint="Solicitante não responde"
            loading={loading && !summary}
          />
          <SummaryTile
            icon={Inbox}
            label="Ações não lidas >24h"
            value={summary?.unread_action_24h ?? null}
            tone={(summary?.unread_action_24h ?? 0) === 0 ? 'success' : 'warning'}
            loading={loading && !summary}
          />
        </div>
      </section>

      {/* Cron jobs */}
      <section aria-labelledby="health-cron" className="space-y-3">
        <h2 id="health-cron" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Cron jobs
        </h2>
        <Card className="overflow-hidden rounded-xl ring-1 ring-border/40 bg-card/60 backdrop-blur">
          {loading && crons.length === 0 ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : crons.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhum cron job configurado.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {crons.map((c) => {
                const tone = statusTone(c.last_status, c.failures_last_24h);
                return (
                  <li key={c.jobid} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background ring-1 ring-border">
                      {c.last_status === 'succeeded' && c.failures_last_24h === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : c.failures_last_24h > 0 ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-semibold truncate">{c.jobname}</span>
                        <code className="text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          {c.schedule}
                        </code>
                        {!c.active && (
                          <Badge variant="outline" className="text-[10px]">inativo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.last_run_start
                          ? `Última execução ${formatDistanceToNow(new Date(c.last_run_start), { addSuffix: true, locale: ptBR })}`
                          : 'Nunca executado'}
                        {c.last_duration_ms != null && ` · ${Math.round(c.last_duration_ms)}ms`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className={cn('gap-1', TONE_CLASS[tone])}>
                        {c.last_status}
                      </Badge>
                      <span className="text-muted-foreground tabular-nums">
                        {c.runs_last_24h} runs/24h
                        {c.failures_last_24h > 0 && (
                          <span className="text-destructive font-medium"> · {c.failures_last_24h} falhas</span>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      {/* Edge function / source errors */}
      <section aria-labelledby="health-edge" className="space-y-3">
        <h2 id="health-edge" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Erros por origem (7 dias, não resolvidos)
        </h2>
        <Card className="overflow-hidden rounded-xl ring-1 ring-border/40 bg-card/60 backdrop-blur">
          {loading && edgeErrors.length === 0 ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : edgeErrors.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Nenhum erro pendente nos últimos 7 dias.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {edgeErrors.map((e) => (
                <li key={e.source} className="flex items-center gap-3 p-3">
                  <Zap className="h-4 w-4 text-warning" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium truncate">{e.source}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {e.unique_users} {e.unique_users === 1 ? 'usuário' : 'usuários'} afetado(s)
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Último: {formatDistanceToNow(new Date(e.last_seen), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn('tabular-nums', TONE_CLASS.warning)}>
                    {e.total}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {summary && (
        <p className="text-[11px] text-muted-foreground text-right">
          Atualizado{' '}
          {formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true, locale: ptBR })}{' '}
          · auto-refresh a cada 60s
        </p>
      )}
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
  hint,
  loading,
}: {
  icon: typeof Activity;
  label: string;
  value: number | null;
  tone: 'default' | 'success' | 'warning' | 'destructive';
  hint?: string;
  loading: boolean;
}) {
  const toneClass: Record<string, string> = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };
  return (
    <Card className="p-4 rounded-xl ring-1 ring-border/40 bg-card/60 backdrop-blur">
      <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <div className={cn('text-2xl font-semibold tabular-nums', toneClass[tone])}>
          {value ?? '—'}
        </div>
      )}
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}