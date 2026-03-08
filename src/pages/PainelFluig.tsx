import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useFluigSnapshots } from '@/hooks/useFluigDashboard';
import { differenceInHours, differenceInDays, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { formatBR } from '@/lib/date-utils';
import {
  Loader2,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Timer,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  isFluigFechado, isFluigCancelado, getDataConclusaoFluig, 
  getFluigApprovalStatus, formatResponsavelFluig, isUserResponsibleFluig,
} from '@/lib/fluig-utils';
import { FluigImport } from '@/components/FluigImport';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';

type Snapshot = ReturnType<typeof useFluigSnapshots>['snapshots'][0];

// KPI Card component
const KPICard = ({ 
  title, 
  value, 
  previousValue, 
  icon: Icon, 
  invertTrend = false,
  suffix = '',
  tooltip,
}: { 
  title: string; 
  value: number; 
  previousValue: number; 
  icon: React.ElementType;
  invertTrend?: boolean;
  suffix?: string;
  tooltip?: string;
}) => {
  const diff = previousValue === 0 ? (value > 0 ? 100 : 0) : Math.round(((value - previousValue) / previousValue) * 100);
  const isPositive = diff > 0;
  const isNegative = diff < 0;
  const isNeutral = diff === 0;
  
  // invertTrend: for backlog and tempo médio, decrease is good (green)
  const isGood = invertTrend ? isNegative : isPositive;
  const isBad = invertTrend ? isPositive : isNegative;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="flex-1 min-w-[140px]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">{title}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{value}{suffix}</span>
                {!isNeutral && (
                  <span className={cn(
                    "text-xs font-medium flex items-center gap-0.5",
                    isGood && "text-green-600",
                    isBad && "text-red-600"
                  )}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {isPositive ? '+' : ''}{diff}%
                  </span>
                )}
                {isNeutral && (
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-0.5">
                    <Minus className="h-3 w-3" />
                    0%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                vs mês anterior: {previousValue}{suffix}
              </p>
            </CardContent>
          </Card>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent>
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default function PainelFluig() {
  const [empreendimentoTab, setEmpreendimentoTab] = useState<'curitiba' | 'itajai' | 'esteio' | null>(null);
  const [statusTab, setStatusTab] = useState<'abertos' | 'fechados' | 'cancelados'>('abertos');
  const [importOpen, setImportOpen] = useState(false);
  const [showMinhasPendencias, setShowMinhasPendencias] = useState(false);
  const [userEmpreendimentos, setUserEmpreendimentos] = useState<string[]>([]);
  const [loadingEmps, setLoadingEmps] = useState(true);
  
  const { effectiveProfile, user, isImpersonating, isBackofficeOrAdmin } = useAuth();
  const effectiveUserId = (isImpersonating ? effectiveProfile?.id : user?.id) ?? user?.id;
  const navigate = useNavigate();
  const { snapshots: allSnapshots, loading, refetch } = useFluigSnapshots({});
  const [linkedProtocolos, setLinkedProtocolos] = useState<Record<string, string>>({});

  // Fetch linked protocolos for deep links
  useEffect(() => {
    const fetchLinkedProtocolos = async () => {
      if (!allSnapshots.length) return;
      const map: Record<string, string> = {};

      // Step 1: snapshots with solicitacao_interna_id
      const withInternalId = allSnapshots.filter(s => s.solicitacao_interna_id);
      if (withInternalId.length > 0) {
        const ids = withInternalId.map(s => s.solicitacao_interna_id!);
        const { data } = await supabase
          .from('solicitacoes')
          .select('id, protocolo')
          .in('id', ids);
        if (data) {
          for (const sol of data) {
            const snap = withInternalId.find(s => s.solicitacao_interna_id === sol.id);
            if (snap && sol.protocolo) map[snap.solicitacao_fluig] = sol.protocolo;
          }
        }
      }

      // Step 2: fallback via numero_chamado_fluig
      const unmapped = allSnapshots.filter(s => !map[s.solicitacao_fluig]);
      if (unmapped.length > 0) {
        const fluigNumbers = unmapped.map(s => s.solicitacao_fluig);
        const { data } = await supabase
          .from('solicitacoes')
          .select('numero_chamado_fluig, protocolo')
          .in('numero_chamado_fluig', fluigNumbers);
        if (data) {
          for (const sol of data) {
            if (sol.numero_chamado_fluig && sol.protocolo) {
              map[sol.numero_chamado_fluig] = sol.protocolo;
            }
          }
        }
      }

      setLinkedProtocolos(map);
    };
    fetchLinkedProtocolos();
  }, [allSnapshots]);

  // Fetch user's assigned empreendimentos
  useEffect(() => {
    const fetchUserEmps = async () => {
      if (!effectiveUserId) return;
      
      const { data } = await supabase
        .from('user_empreendimentos')
        .select('empreendimento')
        .eq('user_id', effectiveUserId);
      
      const emps = data?.map(e => e.empreendimento) || [];
      setUserEmpreendimentos(emps);
      
      // Set default tab to first available empreendimento
      const hasTodos = emps.includes('todos');
      if (hasTodos || emps.some(e => e === 'mega_curitiba')) {
        setEmpreendimentoTab('curitiba');
      } else if (emps.some(e => e === 'mega_itajai')) {
        setEmpreendimentoTab('itajai');
      } else if (emps.some(e => e === 'mega_esteio')) {
        setEmpreendimentoTab('esteio');
      }
      setLoadingEmps(false);
    };
    fetchUserEmps();
  }, [effectiveUserId]);

  // Check if user can access specific empreendimento tab
  const canAccessEmpreendimento = (emp: 'curitiba' | 'itajai' | 'esteio') => {
    if (userEmpreendimentos.includes('todos')) return true;
    const empMap: Record<string, string> = {
      curitiba: 'mega_curitiba',
      itajai: 'mega_itajai',
      esteio: 'mega_esteio',
    };
    return userEmpreendimentos.includes(empMap[emp]);
  };

  // Check if current user (or impersonated user) is the responsible for a snapshot
  const isCurrentUserResponsible = (responsavelAtual: string | null) => {
    return isUserResponsibleFluig(effectiveProfile?.full_name || null, responsavelAtual);
  };

  // Get the final conclusion date for a snapshot
  const getDataConclusao = (s: Snapshot): Date | null => getDataConclusaoFluig(s);

  // Calculate duration in days
  const calcularDuracao = (s: Snapshot): { dias: number; status: 'aberto' | 'fechado' | 'cancelado' } => {
    const dataInicio = s.data_lancamento ? new Date(s.data_lancamento) : new Date(s.created_at);
    
    if (isFluigCancelado(s)) {
      // For cancelled, use the most recent date available
      const timestamps = [
        s.gerencia_conclusao,
        s.gerencia_facilities_conclusao,
        s.gerencia_financeiro_conclusao,
        s.diretoria_conclusao,
      ].filter(Boolean).map(t => new Date(t!).getTime());
      
      const dataFim = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();
      return { dias: differenceInDays(dataFim, dataInicio), status: 'cancelado' };
    }
    
    if (isFluigFechado(s)) {
      const dataConclusao = getDataConclusao(s);
      if (dataConclusao) {
        return { dias: differenceInDays(dataConclusao, dataInicio), status: 'fechado' };
      }
    }
    
    // Still open
    return { dias: differenceInDays(new Date(), dataInicio), status: 'aberto' };
  };

  // Filter by empreendimento
  const getEmpreendimentoFilter = (emp: 'curitiba' | 'itajai' | 'esteio') => {
    const filters: Record<string, string[]> = {
      curitiba: ['curitiba', 'mega curitiba'],
      itajai: ['itajai', 'itajaí', 'mega itajai', 'mega itajaí'],
      esteio: ['esteio', 'mega esteio'],
    };
    return filters[emp];
  };

  const filterByEmpreendimento = (snapshots: Snapshot[], emp: 'curitiba' | 'itajai' | 'esteio' | null) => {
    if (!emp) return [];
    const keywords = getEmpreendimentoFilter(emp);
    if (!keywords) return [];
    return snapshots.filter(s => {
      const empLower = (s.empreendimento || '').toLowerCase();
      return keywords.some(kw => empLower.includes(kw));
    });
  };

  // Get counts for each empreendimento
  const empCounts = useMemo(() => {
    return {
      curitiba: filterByEmpreendimento(allSnapshots, 'curitiba').length,
      itajai: filterByEmpreendimento(allSnapshots, 'itajai').length,
      esteio: filterByEmpreendimento(allSnapshots, 'esteio').length,
    };
  }, [allSnapshots]);

  // Get user's pending items (where they are responsible or assigned to their role)
  const minhasPendenciasList = useMemo(() => {
    if (!effectiveProfile?.full_name) return [];
    return allSnapshots.filter(s => {
      // Only count open items
      if (isFluigCancelado(s) || isFluigFechado(s)) return false;
      return isCurrentUserResponsible(s.responsavel_atual);
    });
  }, [allSnapshots, effectiveProfile?.full_name]);

  const minhasPendencias = minhasPendenciasList.length;

  // Separate by status within selected empreendimento
  const { abertos, fechados, cancelados } = useMemo(() => {
    const filtered = filterByEmpreendimento(allSnapshots, empreendimentoTab);
    const cancelados = filtered.filter(isFluigCancelado);
    const fechados = filtered.filter(s => !isFluigCancelado(s) && isFluigFechado(s));
    const abertos = filtered.filter(s => !isFluigCancelado(s) && !isFluigFechado(s));
    return { abertos, fechados, cancelados };
  }, [allSnapshots, empreendimentoTab]);

  // KPI calculations
  const kpis = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    const filtered = filterByEmpreendimento(allSnapshots, empreendimentoTab);

    // Novas este mês: data_lancamento no mês atual
    const novasEsteMes = filtered.filter(s => {
      if (!s.data_lancamento) return false;
      const date = new Date(s.data_lancamento);
      return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
    }).length;

    const novasMesAnterior = filtered.filter(s => {
      if (!s.data_lancamento) return false;
      const date = new Date(s.data_lancamento);
      return isWithinInterval(date, { start: previousMonthStart, end: previousMonthEnd });
    }).length;

    // Concluídas este mês: data de conclusão no mês atual
    const concluidasEsteMes = filtered.filter(s => {
      if (isFluigCancelado(s)) return false;
      const dataConclusao = getDataConclusao(s);
      if (!dataConclusao) return false;
      return isWithinInterval(dataConclusao, { start: currentMonthStart, end: currentMonthEnd });
    }).length;

    const concluidasMesAnterior = filtered.filter(s => {
      if (isFluigCancelado(s)) return false;
      const dataConclusao = getDataConclusao(s);
      if (!dataConclusao) return false;
      return isWithinInterval(dataConclusao, { start: previousMonthStart, end: previousMonthEnd });
    }).length;

    // Backlog: total de abertos
    const backlog = filtered.filter(s => !isFluigCancelado(s) && !isFluigFechado(s)).length;

    // Para comparar backlog com mês anterior, precisamos simular o estado no final do mês anterior
    // Simplificação: usamos o mesmo valor como referência (não temos snapshot histórico)
    // Então vamos contar quantos abertos existiam no final do mês passado aproximadamente
    // = abertos atuais + concluídos este mês - novos este mês
    const backlogMesAnterior = Math.max(0, backlog + concluidasEsteMes - novasEsteMes);

    // Tempo médio: média de dias dos concluídos este mês
    const concluidosEsteMesSnapshots = filtered.filter(s => {
      if (isFluigCancelado(s)) return false;
      const dataConclusao = getDataConclusao(s);
      if (!dataConclusao) return false;
      return isWithinInterval(dataConclusao, { start: currentMonthStart, end: currentMonthEnd });
    });

    const tempoMedioEsteMes = concluidosEsteMesSnapshots.length > 0
      ? Math.round(concluidosEsteMesSnapshots.reduce((acc, s) => acc + calcularDuracao(s).dias, 0) / concluidosEsteMesSnapshots.length)
      : 0;

    const concluidosMesAnteriorSnapshots = filtered.filter(s => {
      if (isFluigCancelado(s)) return false;
      const dataConclusao = getDataConclusao(s);
      if (!dataConclusao) return false;
      return isWithinInterval(dataConclusao, { start: previousMonthStart, end: previousMonthEnd });
    });

    const tempoMedioMesAnterior = concluidosMesAnteriorSnapshots.length > 0
      ? Math.round(concluidosMesAnteriorSnapshots.reduce((acc, s) => acc + calcularDuracao(s).dias, 0) / concluidosMesAnteriorSnapshots.length)
      : 0;

    return {
      novasEsteMes,
      novasMesAnterior,
      concluidasEsteMes,
      concluidasMesAnterior,
      backlog,
      backlogMesAnterior,
      tempoMedioEsteMes,
      tempoMedioMesAnterior,
    };
  }, [allSnapshots, empreendimentoTab]);

  const currentSnapshots = statusTab === 'abertos' ? abertos : statusTab === 'fechados' ? fechados : cancelados;

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const formatDateShort = (date: string | null) => {
    if (!date) return '-';
    try {
      return formatBR(date, "dd/MM/yy");
    } catch {
      return date;
    }
  };


  // Build Fluig portal URL
  const getFluigUrl = (numero: string) => {
    return `https://portal.capitalrealty.com.br/portal/p/1/pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=${numero}`;
  };

  // Duration badge component
  const DurationBadge = ({ snapshot }: { snapshot: Snapshot }) => {
    const { dias, status } = calcularDuracao(snapshot);
    
    if (status === 'fechado') {
      return (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {dias}d
        </span>
      );
    }
    
    if (status === 'cancelado') {
      return (
        <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
          {dias}d
        </span>
      );
    }
    
    // Aberto: color code based on duration
    let colorClass = 'text-green-600';
    if (dias > 15) {
      colorClass = 'text-red-600';
    } else if (dias > 7) {
      colorClass = 'text-yellow-600';
    }
    
    return (
      <span className={cn("text-xs font-medium whitespace-nowrap", colorClass)}>
        {dias}d
      </span>
    );
  };

  const ApprovalCell = ({ responsavel, conclusao, rejected }: { responsavel: string | null; conclusao: string | null; rejected?: boolean }) => {
    if (!conclusao) {
      return <span className="text-muted-foreground/40">-</span>;
    }
    const dateStr = formatDateShort(conclusao);
    
    // If rejected, show X icon in red
    if (rejected) {
      return (
        <div className="flex flex-col items-center text-destructive">
          <div className="flex items-center gap-1">
            <XCircle className="h-3 w-3 flex-shrink-0" />
            <span className="text-xs font-medium" title={responsavel || undefined}>
              {formatResponsavelFluig(responsavel)}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">{dateStr}</span>
        </div>
      );
    }
    
    // If System:Auto or empty, just show checkmark with date
    if (!responsavel || responsavel === 'System:Auto') {
      return (
        <div className="flex flex-col items-center text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-[10px] text-muted-foreground">{dateStr}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center text-success">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
          <span className="text-xs font-medium" title={responsavel}>
            {formatResponsavelFluig(responsavel)}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">{dateStr}</span>
      </div>
    );
  };

  const handleImportComplete = () => {
    setImportOpen(false);
    refetch();
  };

  const currentMonthName = formatBR(new Date(), 'MMMM');

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Painel Fluig</h1>
            <p className="text-muted-foreground">
              Acompanhe as solicitações do Fluig
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
                Atualizar
              </Button>
              <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-1" />
                    Importar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                  <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle>Importar Planilha Fluig</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <FluigImport onImportComplete={handleImportComplete} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {/* Última atualização */}
            {!loading && allSnapshots.length > 0 && (() => {
              const lastUpdate = allSnapshots.reduce((latest, s) => {
                if (!s.importado_em) return latest;
                const date = new Date(s.importado_em);
                return date > latest ? date : latest;
              }, new Date(0));
              
              if (lastUpdate.getTime() === 0) return null;
              
              return (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Última atualização: {formatBR(lastUpdate, "dd/MM/yyyy 'às' HH:mm")}
                </p>
              );
            })()}
          </div>
        </div>

        {/* KPIs Section */}
        {!loadingEmps && empreendimentoTab && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KPICard
              title={`Novas (${currentMonthName.slice(0, 3)})`}
              value={kpis.novasEsteMes}
              previousValue={kpis.novasMesAnterior}
              icon={Calendar}
              tooltip="Solicitações criadas neste mês"
            />
            <KPICard
              title={`Concluídas (${currentMonthName.slice(0, 3)})`}
              value={kpis.concluidasEsteMes}
              previousValue={kpis.concluidasMesAnterior}
              icon={CheckCircle2}
              tooltip="Solicitações finalizadas neste mês"
            />
            <KPICard
              title="Backlog"
              value={kpis.backlog}
              previousValue={kpis.backlogMesAnterior}
              icon={Inbox}
              invertTrend
              tooltip="Total de solicitações em aberto"
            />
            <KPICard
              title="Tempo médio"
              value={kpis.tempoMedioEsteMes}
              previousValue={kpis.tempoMedioMesAnterior}
              icon={Timer}
              invertTrend
              suffix="d"
              tooltip="Média de dias para concluir (concluídos este mês)"
            />
          </div>
        )}

        {/* Minhas Pendências Card */}
        {effectiveProfile && minhasPendencias > 0 && (
          <Card className="mb-4 border-warning bg-warning/10 overflow-hidden">
            <CardContent 
              className="py-3 px-4 flex items-center gap-3 cursor-pointer hover:bg-warning/20 transition-colors"
              onClick={() => setShowMinhasPendencias(!showMinhasPendencias)}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning text-warning-foreground font-bold text-lg">
                {minhasPendencias}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-warning-foreground">Minhas Pendências</p>
                <p className="text-sm text-muted-foreground">
                  Você tem {minhasPendencias} {minhasPendencias === 1 ? 'solicitação aguardando' : 'solicitações aguardando'} sua ação
                </p>
              </div>
              {showMinhasPendencias ? (
                <ChevronUp className="h-5 w-5 text-warning-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-warning-foreground" />
              )}
            </CardContent>
            
            {/* Lista de pendências */}
            {showMinhasPendencias && (
              <div className="border-t border-warning/30 bg-background/50">
                <div className="divide-y divide-border">
                  {minhasPendenciasList.map((item) => (
                    <div 
                      key={item.id} 
                      className="px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a
                            href={getFluigUrl(item.solicitacao_fluig)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.solicitacao_fluig}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <span className="text-xs text-muted-foreground">
                            {item.empreendimento}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {item.servico || 'Sem descrição'}
                        </p>
                        {item.fornecedor && (
                          <p className="text-xs text-muted-foreground truncate">
                            Fornecedor: {item.fornecedor}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="font-semibold text-sm">{formatCurrency(item.valor)}</p>
                        <p className="text-xs text-muted-foreground">{formatDateShort(item.data_lancamento)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Empreendimento Tabs */}
        {loadingEmps ? (
          <div className="py-4 text-center text-muted-foreground">Carregando...</div>
        ) : userEmpreendimentos.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Você não está vinculado a nenhum empreendimento.</p>
            <p className="text-sm text-muted-foreground mt-1">Solicite acesso ao administrador.</p>
          </div>
        ) : (
          <>
            <Tabs value={empreendimentoTab || undefined} onValueChange={(v) => setEmpreendimentoTab(v as any)} className="mb-4">
              <TabsList className={cn("grid w-full max-w-lg", 
                [canAccessEmpreendimento('curitiba'), canAccessEmpreendimento('itajai'), canAccessEmpreendimento('esteio')].filter(Boolean).length === 1 ? "grid-cols-1" :
                [canAccessEmpreendimento('curitiba'), canAccessEmpreendimento('itajai'), canAccessEmpreendimento('esteio')].filter(Boolean).length === 2 ? "grid-cols-2" : "grid-cols-3"
              )}>
                {canAccessEmpreendimento('curitiba') && (
                  <TabsTrigger value="curitiba" className="text-sm">
                    Mega Curitiba ({empCounts.curitiba})
                  </TabsTrigger>
                )}
                {canAccessEmpreendimento('itajai') && (
                  <TabsTrigger value="itajai" className="text-sm">
                    Mega Itajaí ({empCounts.itajai})
                  </TabsTrigger>
                )}
                {canAccessEmpreendimento('esteio') && (
                  <TabsTrigger value="esteio" className="text-sm">
                    Mega Esteio ({empCounts.esteio})
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>

        {/* Status Tabs */}
        <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as any)}>
          <TabsList className="mb-4 grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="abertos" className="gap-2">
              <Clock className="h-4 w-4" />
              Abertos ({abertos.length})
            </TabsTrigger>
            <TabsTrigger value="fechados" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Fechados ({fechados.length})
            </TabsTrigger>
            <TabsTrigger value="cancelados" className="gap-2">
              <XCircle className="h-4 w-4" />
              Cancelados ({cancelados.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusTab} className="mt-0">
            <Card className="overflow-hidden border">
              {loading ? (
                <div className="py-12 text-center">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : currentSnapshots.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Nenhum registro</p>
                </div>
              ) : (
                <TooltipProvider delayDuration={200}>
                  <ScrollArea className="h-[500px]">
                    <table className="w-full text-sm text-center table-fixed">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-primary text-primary-foreground">
                        <th className="w-[80px] px-2 py-2.5 font-semibold">Nº</th>
                        <th className="w-[70px] px-2 py-2.5 font-semibold">Data</th>
                        <th className="w-[50px] px-2 py-2.5 font-semibold">Dias</th>
                        <th className="w-[85px] px-2 py-2.5 font-semibold">Valor</th>
                        <th className="w-[140px] px-2 py-2.5 font-semibold text-left">Descrição</th>
                        <th className="w-[110px] px-2 py-2.5 font-semibold text-left">Fornecedor</th>
                        {statusTab === 'abertos' && (
                          <th className="w-[90px] px-2 py-2.5 font-semibold">Responsável</th>
                        )}
                        <th className="w-[85px] px-2 py-2.5 font-semibold">Facilities</th>
                        <th className="w-[85px] px-2 py-2.5 font-semibold">Financeiro</th>
                        <th className="w-[85px] px-2 py-2.5 font-semibold">Diretoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {currentSnapshots.map((snapshot, idx) => {
                        const approval = getFluigApprovalStatus(snapshot);
                        const isMyResponsibility = isCurrentUserResponsible(snapshot.responsavel_atual);
                        
                        return (
                          <tr 
                            key={snapshot.id} 
                            className={cn(
                              "hover:bg-muted/50 transition-colors",
                              idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                              isMyResponsibility && "bg-warning/20 hover:bg-warning/30 border-l-4 border-l-warning"
                            )}
                          >
                            <td className="px-2 py-2">
                              <a 
                                href={getFluigUrl(snapshot.solicitacao_fluig)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-primary hover:underline inline-flex items-center gap-1 justify-center"
                              >
                                {snapshot.solicitacao_fluig}
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                              {linkedProtocolos[snapshot.solicitacao_fluig] && (
                                <button
                                  onClick={() => navigate(
                                    isBackofficeOrAdmin
                                      ? `/backoffice?search=${linkedProtocolos[snapshot.solicitacao_fluig]}`
                                      : `/minhas-solicitacoes?search=${linkedProtocolos[snapshot.solicitacao_fluig]}`
                                  )}
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mx-auto"
                                >
                                  <FileText className="h-3 w-3" />
                                  #{linkedProtocolos[snapshot.solicitacao_fluig]}
                                </button>
                              )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {formatDateShort(snapshot.data_lancamento)}
                            </td>
                            <td className="px-2 py-2">
                              <DurationBadge snapshot={snapshot} />
                            </td>
                            <td className="px-2 py-2 font-medium whitespace-nowrap">
                              {formatCurrency(snapshot.valor)}
                            </td>
                            <td className="px-2 py-1.5 text-left">
                              {snapshot.servico ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs line-clamp-2 cursor-help">
                                      {snapshot.servico}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs">
                                    <p className="text-xs">{snapshot.servico}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-left">
                              {snapshot.fornecedor ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs line-clamp-2 cursor-help">
                                      {snapshot.fornecedor}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs">
                                    <p className="text-xs">{snapshot.fornecedor}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            {statusTab === 'abertos' && (
                              <td className="px-2 py-2">
                                {(() => {
                                  const timestamps = [
                                    snapshot.gerencia_conclusao,
                                    snapshot.gerencia_facilities_conclusao,
                                    snapshot.gerencia_financeiro_conclusao,
                                    snapshot.diretoria_conclusao,
                                  ].filter(Boolean).map(t => new Date(t!).getTime());
                                  
                                  const lastChangeTime = timestamps.length > 0 
                                    ? Math.max(...timestamps)
                                    : (snapshot.data_lancamento ? new Date(snapshot.data_lancamento).getTime() : new Date(snapshot.created_at).getTime());
                                  
                                  const diasCom = differenceInDays(new Date(), new Date(lastChangeTime));
                                  const tempoCom = `${diasCom}d`;
                                  
                                  return isMyResponsibility ? (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning text-warning-foreground text-xs font-semibold">
                                        VOCÊ
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">{tempoCom}</span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="font-medium text-xs" title={snapshot.responsavel_atual || undefined}>
                                        {formatResponsavelFluig(snapshot.responsavel_atual)}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">{tempoCom}</span>
                                    </div>
                                  );
                                })()}
                              </td>
                            )}
                            <td className="px-2 py-2">
                              <ApprovalCell 
                                responsavel={approval.facilitiesResponsavel} 
                                conclusao={approval.facilitiesConclusao}
                                rejected={approval.facilities === 'rejected'}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <ApprovalCell 
                                responsavel={approval.financeiroResponsavel} 
                                conclusao={approval.financeiroConclusao}
                                rejected={approval.financeiro === 'rejected'}
                              />
                            </td>
                            <td className="px-2 py-2">
                              {approval.diretoria === 'not_required' ? (
                                <span className="text-[10px] text-muted-foreground">N/A</span>
                              ) : (
                                <ApprovalCell 
                                  responsavel={approval.diretoriaResponsavel} 
                                  conclusao={approval.diretoriaConclusao}
                                  rejected={approval.diretoria === 'rejected'}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </TooltipProvider>
              )}
            </Card>
          </TabsContent>
        </Tabs>
          </>
        )}
      </div>
    </>
  );
}
