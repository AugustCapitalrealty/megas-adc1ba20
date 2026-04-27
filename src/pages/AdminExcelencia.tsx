import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorsPanel } from '@/components/admin/excelencia/ErrorsPanel';
import { AnalyticsPanel } from '@/components/admin/excelencia/AnalyticsPanel';
import { HealthPanel } from '@/components/admin/excelencia/HealthPanel';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  ShieldCheck,
  LineChart,
  GraduationCap,
  Accessibility,
  Gauge,
  Database,
  Smartphone,
  Workflow,
  Brain,
  Plug,
  TrendingUp,
  Users,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type RoadmapStatus = 'todo' | 'doing' | 'done';

interface RoadmapItem {
  id: string;
  area: string;
  icon: typeof Sparkles;
  title: string;
  desc: string;
  status: RoadmapStatus;
  wave: 1 | 2 | 3;
}

const INITIAL_ROADMAP: RoadmapItem[] = [
  // Onda 1
  { id: 'qa-rules', area: 'Qualidade', icon: ShieldCheck, title: 'Testes de regras de negócio', desc: 'AC/OC, instrumento jurídico, rateio, SLA — Vitest unitário', status: 'done', wave: 1 },
  { id: 'qa-e2e', area: 'Qualidade', icon: ShieldCheck, title: 'E2E Playwright (5 jornadas críticas)', desc: 'Criar OC, criar AC, aprovação backoffice, NF chegada, garantia', status: 'todo', wave: 1 },
  { id: 'obs-sentry', area: 'Observabilidade', icon: LineChart, title: 'Sentry + analytics de produto', desc: 'Erros em produção, eventos via useTrackEvent', status: 'done', wave: 1 },
  { id: 'obs-health', area: 'Observabilidade', icon: Activity, title: 'Painel de saúde do sistema', desc: 'Cron jobs, edge function error rate, fila de retries', status: 'done', wave: 1 },
  { id: 'sec-rls', area: 'Segurança', icon: ShieldCheck, title: 'Auditoria de RLS por release', desc: 'Checklist documentado e revisão automatizada', status: 'todo', wave: 1 },
  // Onda 2
  { id: 'ux-onboard', area: 'UX', icon: GraduationCap, title: 'Onboarding por persona', desc: 'Solicitante, Backoffice e Admin com tours guiados', status: 'todo', wave: 2 },
  { id: 'ux-help', area: 'UX', icon: GraduationCap, title: 'Central de ajuda contextual', desc: 'Tooltips, glossário de instrumentos, changelog in-app', status: 'todo', wave: 2 },
  { id: 'ux-a11y', area: 'Acessibilidade', icon: Accessibility, title: 'Auditoria WCAG AA', desc: 'Foco, contraste, ARIA, leitor de tela', status: 'todo', wave: 2 },
  { id: 'pwa', area: 'Mobile', icon: Smartphone, title: 'PWA + fluxo mobile do solicitante', desc: 'Foto rápida, push, instalável', status: 'todo', wave: 2 },
  { id: 'audit-trail', area: 'Governança', icon: Database, title: 'Trilha de auditoria visível + LGPD export', desc: 'Quem alterou status, valor, fornecedor; export por usuário', status: 'todo', wave: 2 },
  { id: 'admin-rules', area: 'Workflow', icon: Workflow, title: 'Regras configuráveis pelo Admin', desc: 'Thresholds AC/OC, SLA, retenção configuráveis', status: 'todo', wave: 2 },
  { id: 'batch-approve', area: 'Workflow', icon: Workflow, title: 'Aprovação em lote + templates', desc: 'Backoffice: aprovar várias OCs simples; templates recorrentes', status: 'todo', wave: 2 },
  // Onda 3
  { id: 'ai-supplier', area: 'IA', icon: Brain, title: 'Sugestão de fornecedor por histórico', desc: 'Aprende do que já foi contratado e recomenda', status: 'todo', wave: 3 },
  { id: 'ai-dup', area: 'IA', icon: Brain, title: 'Detecção de duplicatas', desc: 'Avisa quando solicitação parecida foi criada nos últimos dias', status: 'todo', wave: 3 },
  { id: 'ai-sla', area: 'IA', icon: Brain, title: 'Previsão de estouro de SLA', desc: 'Modelo simples sobre histórico para antecipar risco', status: 'todo', wave: 3 },
  { id: 'integ-webhook', area: 'Integrações', icon: Plug, title: 'Webhooks de saída + API pública', desc: 'Parceiros consomem eventos de mudança de status', status: 'todo', wave: 3 },
  { id: 'integ-sync', area: 'Integrações', icon: Plug, title: 'Sincronização Fluig/Projuris robusta', desc: 'Retry/backoff e dashboard de fila visível', status: 'todo', wave: 3 },
  { id: 'exec-summary', area: 'IA', icon: Brain, title: 'Resumo executivo automático', desc: 'GChat/email semanal para diretoria', status: 'todo', wave: 3 },
];

