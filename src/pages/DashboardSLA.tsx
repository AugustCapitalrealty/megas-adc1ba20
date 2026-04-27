import { useState, useMemo } from 'react';
import { subDays, subMonths, startOfMonth, startOfYear, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { formatBR } from '@/lib/date-utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Timer,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Filter,
  RefreshCw,
  Search,
  Calendar as CalendarIcon,
  Building2,
  ExternalLink,
  AlertOctagon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useSlaDashboard, SlaFilters } from '@/hooks/useSlaDashboard';
import { useAuth } from '@/hooks/useAuth';
import { SlaBadge, SlaStatus } from '@/components/SlaBadge';
import { SlaTimelineModal } from '@/components/SlaTimelineModal';
import { StatusBadge } from '@/components/ui/status-badge';
import { EMPREENDIMENTO_LABELS, Empreendimento, RequestStatus } from '@/types';
import { cn } from '@/lib/utils';
import { MetaGauge } from '@/components/sla/MetaGauge';
import { SlaDistributionBar } from '@/components/sla/SlaDistributionBar';
import { SlaKpiCard } from '@/components/sla/SlaKpiCard';
import { TopOfensoresCard } from '@/components/sla/TopOfensoresCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

type QuickRange = '7d' | '30d' | '90d' | 'mes' | 'ytd';

const SLA_DIAS_META = 3;

function rangeFor(q: QuickRange): { dataInicio: string; dataFim: string } {
  const today = new Date();
  const fim = format(today, 'yyyy-MM-dd');
  switch (q) {
    case '7d':
      return { dataInicio: format(subDays(today, 6), 'yyyy-MM-dd'), dataFim: fim };
    case '90d':
      return { dataInicio: format(subDays(today, 89), 'yyyy-MM-dd'), dataFim: fim };
    case 'mes':
      return { dataInicio: format(startOfMonth(today), 'yyyy-MM-dd'), dataFim: fim };
    case 'ytd':
      return { dataInicio: format(startOfYear(today), 'yyyy-MM-dd'), dataFim: fim };
    case '30d':
    default:
      return { dataInicio: format(subDays(today, 29), 'yyyy-MM-dd'), dataFim: fim };
  }
}

