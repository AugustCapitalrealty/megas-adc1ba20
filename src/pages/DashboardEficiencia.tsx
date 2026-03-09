import { useState, useMemo } from 'react';
import { startOfMonth, startOfYear } from 'date-fns';
import { formatBR } from '@/lib/date-utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Timer,
  Zap,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
  Calendar,
  Building2,
  Activity,
  RotateCcw,
  Clock,
  Users,
  Truck,
  Info,
  ExternalLink,
  Search,
  X,
  BarChart3,
  Inbox,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell,
} from 'recharts';
import { useEficienciaDashboard, type EficienciaFilters, type BacklogEntry } from '@/hooks/useEficienciaDashboard';
import { EMPREENDIMENTO_LABELS, STATUS_LABELS, type Empreendimento } from '@/types';
import { cn } from '@/lib/utils';

type DrilldownFilter = 'all' | 'same_day' | 'backlog' | string;

const EMPREENDIMENTO_COLORS: Record<string, string> = {
  mega_curitiba: 'hsl(var(--primary))',
  mega_itajai: 'hsl(var(--warning))',
  mega_esteio: 'hsl(var(--success))',
};

const DRILLDOWN_LABELS: Record<string, string> = {
  all: 'Todas',
  same_day: 'Same-Day (0 dias)',
  backlog: '>15 dias úteis',
  'bucket_0_0': '0 dias (Same-Day)',
  'bucket_1_2': '1–2 dias',
  'bucket_3_5': '3–5 dias',
  'bucket_6_10': '6–10 dias',
  'bucket_11_15': '11–15 dias',
  'bucket_16_Infinity': '15+ dias',
};

function getDefaultDates() {
  return {
    dataInicio: formatBR(startOfMonth(new Date()), 'yyyy-MM-dd'),
    dataFim: formatBR(new Date(), 'yyyy-MM-dd'),
  };
}