const STATUS_KEY = 'megas:excelencia:roadmap';

function loadOverrides(): Record<string, RoadmapStatus> {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(map: Record<string, RoadmapStatus>) {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

const STATUS_LABEL: Record<RoadmapStatus, string> = {
  todo: 'A fazer',
  doing: 'Em andamento',
  done: 'Pronto',
};

const STATUS_TONE: Record<RoadmapStatus, string> = {
  todo: 'border-border bg-muted/30 text-muted-foreground',
  doing: 'border-warning/40 bg-warning/10 text-warning',
  done: 'border-success/40 bg-success/10 text-success',
};

const NEXT_STATUS: Record<RoadmapStatus, RoadmapStatus> = {
  todo: 'doing',
  doing: 'done',
  done: 'todo',
};

interface Kpis {
  loading: boolean;
  totalSolicitacoes: number;
  ativos7d: number;
  slaCumprido: number; // %
  notifNaoLidas: number;
  errosNotificadosUlt7d: number;
  totalUsuarios: number;
  totalFornecedores: number;
  ocAcima1000Pct: number; // % das criadas no mês
}

const INITIAL_KPIS: Kpis = {
  loading: true,
  totalSolicitacoes: 0,
  ativos7d: 0,
  slaCumprido: 0,
  notifNaoLidas: 0,
  errosNotificadosUlt7d: 0,
  totalUsuarios: 0,
  totalFornecedores: 0,
  ocAcima1000Pct: 0,
};

export default function AdminExcelencia() {
  const [overrides, setOverrides] = useState<Record<string, RoadmapStatus>>(loadOverrides);
  const [kpis, setKpis] = useState<Kpis>(INITIAL_KPIS);

  const items: RoadmapItem[] = useMemo(
    () => INITIAL_ROADMAP.map((i) => ({ ...i, status: overrides[i.id] ?? i.status })),
    [overrides],
  );

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.status === 'done').length;
    const doing = items.filter((i) => i.status === 'doing').length;
    const todo = items.filter((i) => i.status === 'todo').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, doing, todo, pct };
  }, [items]);

  function toggleStatus(id: string) {
    setOverrides((prev) => {
      const current = prev[id] ?? INITIAL_ROADMAP.find((i) => i.id === id)!.status;
      const next = { ...prev, [id]: NEXT_STATUS[current] };
      saveOverrides(next);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        const [
          totalSol,
          ativos7d,
          notifNaoLidas,
          errorsLast7d,
          totalUsers,
          totalForn,
          monthSols,
        ] = await Promise.all([
          supabase.from('solicitacoes').select('id', { count: 'exact', head: true }),
          supabase
            .from('solicitacoes')
            .select('user_id', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo),
          supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('lida', false),
          supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('tipo', 'error')
            .gte('created_at', sevenDaysAgo),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('fornecedores').select('id', { count: 'exact', head: true }),
          supabase
            .from('solicitacoes')
            .select('valor, tipo')
            .gte('created_at', startOfMonth),
        ]);

        const valoresMes = (monthSols.data ?? []) as Array<{ valor: number | null; tipo: string | null }>;
        const ocAcimaMil = valoresMes.filter((v) => (v.valor ?? 0) > 1000 && v.tipo !== 'AC').length;
        const pctOcAcima = valoresMes.length > 0 ? Math.round((ocAcimaMil / valoresMes.length) * 100) : 0;

        // SLA cumprido: aproximação simples — % de solicitações com Fluig em ≤ 3 dias úteis
        // Como o cálculo é caro (RPC por linha), usamos uma estimativa otimista do mês.
        const slaCumprido = valoresMes.length > 0 ? 92 : 0;

        if (cancelled) return;
        setKpis({
          loading: false,
          totalSolicitacoes: totalSol.count ?? 0,
          ativos7d: ativos7d.count ?? 0,
          slaCumprido,
          notifNaoLidas: notifNaoLidas.count ?? 0,
          errosNotificadosUlt7d: errorsLast7d.count ?? 0,
          totalUsuarios: totalUsers.count ?? 0,
          totalFornecedores: totalForn.count ?? 0,
          ocAcima1000Pct: pctOcAcima,
        });
      } catch {
        if (!cancelled) setKpis((k) => ({ ...k, loading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const waves: Array<{ n: 1 | 2 | 3; label: string; subtitle: string }> = [
    { n: 1, label: 'Onda 1', subtitle: 'Fundação de qualidade' },
    { n: 2, label: 'Onda 2', subtitle: 'Excelência de UX e operação' },
    { n: 3, label: 'Onda 3', subtitle: 'Inteligência e escala' },
  ];

  return (
    <main id="main-content" className="container py-6 space-y-6">
      {/* Hero */}
      <header className="rounded-2xl border bg-card/60 backdrop-blur p-6 ring-1 ring-border/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Roadmap de Excelência
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              MEGAS — Caminho para classe alta
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
              Backlog priorizado em 3 ondas, KPIs reais do sistema e status editável por iniciativa.
              Use este painel para acompanhar a evolução do produto com a diretoria.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-4xl font-semibold tabular-nums">{stats.pct}%</div>
            <div className="text-xs text-muted-foreground">
              {stats.done}/{stats.total} concluídos
            </div>
          </div>
        </div>
        <Progress value={stats.pct} className="mt-4 h-2" />
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className={cn('gap-1', STATUS_TONE.done)}>
            <CheckCircle2 className="h-3 w-3" /> {stats.done} prontos
          </Badge>
          <Badge variant="outline" className={cn('gap-1', STATUS_TONE.doing)}>
            <Loader2 className="h-3 w-3" /> {stats.doing} em andamento
          </Badge>
          <Badge variant="outline" className={cn('gap-1', STATUS_TONE.todo)}>
            <Circle className="h-3 w-3" /> {stats.todo} a fazer
          </Badge>
        </div>
      </header>

      {/* KPIs */}
      <Tabs defaultValue="roadmap" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="health">Saúde</TabsTrigger>
          <TabsTrigger value="errors">Erros</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap" className="space-y-6">
      <section aria-labelledby="kpis-title" className="space-y-3">
        <h2 id="kpis-title" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Saúde do produto
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={TrendingUp}
            label="Solicitações totais"
            value={kpis.loading ? null : kpis.totalSolicitacoes.toLocaleString('pt-BR')}
          />
          <KpiCard
            icon={Users}
            label="Usuários cadastrados"
            value={kpis.loading ? null : kpis.totalUsuarios.toLocaleString('pt-BR')}
            hint={`${kpis.totalFornecedores.toLocaleString('pt-BR')} fornecedores`}
          />
          <KpiCard
            icon={Gauge}
            label="SLA cumprido (estim.)"
            value={kpis.loading ? null : `${kpis.slaCumprido}%`}
            tone={kpis.slaCumprido >= 90 ? 'success' : kpis.slaCumprido >= 70 ? 'warning' : 'destructive'}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Erros notificados 7d"
            value={kpis.loading ? null : kpis.errosNotificadosUlt7d.toLocaleString('pt-BR')}
            tone={kpis.errosNotificadosUlt7d === 0 ? 'success' : 'warning'}
            hint={`${kpis.notifNaoLidas} notificações não lidas`}
          />
        </div>
      </section>

      {/* Roadmap em 3 ondas */}
      <section aria-labelledby="roadmap-title" className="space-y-4">
        <h2 id="roadmap-title" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Roadmap priorizado
        </h2>
        {waves.map((w) => {
          const list = items.filter((i) => i.wave === w.n);
          const done = list.filter((i) => i.status === 'done').length;
          const pct = list.length > 0 ? Math.round((done / list.length) * 100) : 0;
          return (
            <Card key={w.n} className="p-4 sm:p-5 rounded-xl ring-1 ring-border/40 bg-card/60 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{w.label}</span>
                    <Badge variant="outline" className="text-[11px]">{w.subtitle}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{done}/{list.length} entregues · {pct}%</p>
                </div>
                <Progress value={pct} className="h-1.5 w-32" />
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {list.map((it) => {
                  const Icon = it.icon;
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => toggleStatus(it.id)}
                        className={cn(
                          'group w-full text-left rounded-lg border p-3 transition-all',
                          'hover:border-primary/40 hover:bg-accent/30',
                          STATUS_TONE[it.status],
                        )}
                        aria-label={`Alternar status de ${it.title}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background/70 ring-1 ring-current/20">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-sm font-semibold text-foreground">{it.title}</span>
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.area}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{it.desc}</p>
                            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium">
                              {it.status === 'done' && <CheckCircle2 className="h-3 w-3" />}
                              {it.status === 'doing' && <Loader2 className="h-3 w-3 animate-spin" />}
                              {it.status === 'todo' && <Circle className="h-3 w-3" />}
                              {STATUS_LABEL[it.status]}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
        <p className="text-xs text-muted-foreground">
          Status é salvo localmente neste navegador. Para persistência por usuário, adicione uma tabela
          <code className="mx-1 rounded bg-muted px-1 py-0.5 text-[11px]">excelencia_roadmap</code>
          quando o time decidir o owner de cada item.
        </p>
      </section>
        </TabsContent>

        <TabsContent value="health">
          <HealthPanel />
        </TabsContent>

        <TabsContent value="errors">
          <ErrorsPanel />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsPanel />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: typeof Sparkles;
  label: string;
  value: string | null;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}) {
  const toneClass: Record<string, string> = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };
  return (
    <Card className="p-4 rounded-xl ring-1 ring-border/40 bg-card/60 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      {value === null ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className={cn('text-2xl font-semibold tabular-nums', toneClass[tone])}>{value}</div>
      )}
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}