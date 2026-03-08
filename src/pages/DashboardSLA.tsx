import { useState } from 'react';
import { subDays } from 'date-fns';
import { formatBR } from '@/lib/date-utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { 
  Timer, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Calendar,
  Building2,
  Info,
  ExternalLink,
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

export default function DashboardSLA() {
  const navigate = useNavigate();
  const { isBackofficeOrAdmin } = useAuth();

  // Default to last 30 days
  const [filters, setFilters] = useState<SlaFilters>({
    dataInicio: formatBR(subDays(new Date(), 30), 'yyyy-MM-dd'),
    dataFim: formatBR(new Date(), 'yyyy-MM-dd'),
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

  const { data, loading, stats, refetch } = useSlaDashboard(filters);

  // Filter by search term
  const filteredData = data.filter(item => 
    item.protocolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.solicitante_nome?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleFilterChange = (key: keyof SlaFilters, value: string | null) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? null : value,
    }));
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Timer className="h-6 w-6 text-primary" />
              Dashboard de SLA
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitoramento do tempo de atendimento do Backoffice (Meta: 3 dias úteis)
            </p>
          </div>
          <Button onClick={refetch} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <TooltipProvider>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Total de Solicitações
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help ml-auto" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    <p className="text-xs">Total de solicitações no período selecionado, excluindo canceladas e rejeitadas.</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stats.total}</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                No Prazo (≤2 dias)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-emerald-700/60 hover:text-emerald-700 cursor-help ml-auto" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    <p className="text-xs">Solicitações onde o backoffice respondeu em até 2 dias úteis. Tempo contado excluindo fins de semana, feriados e períodos em que a solicitação estava aguardando correção.</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                  {stats.noPrazo}
                  <span className="text-sm font-normal ml-2">
                    ({stats.total > 0 ? Math.round((stats.noPrazo / stats.total) * 100) : 0}%)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Atenção (3 dias)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-amber-700/60 hover:text-amber-700 cursor-help ml-auto" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    <p className="text-xs">Solicitações que atingiram exatamente 3 dias úteis de atendimento — no limite da meta. Requerem atenção imediata.</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                  {stats.atencao}
                  <span className="text-sm font-normal ml-2">
                    ({stats.total > 0 ? Math.round((stats.atencao / stats.total) * 100) : 0}%)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4" />
                {'Estourado (>3 dias)'}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-red-700/60 hover:text-red-700 cursor-help ml-auto" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    <p className="text-xs">Solicitações que ultrapassaram a meta de 3 dias úteis de atendimento pelo backoffice. Meta: responder em até 3 dias úteis.</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold text-red-700">
                  {stats.estourado}
                  <span className="text-sm font-normal ml-2">
                    ({stats.total > 0 ? Math.round((stats.estourado / stats.total) * 100) : 0}%)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tempo Médio
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help ml-auto" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">
                    <p className="text-xs">Média de dias úteis de atendimento do backoffice no período. Calculado excluindo fins de semana, feriados e tempo aguardando correção do solicitante.</p>
                  </TooltipContent>
                </Tooltip>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold">
                  {stats.tempoMedio}
                  <span className="text-sm font-normal ml-1">dias</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </TooltipProvider>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  Data Início
                </Label>
                <Input
                  type="date"
                  value={filters.dataInicio || ''}
                  onChange={(e) => handleFilterChange('dataInicio', e.target.value || null)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  Data Fim
                </Label>
                <Input
                  type="date"
                  value={filters.dataFim || ''}
                  onChange={(e) => handleFilterChange('dataFim', e.target.value || null)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Building2 className="h-3.5 w-3.5" />
                  Empreendimento
                </Label>
                <Select
                  value={filters.empreendimento || 'all'}
                  onValueChange={(value) => handleFilterChange('empreendimento', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(EMPREENDIMENTO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Timer className="h-3.5 w-3.5" />
                  Status SLA
                </Label>
                <Select
                  value={filters.statusSla || 'all'}
                  onValueChange={(value) => handleFilterChange('statusSla', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="no_prazo">🟢 No Prazo</SelectItem>
                    <SelectItem value="atencao">🟡 Atenção</SelectItem>
                    <SelectItem value="estourado">🔴 Estourado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Search className="h-3.5 w-3.5" />
                  Buscar
                </Label>
                <Input
                  placeholder="Protocolo ou solicitante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Solicitações</CardTitle>
            <CardDescription>
              Clique em uma linha para ver o detalhamento do cálculo de SLA
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredData.length === 0 ? (
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
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Empreendimento</TableHead>
                      <TableHead>Status Atual</TableHead>
                      <TableHead className="text-center">Passou Cadastro?</TableHead>
                      <TableHead className="text-center">Tempo Backoffice</TableHead>
                      <TableHead className="text-center">Status SLA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow 
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedSolicitacao({
                          id: item.id,
                          protocolo: item.protocolo,
                          diasUteis: item.dias_uteis_backoffice,
                          statusSla: item.status_sla,
                        })}
                      >
                        <TableCell className="font-medium font-mono">
                          <button
                            className="hover:underline text-primary font-mono font-medium flex items-center gap-1"
                            onClick={(e) => { e.stopPropagation(); navigate(isBackofficeOrAdmin ? `/backoffice?search=${item.protocolo}` : `/minhas-solicitacoes?search=${item.protocolo}`); }}
                          >
                            {item.protocolo}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </button>
                        </TableCell>
                        <TableCell>
                          {formatBR(item.created_at, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.solicitante_nome || '-'}</div>
                            <div className="text-xs text-muted-foreground">{item.solicitante_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {EMPREENDIMENTO_LABELS[item.empreendimento]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status as RequestStatus} />
                        </TableCell>
                        <TableCell className="text-center">
                          {item.passou_cadastro ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Sim
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-500">
                              Não
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "font-bold",
                            item.dias_uteis_backoffice <= 2 ? "text-emerald-600" :
                            item.dias_uteis_backoffice <= 3 ? "text-amber-600" :
                            "text-red-600"
                          )}>
                            {item.dias_uteis_backoffice} {item.dias_uteis_backoffice === 1 ? 'dia' : 'dias'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <SlaBadge 
                            status={item.status_sla} 
                            diasUteis={item.dias_uteis_backoffice}
                            showDays={false}
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

        {/* Legend */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <span className="font-medium text-muted-foreground">Legenda:</span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>No Prazo (≤2 dias úteis)</span>
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Atenção (3 dias úteis)</span>
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Estourado ({'>'} 3 dias úteis)</span>
              </span>
            </div>
          </CardContent>
        </Card>
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
    </>
  );
}
