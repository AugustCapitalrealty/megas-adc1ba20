import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PendingActionsCard } from '@/components/PendingActionsCard';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, FileText, LayoutDashboard, ClipboardList, 
  CheckCircle2, Clock, ArrowRight, Loader2, Users, User, AlertTriangle, RefreshCw
} from 'lucide-react';
import { EMPREENDIMENTO_LABELS } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

type ViewMode = 'minhas' | 'geral';

export default function Dashboard() {
  const { user, profile, isBackofficeOrAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { empreendimentos } = useUserEmpreendimentos(user?.id);
  
  const canToggle = isBackofficeOrAdmin || empreendimentos.length > 0;
  const [viewMode, setViewMode] = useState<ViewMode>('minhas');

  // Sync viewMode when canToggle becomes available (roles load async)
  useEffect(() => {
    if (canToggle) {
      setViewMode('geral');
    }
  }, [canToggle]);
  
  const metrics = useDashboardMetrics(viewMode);

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-user-solicitacoes'] });
  };

  // Different KPIs depending on viewMode
  const kpis = viewMode === 'geral' && isBackofficeOrAdmin
    ? [
        {
          label: 'Total',
          value: metrics.total,
          icon: ClipboardList,
          color: 'text-foreground',
          bgColor: 'bg-muted',
          filter: 'todas',
        },
        {
          label: 'Novas (Em Fila)',
          value: metrics.newInQueue,
          icon: Clock,
          color: 'text-info',
          bgColor: 'bg-info/10',
          highlight: metrics.newInQueue > 0,
          filter: 'com_backoffice',
        },
        {
          label: 'Em Análise',
          value: metrics.inAnalysis,
          icon: LayoutDashboard,
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          filter: 'com_backoffice',
        },
        {
          label: 'Aguardando Solicitante',
          value: metrics.waitingSolicitor,
          icon: AlertTriangle,
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          highlight: metrics.waitingSolicitor > 0,
          filter: 'correcoes',
        },
      ]
    : [
        {
          label: 'Total',
          value: metrics.total,
          icon: ClipboardList,
          color: 'text-foreground',
          bgColor: 'bg-muted',
          filter: 'todas',
        },
        {
          label: 'Pendentes',
          value: metrics.pendingActions,
          icon: Clock,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          highlight: metrics.pendingActions > 0,
          filter: 'correcoes',
        },
        {
          label: 'Em Andamento',
          value: metrics.inProgress,
          icon: LayoutDashboard,
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          filter: 'com_backoffice',
        },
        {
          label: 'Finalizadas',
          value: metrics.concluded,
          icon: CheckCircle2,
          color: 'text-success',
          bgColor: 'bg-success/10',
          filter: 'concluidas',
        },
      ];

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Greeting + Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {viewMode === 'geral' 
                ? 'Visão geral de todas as solicitações' 
                : 'Suas solicitações'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canToggle && (
              <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
                <Button
                  variant={viewMode === 'minhas' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setViewMode('minhas')}
                >
                  <User className="h-3.5 w-3.5" />
                  Minhas
                </Button>
                <Button
                  variant={viewMode === 'geral' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setViewMode('geral')}
                >
                  <Users className="h-3.5 w-3.5" />
                  Geral
                  {!metrics.isLoading && viewMode === 'geral' && metrics.total > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {metrics.total}
                    </Badge>
                  )}
                </Button>
              </div>
            )}
            <Button onClick={() => navigate('/nova-solicitacao')} className="gap-2 hidden sm:flex">
              <Plus className="h-4 w-4" />
              Nova Solicitação
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <Card 
                    key={kpi.label}
                    className={cn(
                      'cursor-pointer hover:shadow-md transition-all',
                      kpi.highlight ? 'border-destructive/50 shadow-sm' : 'hover:border-primary/30'
                    )}
                    onClick={() => {
                      if (viewMode === 'geral' && isBackofficeOrAdmin) {
                        const tabMap: Record<string, string> = { todas: 'todas', com_backoffice: 'recebido', correcoes: 'pendente_correcao', concluidas: 'concluida' };
                        navigate(`/backoffice?tab=${tabMap[kpi.filter] || kpi.filter}`);
                      } else {
                        navigate(`/minhas-solicitacoes?filter=${kpi.filter}`);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.bgColor}`}>
                          <Icon className={`h-5 w-5 ${kpi.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-2xl font-bold leading-none">{kpi.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pending Actions */}
            <PendingActionsCard
              pendingCorrections={metrics.pendingCorrections}
              pendingAcceptance={metrics.pendingAcceptance}
              pendingNfBoleto={metrics.pendingNfBoleto}
              pendingInfoRequests={metrics.pendingInfoRequests}
              pendingJustificativas={metrics.pendingJustificativas}
              pendingJustificativasOwn={metrics.pendingJustificativasOwn}
              onViewPending={(filter) => {
                if (filter === 'justificativa_oc') {
                  navigate('/monitoramento-oc?status=pendente_justificativa');
                } else {
                  navigate(`/minhas-solicitacoes?filter=${filter}`);
                }
              }}
            />

            {/* Recent Requests */}
            {metrics.recentSolicitacoes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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

                <div className="space-y-2">
                  {metrics.recentSolicitacoes.map((sol) => (
                    <Card 
                      key={sol.id}
                      className="cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all"
                      onClick={() => navigate(`/minhas-solicitacoes?search=${sol.protocolo}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm">#{sol.protocolo}</span>
                              <StatusBadge status={sol.status} />
                              <Badge variant="outline" className="text-xs">{sol.tipo}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {sol.descricao}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{EMPREENDIMENTO_LABELS[sol.empreendimento]}</span>
                              {sol.fornecedor_nome && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{sol.fornecedor_nome}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-sm">{formatCurrency(sol.valor)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(sol.created_at), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {metrics.total === 0 && !metrics.error && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-lg mb-1">Nenhuma solicitação ainda</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {viewMode === 'geral' 
                      ? 'Nenhuma solicitação encontrada no sistema'
                      : 'Crie sua primeira solicitação de AC ou OC'}
                  </p>
                  <Button onClick={() => navigate('/nova-solicitacao')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Solicitação
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Mobile CTA */}
            <Button 
              onClick={() => navigate('/nova-solicitacao')} 
              className="w-full gap-2 sm:hidden"
              size="lg"
            >
              <Plus className="h-4 w-4" />
              Nova Solicitação
            </Button>
          </>
        )}
      </div>
  );
}
