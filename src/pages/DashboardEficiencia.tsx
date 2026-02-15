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
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { useEficienciaDashboard, type EficienciaFilters } from '@/hooks/useEficienciaDashboard';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { cn } from '@/lib/utils';

type DrilldownFilter = 'all' | 'same_day' | 'backlog' | string;

export default function DashboardEficiencia() {
  const [filters, setFilters] = useState<EficienciaFilters>({
    dataInicio: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    dataFim: format(new Date(), 'yyyy-MM-dd'),
    empreendimento: null,
  });

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

  // YoY data - separate current year vs previous year
  const yoyData = useMemo(() => {
    if (!showYoY) return weeklyAverages;
    const currentYear = new Date().getFullYear();
    const current = weeklyAverages.filter(w => w.year === currentYear);
    const previous = weeklyAverages.filter(w => w.year === currentYear - 1);
    // Merge by week index
    const merged = current.map((c, i) => ({
      ...c,
      avgAnterior: previous[i]?.avg || null,
    }));
    return merged;
  }, [weeklyAverages, showYoY]);

  const handleFilterChange = (key: keyof EficienciaFilters, value: string | null) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? null : value,
    }));
  };

  const formatDuration = (days: number) => {
    if (days === 0) return 'Mesmo dia';
    if (days === 1) return '1 dia';
    return `${days} dias`;
  };

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
              Lead Time ponta-a-ponta: da criação da solicitação até a emissão da OC
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Lead Time Médio */}
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setDrilldownFilter('all')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Lead Time Médio</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-20 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1">
                      {avgLeadTime}
                      <span className="text-sm font-normal text-muted-foreground ml-1">dias</span>
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <TrendingDown className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Same-Day Flash */}
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setDrilldownFilter('same_day')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Resolução Same-Day</p>
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
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Backlog Crítico</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-20 mt-1" />
                  ) : (
                    <p className={cn("text-3xl font-bold mt-1", backlogCritico > 0 && "text-destructive")}>
                      {backlogCritico}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{'>'}15 dias</span>
                    </p>
                  )}
                </div>
                <div className={cn("p-3 rounded-xl", backlogCritico > 0 ? "bg-destructive/10" : "bg-muted")}>
                  <AlertTriangle className={cn("h-6 w-6", backlogCritico > 0 ? "text-destructive" : "text-muted-foreground")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Volume vs Vazão */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Vazão (OCs Emitidas)</p>
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

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Histogram */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição do Lead Time</CardTitle>
              <CardDescription>Clique em uma faixa para filtrar a tabela</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={histogram}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip
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

          {/* Line Chart - Weekly Evolution */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Evolução Semanal</CardTitle>
                  <CardDescription>Média de lead time por semana</CardDescription>
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
                <Skeleton className="h-[250px] w-full" />
              ) : weeklyAverages.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  Dados insuficientes para o período selecionado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={yoyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" unit="d" />
                    <Tooltip
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

        {/* Drill-down Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Detalhamento
              {drilldownFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Filtro ativo: {drilldownFilter === 'same_day' ? 'Same-Day' : drilldownFilter === 'backlog' ? '>15 dias' : drilldownFilter.replace('bucket_', '')}
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Data Abertura</TableHead>
                      <TableHead>Data OC</TableHead>
                      <TableHead className="text-center">Tempo Decorrido</TableHead>
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
                          {entry.protocolo}
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
