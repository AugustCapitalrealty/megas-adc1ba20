import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFluigSnapshots, useFluigFilterOptions, type FluigFilters } from '@/hooks/useFluigDashboard';
import { calculateDuration } from '@/lib/fluig-parser';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  Loader2,
  Calendar as CalendarIcon,
  RefreshCw,
  ExternalLink,
  X,
  Clock,
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FluigDashboardProps {
  onNavigateToSolicitacao?: (id: string) => void;
}

export function FluigDashboard({ onNavigateToSolicitacao }: FluigDashboardProps) {
  const [filters, setFilters] = useState<FluigFilters>({});
  const [searchInput, setSearchInput] = useState('');
  
  const { snapshots, loading, refetch } = useFluigSnapshots(filters);
  const { empreendimentos, situacoes, localizacoes, responsaveis, loading: loadingOptions } = useFluigFilterOptions();

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput || undefined }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchInput('');
  };

  const hasFilters = Object.values(filters).some(v => v !== undefined);

  // Stats calculations
  const stats = useMemo(() => {
    const totalValor = snapshots.reduce((acc, s) => acc + (s.valor || 0), 0);
    const pendentes = snapshots.filter(s => !s.diretoria_conclusao).length;
    const aprovados = snapshots.filter(s => s.diretoria_conclusao).length;
    return { total: snapshots.length, totalValor, pendentes, aprovados };
  }, [snapshots]);

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return date;
    }
  };

  const ApprovalCell = ({ responsavel, conclusao }: { responsavel: string | null; conclusao: string | null }) => {
    if (!conclusao) {
      return <span className="text-muted-foreground/50">-</span>;
    }
    
    const formattedDate = conclusao ? (() => {
      try {
        return format(new Date(conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR });
      } catch {
        return conclusao;
      }
    })() : '';

    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1 text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-xs font-medium truncate max-w-[120px]" title={responsavel || undefined}>
            {responsavel || 'Aprovado'}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">{formattedDate}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Solicitações</p>
                <p className="text-2xl font-bold text-primary mt-1">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor Total</p>
                <p className="text-2xl font-bold text-success mt-1">{formatCurrency(stats.totalValor)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendentes</p>
                <p className="text-2xl font-bold text-warning mt-1">{stats.pendentes}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aprovados</p>
                <p className="text-2xl font-bold text-info mt-1">{stats.aprovados}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-[400px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar solicitação, fornecedor ou serviço..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Empreendimento */}
            <Select
              value={filters.empreendimento || 'todos'}
              onValueChange={(v) => setFilters(prev => ({ ...prev, empreendimento: v === 'todos' ? undefined : v }))}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Empreendimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Empreendimentos</SelectItem>
                {empreendimentos.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Situação */}
            <Select
              value={filters.situacao || 'todos'}
              onValueChange={(v) => setFilters(prev => ({ ...prev, situacao: v === 'todos' ? undefined : v }))}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Situações</SelectItem>
                {situacoes.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Responsável */}
            <Select
              value={filters.responsavel || 'todos'}
              onValueChange={(v) => setFilters(prev => ({ ...prev, responsavel: v === 'todos' ? undefined : v }))}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Responsáveis</SelectItem>
                {responsaveis.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date - Início */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[130px] h-9 justify-start text-left font-normal',
                    !filters.dataInicio && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dataInicio ? format(filters.dataInicio, 'dd/MM/yy') : 'Data início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dataInicio}
                  onSelect={(date) => setFilters(prev => ({ ...prev, dataInicio: date || undefined }))}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Date - Fim */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[130px] h-9 justify-start text-left font-normal',
                    !filters.dataFim && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dataFim ? format(filters.dataFim, 'dd/MM/yy') : 'Data fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dataFim}
                  onSelect={(date) => setFilters(prev => ({ ...prev, dataFim: date || undefined }))}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2 ml-auto">
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={refetch} disabled={loading} className="h-9">
                <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden border">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando dados do painel...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-10 w-10 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium">Nenhum registro encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Importe uma planilha do Fluig para começar
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <ScrollArea className="h-[600px]">
              <table className="w-full border-collapse min-w-[1400px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    Solicitação
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    Data de Lançamento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    Fornecedor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Serviço
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    Responsável Atual
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    Gerência Facilities
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    Gerência Financeiro
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    Diretoria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                    Duração
                  </th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {snapshots.map((snapshot, idx) => (
                  <tr 
                    key={snapshot.id} 
                    className={cn(
                      "hover:bg-muted/50 transition-colors",
                      idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                    )}
                  >
                    {/* Solicitação */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{snapshot.solicitacao_fluig}</span>
                        {snapshot.solicitacao_interna_id && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Vinculado
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Data de Lançamento */}
                    <td className="px-4 py-3">
                      <span className="text-sm">{formatDate(snapshot.data_lancamento)}</span>
                    </td>

                    {/* Fornecedor */}
                    <td className="px-4 py-3">
                      <span 
                        className="text-sm block max-w-[200px] truncate" 
                        title={snapshot.fornecedor || undefined}
                      >
                        {snapshot.fornecedor || '-'}
                      </span>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-sm">{formatCurrency(snapshot.valor)}</span>
                    </td>

                    {/* Serviço */}
                    <td className="px-4 py-3">
                      <span 
                        className="text-sm block max-w-[300px] truncate" 
                        title={snapshot.servico || undefined}
                      >
                        {snapshot.servico || '-'}
                      </span>
                    </td>

                    {/* Responsável Atual */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium truncate max-w-[120px]" title={snapshot.responsavel_atual || undefined}>
                          {snapshot.responsavel_atual || '-'}
                        </span>
                        {snapshot.localizacao && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={snapshot.localizacao}>
                            {snapshot.localizacao}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Gerência Facilities */}
                    <td className="px-4 py-3">
                      <ApprovalCell 
                        responsavel={snapshot.gerencia_facilities_responsavel} 
                        conclusao={snapshot.gerencia_facilities_conclusao} 
                      />
                    </td>

                    {/* Gerência Financeiro */}
                    <td className="px-4 py-3">
                      <ApprovalCell 
                        responsavel={snapshot.gerencia_financeiro_responsavel} 
                        conclusao={snapshot.gerencia_financeiro_conclusao} 
                      />
                    </td>

                    {/* Diretoria */}
                    <td className="px-4 py-3">
                      <ApprovalCell 
                        responsavel={snapshot.diretoria_responsavel} 
                        conclusao={snapshot.diretoria_conclusao} 
                      />
                    </td>

                    {/* Duração */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="whitespace-nowrap font-medium">
                          {calculateDuration(snapshot.data_inicio, snapshot.data_fim)}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-3">
                      {snapshot.solicitacao_interna_id && onNavigateToSolicitacao && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onNavigateToSolicitacao(snapshot.solicitacao_interna_id!)}
                          title="Ver solicitação vinculada"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
          </div>
        )}
      </Card>
    </div>
  );
}
