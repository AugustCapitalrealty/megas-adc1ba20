import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { useTrackEvent } from '@/hooks/useTrackEvent';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PendingActionsCard } from '@/components/PendingActionsCard';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { KpiSparkline } from '@/components/KpiSparkline';
import { WelcomeTour, isOnboardingComplete } from '@/components/WelcomeTour';
import { ProductivityCard } from '@/components/ProductivityCard';
import { 
  Plus, LayoutDashboard, ClipboardList, 
  CheckCircle2, Clock, ArrowRight, Users, User, AlertTriangle, RefreshCw,
  FileText, ShoppingCart
} from 'lucide-react';
import { EMPREENDIMENTO_LABELS } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

type ViewMode = 'minhas' | 'geral';

export default function Dashboard() {
  const { user, effectiveProfile, isBackofficeOrAdmin, isAdmin, isImpersonating } = useAuth();
  useDocumentTitle('Dashboard');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const track = useTrackEvent();
  const effectiveUserId = effectiveProfile?.id || user?.id;
  const { empreendimentos } = useUserEmpreendimentos(effectiveUserId);
  
  const isSolicitante = !isBackofficeOrAdmin && !isAdmin;
  const canToggle = isBackofficeOrAdmin || empreendimentos.length > 0;
  const [viewMode, setViewMode] = useState<ViewMode>('minhas');

  // Default to 'geral' for backoffice/admin
  useEffect(() => {
    if (canToggle) {
      setViewMode('geral');
    }
  }, [canToggle]);
  
  const metrics = useDashboardMetrics(viewMode, isImpersonating ? effectiveUserId : undefined);

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-user-solicitacoes'] });
  };

  const trendMap = {
    total: metrics.trend.total,
    pending: metrics.trend.pending,
    inProgress: metrics.trend.inProgress,
    concluded: metrics.trend.concluded,
  };

  const kpis = viewMode === 'geral' && isBackofficeOrAdmin
    ? [
        {
          label: 'Total', value: metrics.total, icon: ClipboardList,
          color: 'text-foreground', bgColor: 'bg-muted', filter: 'todas',
          trend: trendMap.total,
        },
        {
          label: 'Novas (Em Fila)', value: metrics.newInQueue, icon: Clock,
          color: 'text-info', bgColor: 'bg-info/10', highlight: metrics.newInQueue > 0,
          filter: 'com_backoffice', trend: trendMap.total,
        },
        {
          label: 'Em Análise', value: metrics.inAnalysis, icon: LayoutDashboard,
          color: 'text-primary', bgColor: 'bg-primary/10', filter: 'com_backoffice',
          trend: trendMap.inProgress,
        },
        {
          label: 'Aguardando Solicitante', value: metrics.waitingSolicitor, icon: AlertTriangle,
          color: 'text-warning', bgColor: 'bg-warning/10', highlight: metrics.waitingSolicitor > 0,
          filter: 'correcoes', trend: trendMap.pending,
        },
      ]
    : [
        {
          label: 'Total', value: metrics.total, icon: ClipboardList,
          color: 'text-foreground', bgColor: 'bg-muted', filter: 'todas',
          trend: trendMap.total,
        },
        {
          label: 'Pendentes', value: metrics.pendingActions, icon: Clock,
          color: 'text-destructive', bgColor: 'bg-destructive/10', highlight: metrics.pendingActions > 0,
          filter: 'correcoes', trend: trendMap.pending,
        },
        {
          label: 'Em Andamento', value: metrics.inProgress, icon: LayoutDashboard,
          color: 'text-primary', bgColor: 'bg-primary/10', filter: 'com_backoffice',
          trend: trendMap.inProgress,
        },
        {
          label: 'Finalizadas', value: metrics.concluded, icon: CheckCircle2,
          color: 'text-success', bgColor: 'bg-success/10', filter: 'concluidas',
          trend: trendMap.concluded,
        },
      ];

  // Persona-aware greeting
  const greetingSuffix = isAdmin
    ? 'Painel administrativo'
    : isBackofficeOrAdmin
    ? viewMode === 'geral' ? 'Visão geral de todas as solicitações' : 'Suas solicitações'
    : viewMode === 'geral' ? 'Visão geral das solicitações' : 'Suas solicitações';

  // Persona-aware primary CTA
  const primaryCtaLabel = isSolicitante ? 'Nova Solicitação' : 'Ir ao Backoffice';
  const primaryCtaHref = isSolicitante ? '/nova-solicitacao' : '/backoffice';
  const PrimaryCtaIcon = isSolicitante ? Plus : LayoutDashboard;

  // Persona chip + dynamic date subtitle
  const personaLabel = isAdmin ? 'Admin' : isBackofficeOrAdmin ? 'Backoffice' : 'Solicitante';
  const today = new Date();
  const dateLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const dateLabelCapitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  // Smart summary used by PendingActionsCard header
  const smartSummary = isBackofficeOrAdmin
    ? [
        metrics.newInQueue > 0 && `${metrics.newInQueue} ${metrics.newInQueue === 1 ? 'nova na fila' : 'novas na fila'}`,
        metrics.waitingSolicitor > 0 && `${metrics.waitingSolicitor} aguardando solicitante`,
      ].filter(Boolean).join(' · ') || undefined
    : undefined;

  return (
    <div className="space-y-5 sm:space-y-4 animate-fade-in">
        {/* Hero header — compact + persona chip + date */}
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                Olá, {effectiveProfile?.full_name?.split(' ')[0] || 'Usuário'}!
              </h1>
              <Badge variant="secondary" className="h-5 px-2 text-[10px] font-medium uppercase tracking-wide">
                {personaLabel}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              {dateLabelCapitalized} · {greetingSuffix}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canToggle && (
              <div className="inline-flex items-center bg-muted/70 rounded-full p-0.5 gap-0.5 shadow-inner">
                <Button
                  variant={viewMode === 'minhas' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-1.5 h-7 px-3 text-xs rounded-full',
                    viewMode === 'minhas' && 'shadow-sm'
                  )}
                  onClick={() => setViewMode('minhas')}
                >
                  <User className="h-3.5 w-3.5" />
                  Minhas
                </Button>
                <Button
                  variant={viewMode === 'geral' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-1.5 h-7 px-3 text-xs rounded-full',
                    viewMode === 'geral' && 'shadow-sm'
                  )}
                  onClick={() => setViewMode('geral')}
                >
                  <Users className="h-3.5 w-3.5" />
                  Geral
                  {!metrics.isLoading && viewMode === 'geral' && metrics.total > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-bold rounded-full bg-background/40 text-current">
                      {metrics.total}
                    </span>
                  )}
                </Button>
              </div>
            )}
            <Button onClick={() => navigate(primaryCtaHref)} className="gap-2 hidden sm:flex shadow-sm">
              <PrimaryCtaIcon className="h-4 w-4" />
              {primaryCtaLabel}
            </Button>
          </div>
        </div>

        {/* Error state */}
        {metrics.error && !metrics.isLoading && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Erro ao carregar dados</p>
                  <p className="text-sm text-muted-foreground">
                    Não foi possível buscar as solicitações. Tente novamente.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        {metrics.isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-7 w-12" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Onboarding Tour */}
            {metrics.total === 0 && !isOnboardingComplete() && (
               <WelcomeTour
                userName={effectiveProfile?.full_name?.split(' ')[0]}
                onComplete={() => track('onboarding_completed')}
              />
            )}

            {/* Hero card: Pending Actions (com summary embutido) — substitui o antigo DailyInsightCard */}
            <PendingActionsCard
              pendingCorrections={metrics.pendingCorrections}
              pendingAcceptance={metrics.pendingAcceptance}
              pendingNfBoleto={metrics.pendingNfBoleto}
              pendingInfoRequests={metrics.pendingInfoRequests}
              pendingJustificativas={metrics.pendingJustificativas}
              pendingJustificativasOwn={metrics.pendingJustificativasOwn}
              pendingCiencia={metrics.pendingCiencia}
              isBackofficeOrAdmin={isBackofficeOrAdmin}
              summary={smartSummary}
              onViewPending={(filter) => {
                if (filter === 'justificativa_oc') {
                  navigate('/monitoramento-oc?status=pendente_justificativa');
                } else {
                  navigate(`/minhas-solicitacoes?filter=${filter}`);
                }
              }}
              onDarCiencia={() => navigate('/minhas-solicitacoes?filter=canceladas')}
            />

            {/* Layer 2: KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <Card 
                    key={kpi.label}
                    className={cn(
                      'group cursor-pointer rounded-xl border-border/60 transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring',
                      kpi.highlight ? 'ring-2 ring-primary/30 shadow-sm' : 'hover:border-primary/40'
                    )}
                    role="button"
                    tabIndex={0}
                    aria-label={`${kpi.label}: ${kpi.value} solicitações. Clique para ver detalhes.`}
                    onClick={() => {
                      track('kpi_clicked', { label: kpi.label, filter: kpi.filter, viewMode });
                      if (viewMode === 'geral' && isBackofficeOrAdmin) {
                        const tabMap: Record<string, string> = { todas: 'todas', com_backoffice: 'recebido', correcoes: 'pendente_correcao', concluidas: 'concluida' };
                        navigate(`/backoffice?tab=${tabMap[kpi.filter] || kpi.filter}`);
                      } else {
                        navigate(`/minhas-solicitacoes?filter=${kpi.filter}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (viewMode === 'geral' && isBackofficeOrAdmin) {
                          const tabMap: Record<string, string> = { todas: 'todas', com_backoffice: 'recebido', correcoes: 'pendente_correcao', concluidas: 'concluida' };
                          navigate(`/backoffice?tab=${tabMap[kpi.filter] || kpi.filter}`);
                        } else {
                          navigate(`/minhas-solicitacoes?filter=${kpi.filter}`);
                        }
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110', kpi.bgColor)}>
                          <Icon className={cn('h-4 w-4', kpi.color)} />
                        </div>
                        <KpiSparkline data={kpi.trend} />
                      </div>
                      <p className="text-3xl font-bold leading-none tracking-tight tabular-nums">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{kpi.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Layer 2.5: Productivity Card — backoffice only */}
            {isBackofficeOrAdmin && <ProductivityCard />}

            {/* Layer 3: Recent Requests — lista densa moderna */}
            {metrics.recentSolicitacoes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Últimas Solicitações
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/minhas-solicitacoes')}
                    className="gap-1 text-xs"
                  >
                    Ver todas
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <Card className="rounded-xl border-border/60 overflow-hidden">
                  <ul className="divide-y divide-border/60">
                    {metrics.recentSolicitacoes.map((sol) => {
                      const isOC = (sol.tipo || '').toUpperCase().includes('OC');
                      const TypeIcon = isOC ? ShoppingCart : FileText;
                      return (
                        <li
                          key={sol.id}
                          tabIndex={0}
                          role="button"
                          aria-label={`Solicitação ${sol.protocolo}: ${sol.descricao}`}
                          className="flex items-start gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:outline-none"
                          onClick={() => navigate(`/minhas-solicitacoes?search=${sol.protocolo}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(`/minhas-solicitacoes?search=${sol.protocolo}`);
                            }
                          }}
                        >
                          <div className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                            isOC ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'
                          )}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm tabular-nums">#{sol.protocolo}</span>
                              <StatusBadge status={sol.status} showActionHint />
                              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                                {sol.tipo}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 truncate mt-0.5">
                              {sol.descricao}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                              <span className="truncate">{EMPREENDIMENTO_LABELS[sol.empreendimento]}</span>
                              {sol.fornecedor_nome && (
                                <>
                                  <span className="opacity-60">•</span>
                                  <span className="truncate">{sol.fornecedor_nome}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-sm tabular-nums">{formatCurrency(sol.valor)}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(sol.created_at), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </div>
            )}

            {/* Empty state */}
            {metrics.total === 0 && !metrics.error && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-4">
                    <rect x="16" y="8" width="48" height="60" rx="6" className="stroke-primary/30" strokeWidth="2" fill="none" />
                    <rect x="16" y="8" width="48" height="60" rx="6" className="fill-primary/5" />
                    <line x1="26" y1="28" x2="54" y2="28" className="stroke-muted-foreground/30" strokeWidth="2" strokeLinecap="round" />
                    <line x1="26" y1="36" x2="48" y2="36" className="stroke-muted-foreground/30" strokeWidth="2" strokeLinecap="round" />
                    <line x1="26" y1="44" x2="42" y2="44" className="stroke-muted-foreground/30" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="56" cy="56" r="14" className="fill-primary/10 stroke-primary" strokeWidth="2" />
                    <path d="M52 56l3 3 5-6" className="stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  <h3 className="font-semibold text-lg mb-1">Nenhuma solicitação ainda</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {viewMode === 'geral' 
                      ? 'Nenhuma solicitação encontrada no sistema'
                      : 'Comece criando sua primeira solicitação de AC ou OC'}
                  </p>
                  {viewMode === 'minhas' && (
                    <div className="flex flex-col items-start gap-2 mb-5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span>Conta criada</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                        <span>Criar primeira solicitação</span>
                      </div>
                    </div>
                  )}
                  <Button onClick={() => navigate('/nova-solicitacao')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Solicitação
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Mobile CTA - persona-aware */}
            {isSolicitante && (
              <Button 
                onClick={() => navigate(primaryCtaHref)} 
                className="fixed bottom-4 right-4 z-40 gap-2 sm:hidden shadow-lg rounded-full h-14 w-14 p-0"
                size="icon"
                aria-label={primaryCtaLabel}
              >
                <PrimaryCtaIcon className="h-6 w-6" />
              </Button>
            )}
            {!isSolicitante && (
              <Button 
                onClick={() => navigate(primaryCtaHref)} 
                className="w-full gap-2 sm:hidden"
                size="lg"
              >
                <PrimaryCtaIcon className="h-4 w-4" />
                {primaryCtaLabel}
              </Button>
            )}
          </>
        )}
      </div>
  );
}