export default function DashboardSLA() {
  const navigate = useNavigate();
  const { isBackofficeOrAdmin } = useAuth();

  const [quickRange, setQuickRange] = useState<QuickRange | null>('30d');
  const [filters, setFilters] = useState<SlaFilters>({
    ...rangeFor('30d'),
    empreendimento: null,
    statusSla: null,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<{
    id: string;
    protocolo: string;
    diasUteis: number;
    statusSla: SlaStatus;
  } | null>(null);

  const { data, loading, stats, meta, refetch } = useSlaDashboard(filters);

  const filteredData = useMemo(
    () =>
      data.filter(
        (item) =>
          item.protocolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.solicitante_nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()),
      ),
    [data, searchTerm],
  );

  const setRange = (q: QuickRange) => {
    setQuickRange(q);
    const r = rangeFor(q);
    setFilters((prev) => ({ ...prev, ...r }));
  };

  const updateFilter = (key: keyof SlaFilters, value: string | null) => {
    setQuickRange(null);
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? null : value,
    }));
  };

  const toggleSlaFilter = (status: SlaStatus) => {
    updateFilter('statusSla', filters.statusSla === status ? null : status);
  };

  const deltaPercentual = stats.percentualNoPrazo - stats.percentualNoPrazoAnterior;
  const deltaTotal = stats.total - stats.totalAnterior;
  const deltaTempoMedio =
    Math.round((stats.tempoMedio - stats.tempoMedioAnterior) * 10) / 10;

  return (
    <TooltipProvider>
      <PageContainer width="wide">
        <PageHeader
          icon={Timer}
          title="SLA do Backoffice"
          description={`Meta: ${meta}% das solicitações atendidas em até 3 dias úteis`}
          actions={
            <>
            <div className="inline-flex rounded-md border bg-card p-0.5">
              {(['7d', '30d', '90d', 'mes', 'ytd'] as QuickRange[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setRange(q)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                    quickRange === q
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  {q === '7d' && '7 dias'}
                  {q === '30d' && '30 dias'}
                  {q === '90d' && '90 dias'}
                  {q === 'mes' && 'Mês'}
                  {q === 'ytd' && 'Ano'}
                </button>
              ))}
            </div>
            <Button onClick={refetch} variant="outline" size="icon" title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            </>
          }
        />

        {/* HERO — Atingimento da meta */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-card to-muted/30 shadow-sm">
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-[auto_1fr] items-center">
              {/* Gauge */}
              <div className="flex justify-center">
                {loading ? (
                  <Skeleton className="h-[180px] w-[180px] rounded-full" />
                ) : (
                  <MetaGauge
                    value={stats.percentualNoPrazo}
                    meta={meta}
                    metaLabel={`Meta ${SLA_DIAS_META} dias`}
                  />
                )}
              </div>

              {/* Stats summary */}
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Atingimento da meta no período
                  </div>
                  {loading ? (
                    <Skeleton className="mt-2 h-12 w-72" />
                  ) : (
                    (() => {
                      const tempo = stats.tempoMedio;
                      const toneTempo =
                        tempo <= SLA_DIAS_META
                          ? 'text-success'
                          : tempo <= SLA_DIAS_META + 1
                          ? 'text-warning'
                          : 'text-destructive';
                      const statusLabel =
                        stats.percentualNoPrazo >= meta
                          ? 'Meta atingida'
                          : stats.percentualNoPrazo >= meta - 20
                          ? 'Próximo da meta'
                          : 'Abaixo da meta';
                      const statusChipTone =
                        stats.percentualNoPrazo >= meta
                          ? 'bg-success/10 text-success'
                          : stats.percentualNoPrazo >= meta - 20
                          ? 'bg-warning/10 text-warning'
                          : 'bg-destructive/10 text-destructive';
                      return (
                        <>
                          <div className="mt-1 flex items-baseline gap-x-4 gap-y-1 flex-wrap">
                            <span className="text-base font-medium text-muted-foreground">
                              Meta{' '}
                              <span className="text-foreground font-semibold">
                                {SLA_DIAS_META} dias úteis
                              </span>
                            </span>
                            <span className="text-muted-foreground/60">·</span>
                            <span className="text-base font-medium text-muted-foreground">
                              Resultado
                            </span>
                            <span
                              className={cn(
                                'text-4xl font-bold tabular-nums leading-none',
                                toneTempo,
                              )}
                            >
                              {tempo}
                            </span>
                            <span className="text-sm font-medium text-muted-foreground">
                              dias úteis
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                'text-xs font-medium px-2 py-0.5 rounded-full',
                                statusChipTone,
                              )}
                            >
                              {statusLabel}
                            </span>
                            {stats.totalAnterior > 0 && (
                              <span
                                className={cn(
                                  'text-xs font-medium px-2 py-0.5 rounded-full',
                                  deltaPercentual > 0
                                    ? 'bg-success/10 text-success'
                                    : deltaPercentual < 0
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-muted text-muted-foreground',
                                )}
                              >
                                {deltaPercentual > 0 ? '▲' : deltaPercentual < 0 ? '▼' : '—'}{' '}
                                {Math.abs(deltaPercentual)}pp vs. período anterior
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>

                <SlaDistributionBar
                  noPrazo={stats.noPrazo}
                  atencao={stats.atencao}
                  estourado={stats.estourado}
                />

                <div className="pt-2 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Total no período
                    </div>
                    <div className="text-xl font-bold tabular-nums">
                      {stats.total}
                      {stats.totalAnterior > 0 && (
                        <span
                          className={cn(
                            'text-xs font-medium ml-2',
                            deltaTotal > 0
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          ({deltaTotal > 0 ? '+' : ''}
                          {deltaTotal})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI cards (clicáveis para filtrar) */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SlaKpiCard
            label="No prazo"
            value={stats.noPrazo}
            suffix={`de ${stats.total}`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="success"
            active={filters.statusSla === 'no_prazo'}
            onClick={() => toggleSlaFilter('no_prazo')}
            hint="Solicitações respondidas pelo backoffice em até 2 dias úteis."
          />
          <SlaKpiCard
            label="Em atenção"
            value={stats.atencao}
            suffix={`de ${stats.total}`}
            icon={<AlertTriangle className="h-4 w-4" />}
            tone="warning"
            active={filters.statusSla === 'atencao'}
            onClick={() => toggleSlaFilter('atencao')}
            hint="Solicitações entre 2 e 3 dias úteis — ainda dentro da meta, mas no limite."
          />
          <SlaKpiCard
            label="Estourado"
            value={stats.estourado}
            suffix={`de ${stats.total}`}
            icon={<XCircle className="h-4 w-4" />}
            tone="destructive"
            active={filters.statusSla === 'estourado'}
            onClick={() => toggleSlaFilter('estourado')}
            hint="Ultrapassou os 3 dias úteis de meta. Requer ação imediata."
          />
          <SlaKpiCard
            label="Tempo médio"
            value={stats.tempoMedio}
            suffix="dias"
            icon={<TrendingUp className="h-4 w-4" />}
            tone="neutral"
            delta={
              stats.tempoMedioAnterior > 0 ? deltaTempoMedio : null
            }
            deltaPositive="down"
            hint="Média de dias úteis de atendimento. Tempo conta apenas em horário comercial e exclui pendências do solicitante."
          />
        </div>

        {/* Toolbar de filtros + Conteúdo (tabela + top ofensores) */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {/* Toolbar */}
            <Card>
              <CardContent className="p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[140px]">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 justify-start text-left font-normal w-full"
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {filters.dataInicio
                            ? format(parseISO(filters.dataInicio), 'dd/MM/yy')
                            : 'Início'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={
                            filters.dataInicio ? parseISO(filters.dataInicio) : undefined
                          }
                          onSelect={(date) =>
                            updateFilter(
                              'dataInicio',
                              date ? format(date, 'yyyy-MM-dd') : null,
                            )
                          }
                          locale={ptBR}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="min-w-[140px]">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 justify-start text-left font-normal w-full"
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {filters.dataFim
                            ? format(parseISO(filters.dataFim), 'dd/MM/yy')
                            : 'Fim'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={
                            filters.dataFim ? parseISO(filters.dataFim) : undefined
                          }
                          onSelect={(date) =>
                            updateFilter(
                              'dataFim',
                              date ? format(date, 'yyyy-MM-dd') : null,
                            )
                          }
                          locale={ptBR}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="min-w-[160px]">
                    <Select
                      value={filters.empreendimento || 'all'}
                      onValueChange={(value) => updateFilter('empreendimento', value)}
                    >
                      <SelectTrigger className="h-9">
                        <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Empreendimento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos empreendimentos</SelectItem>
                        {Object.entries(EMPREENDIMENTO_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por protocolo ou solicitante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 pl-8"
                    />
                  </div>

                  {filters.statusSla && (
                    <Badge
                      variant="secondary"
                      className="h-9 px-3 cursor-pointer hover:bg-muted"
                      onClick={() => updateFilter('statusSla', null)}
                    >
                      <Filter className="h-3 w-3 mr-1" />
                      {filters.statusSla === 'no_prazo' && 'No prazo'}
                      {filters.statusSla === 'atencao' && 'Atenção'}
                      {filters.statusSla === 'estourado' && 'Estourado'}
                      <XCircle className="h-3 w-3 ml-2" />
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabela */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Solicitações no período</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {filteredData.length}{' '}
                      {filteredData.length === 1 ? 'item' : 'itens'} · clique numa linha
                      para ver o cálculo detalhado
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {loading ? (
                  <div className="space-y-2 px-6 pb-6">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhuma solicitação encontrada para os filtros selecionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-10">Protocolo</TableHead>
                          <TableHead className="h-10">Aberto em</TableHead>
                          <TableHead className="h-10">Solicitante</TableHead>
                          <TableHead className="h-10">Empreendimento</TableHead>
                          <TableHead className="h-10">Status</TableHead>
                          <TableHead className="h-10 text-center">SLA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((item) => (
                          <TableRow
                            key={item.id}
                            className={cn(
                              'cursor-pointer h-12',
                              item.status_sla === 'estourado' && 'bg-destructive/5',
                            )}
                            onClick={() =>
                              setSelectedSolicitacao({
                                id: item.id,
                                protocolo: item.protocolo,
                                diasUteis: item.dias_uteis_backoffice,
                                statusSla: item.status_sla,
                              })
                            }
                          >
                            <TableCell className="font-medium">
                              <button
                                className="hover:underline text-primary font-mono text-xs flex items-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    isBackofficeOrAdmin
                                      ? `/backoffice?search=${item.protocolo}`
                                      : `/minhas-solicitacoes?search=${item.protocolo}`,
                                  );
                                }}
                              >
                                {item.status_sla === 'estourado' && (
                                  <AlertOctagon className="h-3 w-3 text-destructive shrink-0" />
                                )}
                                {item.protocolo}
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </button>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground tabular-nums">
                              {formatBR(item.created_at, 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium truncate max-w-[180px]">
                                {item.solicitante_nome || '—'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs font-normal">
                                {EMPREENDIMENTO_LABELS[item.empreendimento]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={item.status as RequestStatus} />
                            </TableCell>
                            <TableCell className="text-center">
                              <SlaBadge
                                status={item.status_sla}
                                diasUteis={item.dias_uteis_backoffice}
                                showDays={true}
                              />
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

          {/* Sidebar — Top ofensores */}
          <div className="space-y-3">
            <TopOfensoresCard items={stats.topOfensores} />
          </div>
        </div>
      </div>

      {/* Timeline Modal */}
      {selectedSolicitacao && (
        <SlaTimelineModal
          open={!!selectedSolicitacao}
          onOpenChange={(open) => !open && setSelectedSolicitacao(null)}
          solicitacaoId={selectedSolicitacao.id}
          protocolo={selectedSolicitacao.protocolo}
          diasUteis={selectedSolicitacao.diasUteis}
          statusSla={selectedSolicitacao.statusSla}
        />
      )}
    </TooltipProvider>
  );
}
