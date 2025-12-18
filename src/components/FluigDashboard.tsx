import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Building2,
  Calendar as CalendarIcon,
  Filter,
  RefreshCw,
  ExternalLink,
  X,
  Clock,
  User,
  CheckCircle2,
  Link2,
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

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  // Approval cell renderer
  const ApprovalCell = ({ responsavel, conclusao }: { responsavel: string | null; conclusao: string | null }) => {
    if (!conclusao) return <span className="text-muted-foreground">-</span>;
    return (
      <div className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        <span className="text-xs truncate max-w-[100px]" title={responsavel || undefined}>
          {responsavel || 'Aprovado'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label className="text-xs">Buscar</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Solicitação, fornecedor ou serviço..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-9"
                />
                <Button size="sm" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Empreendimento */}
            <div>
              <Label className="text-xs">Empreendimento</Label>
              <Select
                value={filters.empreendimento || 'todos'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, empreendimento: v === 'todos' ? undefined : v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {empreendimentos.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Situação */}
            <div>
              <Label className="text-xs">Situação</Label>
              <Select
                value={filters.situacao || 'todos'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, situacao: v === 'todos' ? undefined : v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {situacoes.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Localização/Etapa */}
            <div>
              <Label className="text-xs">Localização/Etapa</Label>
              <Select
                value={filters.localizacao || 'todos'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, localizacao: v === 'todos' ? undefined : v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {localizacoes.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Responsável */}
            <div>
              <Label className="text-xs">Responsável</Label>
              <Select
                value={filters.responsavel || 'todos'}
                onValueChange={(v) => setFilters(prev => ({ ...prev, responsavel: v === 'todos' ? undefined : v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {responsaveis.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range - Início */}
            <div>
              <Label className="text-xs">Data início (de)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-9 justify-start text-left font-normal',
                      !filters.dataInicio && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataInicio ? format(filters.dataInicio, 'dd/MM/yyyy') : 'Selecionar'}
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
            </div>

            {/* Date range - Fim */}
            <div>
              <Label className="text-xs">Data início (até)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-9 justify-start text-left font-normal',
                      !filters.dataFim && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataFim ? format(filters.dataFim, 'dd/MM/yyyy') : 'Selecionar'}
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Painel Fluig
              {!loading && (
                <Badge variant="secondary" className="ml-2">
                  {snapshots.length} registros
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum registro encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Importe uma planilha para começar
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[100px]">Solicitação</TableHead>
                    <TableHead className="w-[90px]">Data</TableHead>
                    <TableHead className="w-[150px]">Fornecedor</TableHead>
                    <TableHead className="w-[100px] text-right">Valor</TableHead>
                    <TableHead className="w-[200px]">Serviço</TableHead>
                    <TableHead className="w-[120px]">Responsável</TableHead>
                    <TableHead className="w-[100px]">Gerência</TableHead>
                    <TableHead className="w-[100px]">G. Facilities</TableHead>
                    <TableHead className="w-[100px]">G. Financeiro</TableHead>
                    <TableHead className="w-[100px]">Diretoria</TableHead>
                    <TableHead className="w-[120px]">Duração</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((snapshot) => (
                    <TableRow key={snapshot.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{snapshot.solicitacao_fluig}</span>
                          {snapshot.solicitacao_interna_id && (
                            <Badge variant="outline" className="h-5 px-1" title="Vinculado ao sistema">
                              <Link2 className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                        {snapshot.situacao && (
                          <span className="text-xs text-muted-foreground block">{snapshot.situacao}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(snapshot.data_lancamento)}</TableCell>
                      <TableCell>
                        <span className="text-sm truncate block max-w-[150px]" title={snapshot.fornecedor || undefined}>
                          {snapshot.fornecedor || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(snapshot.valor)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm truncate block max-w-[200px]" title={snapshot.servico || undefined}>
                          {snapshot.servico || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[100px]" title={snapshot.responsavel_atual || undefined}>
                            {snapshot.responsavel_atual || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ApprovalCell 
                          responsavel={snapshot.gerencia_responsavel} 
                          conclusao={snapshot.gerencia_conclusao} 
                        />
                      </TableCell>
                      <TableCell>
                        <ApprovalCell 
                          responsavel={snapshot.gerencia_facilities_responsavel} 
                          conclusao={snapshot.gerencia_facilities_conclusao} 
                        />
                      </TableCell>
                      <TableCell>
                        <ApprovalCell 
                          responsavel={snapshot.gerencia_financeiro_responsavel} 
                          conclusao={snapshot.gerencia_financeiro_conclusao} 
                        />
                      </TableCell>
                      <TableCell>
                        <ApprovalCell 
                          responsavel={snapshot.diretoria_responsavel} 
                          conclusao={snapshot.diretoria_conclusao} 
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="whitespace-nowrap">
                            {calculateDuration(snapshot.data_inicio, snapshot.data_fim)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