const QUICK_RANGES = [
  { label: 'Este mês', fn: () => ({ dataInicio: formatBR(startOfMonth(new Date()), 'yyyy-MM-dd'), dataFim: formatBR(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Este ano', fn: () => ({ dataInicio: formatBR(startOfYear(new Date()), 'yyyy-MM-dd'), dataFim: formatBR(new Date(), 'yyyy-MM-dd') }) },
] as const;

export default function DashboardEficiencia() {
  const defaults = getDefaultDates();
  const [filters, setFilters] = useState<EficienciaFilters>({
    ...defaults,
    empreendimento: null,
  });

  const navigate = useNavigate();
  const { isBackofficeOrAdmin } = useAuth();

  const [showYoY, setShowYoY] = useState(false);
  const [drilldownFilter, setDrilldownFilter] = useState<DrilldownFilter>('all');
  const [searchProtocolo, setSearchProtocolo] = useState('');

  const {
    entries,
    avgLeadTime,
    sameDayPercent,
    sameDayCount,
    backlogCritico,
    ocEmitted,
    histogram,
    weeklyAverages,
    leadTimePorEmpreendimento,
    retrabalho,
    etapas,
    topSolicitantes,
    topFornecedores,
    isLoading,
    refetch,
  } = useEficienciaDashboard(filters);

  const hasFilters = filters.dataInicio !== defaults.dataInicio || filters.dataFim !== defaults.dataFim || filters.empreendimento !== null;

  const clearFilters = () => {
    setFilters({ ...getDefaultDates(), empreendimento: null });
    setDrilldownFilter('all');
    setSearchProtocolo('');
  };

  const applyQuickRange = (range: typeof QUICK_RANGES[number]) => {
    const dates = range.fn();
    setFilters(prev => ({ ...prev, ...dates }));
  };

  // Filtered entries for drill-down table
  const filteredEntries = useMemo(() => {
    let filtered = [...entries];
    if (drilldownFilter === 'same_day') {
      filtered = filtered.filter(e => e.lead_time_dias === 0);
    } else if (drilldownFilter === 'backlog') {
      filtered = filtered.filter(e => e.lead_time_dias > 15);
    } else if (drilldownFilter.startsWith('bucket_')) {
      const [, min, max] = drilldownFilter.split('_');
      filtered = filtered.filter(e =>
        e.lead_time_dias >= parseInt(min) && e.lead_time_dias <= (max === 'Infinity' ? 9999 : parseInt(max))
      );
    }
    if (searchProtocolo.trim()) {
      const q = searchProtocolo.trim().toLowerCase();
      filtered = filtered.filter(e => e.protocolo.toLowerCase().includes(q));
    }
    return filtered;
  }, [entries, drilldownFilter, searchProtocolo]);

  // YoY data
  const yoyData = useMemo(() => {
    if (!showYoY) return weeklyAverages;
    const currentYear = new Date().getFullYear();
    const current = weeklyAverages.filter(w => w.year === currentYear);
    const previous = weeklyAverages.filter(w => w.year === currentYear - 1);
    return current.map((c, i) => ({
      ...c,
      avgAnterior: previous[i]?.avg || null,
    }));
  }, [weeklyAverages, showYoY]);

  const handleFilterChange = (key: keyof EficienciaFilters, value: string | null) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? null : value,
    }));
  };

  const formatDuration = (days: number) => {
    if (days === 0) return 'Mesmo dia';
    if (days === 1) return '1 dia útil';
    return `${days} dias úteis`;
  };

  const retrabalhoPercent = retrabalho.total > 0
    ? Math.round((retrabalho.count / retrabalho.total) * 100)
    : 0;

  const TABLE_LIMIT = 100;
  const displayEntries = filteredEntries.slice(0, TABLE_LIMIT);

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Activity className="h-7 w-7 text-primary" />
              Dashboard de Eficiência
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Lead Time ponta-a-ponta (dias úteis): da criação até o upload da OC/AC
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Filters — inline bar */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Quick Range Buttons */}
          <div className="flex items-center gap-1">
            {QUICK_RANGES.map((range) => (
              <Button
                key={range.label}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => applyQuickRange(range)}
              >
                {range.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={filters.dataInicio}
              onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
            <span className="text-muted-foreground text-xs">—</span>
            <Input
              type="date"
              value={filters.dataFim}
              onChange={(e) => handleFilterChange('dataFim', e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
          </div>

          <Select
            value={filters.empreendimento || 'all'}
            onValueChange={(v) => handleFilterChange('empreendimento', v)}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <Building2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(['mega_curitiba', 'mega_itajai', 'mega_esteio'] as const).map(e => (
                <SelectItem key={e} value={e}>{EMPREENDIMENTO_LABELS[e]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>

        {/* 4 KPI Cards */}
        <TooltipProvider>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Lead Time Médio */}
          <Card
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow",
              drilldownFilter === 'all' && drilldownFilter === 'all' && "ring-2 ring-primary/30"
            )}
            onClick={() => setDrilldownFilter('all')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Lead Time Médio</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p className="text-xs">Média de dias úteis entre a criação da solicitação e o upload do documento de OC/AC pelo backoffice. Exclui fins de semana e feriados.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-9 w-20 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1">
                      {avgLeadTime}
                      <span className="text-sm font-normal text-muted-foreground ml-1">dias úteis</span>
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <Timer className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Same-Day */}
          <Card
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow",
              drilldownFilter === 'same_day' && "ring-2 ring-primary/30"
            )}
            onClick={() => setDrilldownFilter('same_day')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Resolução Same-Day</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p className="text-xs">Percentual de solicitações onde a OC foi emitida no mesmo dia calendário da criação.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-9 w-20 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1">
                      {sameDayPercent}%
                      <span className="text-sm font-normal text-muted-foreground ml-1">({sameDayCount})</span>
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-warning/10">
                  <Zap className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backlog Crítico */}
          <Card
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow",
              drilldownFilter === 'backlog' && "ring-2 ring-primary/30",
              backlogCritico > 0 && "border-destructive/50 bg-destructive/5",
            )}
            onClick={() => setDrilldownFilter('backlog')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Backlog Crítico</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px]">
                        <p className="text-xs">Solicitações com mais de 15 dias úteis de lead time. Clique para filtrar o detalhamento abaixo.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-9 w-20 mt-1" />
                  ) : (
                    <p className={cn("text-3xl font-bold mt-1", backlogCritico > 0 && "text-destructive")}>
                      {backlogCritico}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{'>'}15 dias úteis</span>
                    </p>
                  )}
                </div>
                <div className={cn("p-3 rounded-xl", backlogCritico > 0 ? "bg-destructive/10" : "bg-muted")}>
                  <AlertTriangle className={cn("h-6 w-6", backlogCritico > 0 ? "text-destructive" : "text-muted-foreground")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vazão — now clickable */}
          <Card
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow",
              drilldownFilter === 'all' && "ring-2 ring-primary/30"
            )}
            onClick={() => setDrilldownFilter('all')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Vazão (OCs Emitidas)</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p className="text-xs">Total de OCs/ACs emitidas (documentos uploadados pelo backoffice) no período filtrado.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-9 w-20 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1">
                      {ocEmitted}
                      <span className="text-sm font-normal text-muted-foreground ml-1">no período</span>
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-success/10">
                  <ArrowUpDown className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </TooltipProvider>

        {/* Row: Retrabalho + Lead Time por Empreendimento */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Taxa de Retrabalho */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-warning" />
                Taxa de Retrabalho
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-xs">Percentual de solicitações que foram devolvidas ao solicitante para informações adicionais antes da emissão da OC.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>Solicitações devolvidas para correção</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="text-center space-y-2">
                  <p className="text-4xl font-bold">
                    {retrabalhoPercent}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {retrabalho.count} de {retrabalho.total} solicitações
                  </p>
                  <div className="w-full bg-muted rounded-full h-2.5 mt-3">
                    <div
                      className={cn(
                        "h-2.5 rounded-full transition-all",
                        retrabalhoPercent > 30 ? "bg-destructive" : retrabalhoPercent > 15 ? "bg-warning" : "bg-success"
                      )}
                      style={{ width: `${Math.min(retrabalhoPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead Time por Empreendimento */}
          <Card className="lg:col-span-2" id="lead-time-empreendimento">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Lead Time por Empreendimento
              </CardTitle>
              <CardDescription>Média de dias úteis por unidade</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[240px] w-full" />
              ) : leadTimePorEmpreendimento.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                  Dados insuficientes
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    layout="vertical"
                    data={leadTimePorEmpreendimento.map(e => ({
                      ...e,
                      label: EMPREENDIMENTO_LABELS[e.empreendimento],
                    }))}
                    margin={{ left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 12 }} unit="d" className="fill-muted-foreground" />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} className="fill-muted-foreground" width={80} />
                    <RechartsTooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [`${value} dias úteis`, 'Média']}
                    />
                    <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                      {leadTimePorEmpreendimento.map((entry) => (
                        <Cell
                          key={entry.empreendimento}
                          fill={EMPREENDIMENTO_COLORS[entry.empreendimento] || 'hsl(var(--primary))'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tempo por Etapa */}
        <Card id="tempo-etapa">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Tempo Médio por Etapa
            </CardTitle>
            <CardDescription>Dias úteis médios em cada fase do processo</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : etapas.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Dados insuficientes para o período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={etapas}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="etapa" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} unit="d" className="fill-muted-foreground" />
                  <RechartsTooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => [`${value} dias úteis`, 'Média']}
                  />
                  <Bar dataKey="avgDias" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Charts Row: Histogram + Weekly */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Histogram */}
          <Card id="distribuicao">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição do Lead Time</CardTitle>
              <CardDescription>Em dias úteis — clique em uma faixa para filtrar</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={histogram}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <RechartsTooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data: any) => {
                        if (data) {
                          setDrilldownFilter(`bucket_${data.min}_${data.max}`);
                        }
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Weekly Evolution */}
          <Card id="evolucao-semanal">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Evolução Semanal</CardTitle>
                  <CardDescription>Média de lead time em dias úteis</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="yoy"
                    checked={showYoY}
                    onCheckedChange={setShowYoY}
                  />
                  <Label htmlFor="yoy" className="text-xs cursor-pointer">Comparar Ano Anterior</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : weeklyAverages.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  Dados insuficientes para o período selecionado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={yoyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" unit="d" />
                    <RechartsTooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name={`${new Date().getFullYear()}`}
                      dot={{ r: 3 }}
                    />
                    {showYoY && (
                      <Line
                        type="monotone"
                        dataKey="avgAnterior"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name={`${new Date().getFullYear() - 1}`}
                        dot={{ r: 3 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rankings: Top Solicitantes + Top Fornecedores */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Solicitantes */}
          <Card id="top-solicitantes">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Top 10 Solicitantes
              </CardTitle>
              <CardDescription>Por volume de pedidos no período</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : topSolicitantes.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground text-sm">
                  <BarChart3 className="h-8 w-8 opacity-40" />
                  Nenhum dado no período
                </div>
              ) : (
                <RankingList items={topSolicitantes} />
              )}
            </CardContent>
          </Card>

          {/* Top Fornecedores */}
          <Card id="top-fornecedores">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Top 10 Fornecedores
              </CardTitle>
              <CardDescription>Mais frequentes no período</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : topFornecedores.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground text-sm">
                  <BarChart3 className="h-8 w-8 opacity-40" />
                  Nenhum dado no período
                </div>
              ) : (
                <RankingList items={topFornecedores} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Drill-down Table */}
        <Card id="detalhamento">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Detalhamento
                  {drilldownFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {DRILLDOWN_LABELS[drilldownFilter] || drilldownFilter}
                      <button onClick={(e) => { e.stopPropagation(); setDrilldownFilter('all'); }} className="ml-0.5 hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {filteredEntries.length} solicitações
                  {filteredEntries.length > TABLE_LIMIT && (
                    <span className="text-warning ml-1">(exibindo primeiras {TABLE_LIMIT})</span>
                  )}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar protocolo…"
                  value={searchProtocolo}
                  onChange={(e) => setSearchProtocolo(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : displayEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                <Inbox className="h-10 w-10 opacity-40" />
                <p className="text-sm">Nenhuma solicitação encontrada para os filtros selecionados</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Data Abertura</TableHead>
                      <TableHead>Data Upload OC</TableHead>
                      <TableHead className="text-center">Lead Time (dias úteis)</TableHead>
                      <TableHead>Empreendimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayEntries.map((entry) => (
                      <TableRow
                        key={entry.id}
                        className={cn(
                          entry.lead_time_dias === 0 && "bg-success/5",
                          entry.lead_time_dias > 10 && "bg-destructive/5"
                        )}
                      >
                        <TableCell className="font-mono font-medium">
                          <button
                            className="hover:underline text-primary font-mono font-medium flex items-center gap-1"
                            onClick={(e) => { e.stopPropagation(); navigate(isBackofficeOrAdmin ? `/backoffice?search=${entry.protocolo}` : `/minhas-solicitacoes?search=${entry.protocolo}`); }}
                          >
                            {entry.protocolo}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </button>
                        </TableCell>
                        <TableCell>
                          {formatBR(entry.created_at, 'dd/MM HH:mm')}
                        </TableCell>
                        <TableCell>
                          {formatBR(entry.data_oc, 'dd/MM HH:mm')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={entry.lead_time_dias === 0 ? 'default' : entry.lead_time_dias > 10 ? 'destructive' : 'outline'}
                            className={cn(
                              entry.lead_time_dias === 0 && "bg-success text-success-foreground",
                            )}
                          >
                            {entry.lead_time_dias === 0 && <Zap className="h-3 w-3 mr-1" />}
                            {formatDuration(entry.lead_time_dias)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {EMPREENDIMENTO_LABELS[entry.empreendimento]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/* ── Ranking List with proportional progress bars ── */
function RankingList({ items }: { items: { id: string; nome: string; count: number }[] }) {
  const maxCount = Math.max(...items.map(i => i.count), 1);

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{i + 1}.</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm truncate">{item.nome}</span>
              <span className="text-xs font-medium text-muted-foreground ml-2 shrink-0">{item.count}</span>
            </div>
            <Progress value={(item.count / maxCount) * 100} className="h-1.5" />
          </div>
        </div>
      ))}
    </div>
  );
}
