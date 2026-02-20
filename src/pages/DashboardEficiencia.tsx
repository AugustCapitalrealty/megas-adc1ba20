import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  TrendingDown,
  Zap,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
  Calendar,
  Building2,
  Filter,
  Activity,
  RotateCcw,
  Clock,
  Users,
  Truck,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
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
import { useEficienciaDashboard, type EficienciaFilters } from '@/hooks/useEficienciaDashboard';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { cn } from '@/lib/utils';

type DrilldownFilter = 'all' | 'same_day' | 'backlog' | string;

const EMPREENDIMENTO_COLORS: Record<string, string> = {
  mega_curitiba: 'hsl(var(--primary))',
  mega_itajai: 'hsl(var(--warning))',
  mega_esteio: 'hsl(var(--success))',
};

export default function DashboardEficiencia() {
  const [filters, setFilters] = useState<EficienciaFilters>({
    dataInicio: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    dataFim: format(new Date(), 'yyyy-MM-dd'),
    empreendimento: null,
  });

  const navigate = useNavigate();

  const [showYoY, setShowYoY] = useState(false);
  const [drilldownFilter, setDrilldownFilter] = useState<DrilldownFilter>('all');

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
    return filtered;
  }, [entries, drilldownFilter]);

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

  return (
    <AppLayout>
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

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Data Início
                </Label>
                <Input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Data Fim
                </Label>
                <Input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Empreendimento
                </Label>
                <Select
                  value={filters.empreendimento || 'all'}
                  onValueChange={(v) => handleFilterChange('empreendimento', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(['mega_curitiba', 'mega_itajai', 'mega_esteio'] as const).map(e => (
                      <SelectItem key={e} value={e}>{EMPREENDIMENTO_LABELS[e]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant={drilldownFilter !== 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDrilldownFilter('all')}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {drilldownFilter !== 'all' ? 'Limpar Filtro' : 'Todos'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4 KPI Cards */}
        <TooltipProvider>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Lead Time Médio */}
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
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
                  <TrendingDown className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Same-Day */}
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
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
              backlogCritico > 0 && "border-destructive/50 bg-destructive/5"
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
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p className="text-xs">Solicitações abertas há mais de 15 dias úteis sem documento de OC emitido. Exclui concluídas, rejeitadas e canceladas.</p>
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

          {/* Vazão */}
          <Card>
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
          <Card className="lg:col-span-2">
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
        <Card>
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
          <Card>
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
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Evolução Semanal</CardTitle>
                  <CardDescription>Média de lead time em dias úteis</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="yoy"
                    checked={showYoY}
                    onCheckedChange={(checked) => setShowYoY(!!checked)}
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
          <Card>
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
                <div className="py-8 text-center text-muted-foreground text-sm">Sem dados</div>
              ) : (
                <div className="space-y-2">
                  {topSolicitantes.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                        <span className="text-sm truncate max-w-[250px]">{s.nome}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{s.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Fornecedores */}
          <Card>
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
                <div className="py-8 text-center text-muted-foreground text-sm">Sem dados</div>
              ) : (
                <div className="space-y-2">
                  {topFornecedores.map((f, i) => (
                    <div key={f.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                        <span className="text-sm truncate max-w-[250px]">{f.nome}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{f.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Drill-down Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Detalhamento
              {drilldownFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Filtro ativo: {drilldownFilter === 'same_day' ? 'Same-Day' : drilldownFilter === 'backlog' ? '>15 dias úteis' : drilldownFilter.replace('bucket_', '')}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{filteredEntries.length} solicitações</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma solicitação encontrada para os filtros selecionados
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
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
                    {filteredEntries.slice(0, 100).map((entry) => (
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
                            onClick={(e) => { e.stopPropagation(); navigate(`/minhas-solicitacoes?search=${entry.protocolo}`); }}
                          >
                            {entry.protocolo}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </button>
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.data_oc), 'dd/MM HH:mm', { locale: ptBR })}
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
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
