import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { isFluigFechado, isFluigCancelado } from '@/lib/fluig-utils';
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
import { formatBR } from '@/lib/date-utils';
import {
  Search,
  Loader2,
  Calendar as CalendarIcon,
  RefreshCw,
  ExternalLink,
  X,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FluigDashboardProps {
  onNavigateToSolicitacao?: (id: string) => void;
}

export function FluigDashboard({ onNavigateToSolicitacao }: FluigDashboardProps) {
  const [filters, setFilters] = useState<FluigFilters>({});
  const [searchInput, setSearchInput] = useState('');
  
  const { snapshots, loading, refetch } = useFluigSnapshots(filters);
  const { empreendimentos, situacoes, responsaveis } = useFluigFilterOptions();

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
    const pendentes = snapshots.filter(s => !isFluigCancelado(s) && !isFluigFechado(s)).length;
    const aprovados = snapshots.filter(s => isFluigFechado(s)).length;
    return { total: snapshots.length, totalValor, pendentes, aprovados };
  }, [snapshots]);

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

  // Compact approval cell - just name
  const ApprovalCell = ({ responsavel, conclusao }: { responsavel: string | null; conclusao: string | null }) => {
    if (!conclusao) {
      return <span className="text-muted-foreground/40 text-xs">-</span>;
    }
    
    // Get just first name
    const firstName = responsavel?.split(' ')[0] || 'OK';

    return (
      <div className="flex items-center gap-1 text-success">
        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
        <span className="text-[11px] font-medium truncate" title={responsavel || undefined}>
          {firstName}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards - More Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Total</p>
                <p className="text-xl font-bold text-primary">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Valor</p>
                <p className="text-lg font-bold text-success">{formatCurrency(stats.totalValor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Pendentes</p>
                <p className="text-xl font-bold text-warning">{stats.pendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-info/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-info" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Aprovados</p>
                <p className="text-xl font-bold text-info">{stats.aprovados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar - Compact */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[150px] max-w-[250px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            <Select
              value={filters.empreendimento || 'todos'}
              onValueChange={(v) => setFilters(prev => ({ ...prev, empreendimento: v === 'todos' ? undefined : v }))}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Empreend." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {empreendimentos.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.situacao || 'todos'}
              onValueChange={(v) => setFilters(prev => ({ ...prev, situacao: v === 'todos' ? undefined : v }))}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {situacoes.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.responsavel || 'todos'}
              onValueChange={(v) => setFilters(prev => ({ ...prev, responsavel: v === 'todos' ? undefined : v }))}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {responsaveis.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('h-8 text-xs', !filters.dataInicio && 'text-muted-foreground')}
                >
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {filters.dataInicio ? formatBR(filters.dataInicio, 'dd/MM') : 'De'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dataInicio}
                  onSelect={(date) => setFilters(prev => ({ ...prev, dataInicio: date || undefined }))}
                    locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('h-8 text-xs', !filters.dataFim && 'text-muted-foreground')}
                >
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {filters.dataFim ? formatBR(filters.dataFim, 'dd/MM') : 'Até'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dataFim}
                  onSelect={(date) => setFilters(prev => ({ ...prev, dataFim: date || undefined }))}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-1 ml-auto">
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs px-2">
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={refetch} disabled={loading} className="h-8 text-xs">
                <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table - Compact */}
      <Card className="overflow-hidden border">
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhum registro</p>
          </div>
        ) : (
          <ScrollArea className="h-[550px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-3 py-2.5 text-left font-semibold">Nº</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Data</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Valor</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Responsável Atual</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Facilities</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Financeiro</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Diretoria</th>
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
                    <td className="px-3 py-2">
                      <span className="font-semibold text-primary">{snapshot.solicitacao_fluig}</span>
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDateShort(snapshot.data_lancamento)}
                    </td>

                    <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      {formatCurrency(snapshot.valor)}
                    </td>

                    <td className="px-3 py-2">
                      <span className="font-medium" title={snapshot.responsavel_atual || undefined}>
                        {snapshot.responsavel_atual || '-'}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-center">
                      <ApprovalCell 
                        responsavel={snapshot.gerencia_facilities_responsavel} 
                        conclusao={snapshot.gerencia_facilities_conclusao} 
                      />
                    </td>

                    <td className="px-3 py-2 text-center">
                      <ApprovalCell 
                        responsavel={snapshot.gerencia_financeiro_responsavel} 
                        conclusao={snapshot.gerencia_financeiro_conclusao} 
                      />
                    </td>

                    <td className="px-3 py-2 text-center">
                      <ApprovalCell 
                        responsavel={snapshot.diretoria_responsavel} 
                        conclusao={snapshot.diretoria_conclusao} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
