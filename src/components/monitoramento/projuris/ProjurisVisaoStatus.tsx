import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import {
  EMPREENDIMENTO_LABELS,
  ETAPA_JURIDICA_LABELS,
  ETAPAS_JURIDICAS_ORDEM,
  type Empreendimento,
  type EtapaJuridica,
  type InstrumentoJuridico,
} from '@/types';
import {
  Loader2, BarChart3, Search, Scale, Clock, CheckCircle, PenTool, Eye, X, Inbox, ArrowUpDown,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { OCDetalhesModal } from '@/components/monitoramento/OCDetalhesModal';
import { InstrumentoJuridicoBadge } from '@/components/InstrumentoJuridicoBadge';

interface ProjurisRow {
  id: string;
  protocolo: string;
  numero_projuris: string;
  empreendimento: Empreendimento;
  fornecedor_razao: string | null;
  valor: number;
  instrumento_juridico: InstrumentoJuridico | null;
  status: string;
  etapa_atual: EtapaJuridica | null;
  etapa_data: string | null;
  dias_na_etapa: number;
  user_id: string;
  prioridade_score: number;
}

const EMPREENDIMENTO_BADGE_COLORS: Record<string, string> = {
  mega_curitiba: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  mega_itajai: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
  mega_esteio: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  mega_canoas: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
};

function calcPrioridade(dias: number, valor: number): number {
  const valorScore = valor >= 70000 ? 3 : valor >= 10000 ? 2 : 1;
  return (dias * 2) + valorScore;
}

function getPrioridadeBadge(score: number) {
  if (score >= 20) return <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 text-xs">Alta</Badge>;
  if (score >= 10) return <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 text-xs">Média</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 text-xs">Baixa</Badge>;
}

export function ProjurisVisaoStatus() {
  const { user } = useAuth();
  const { empreendimentos: userEmpreendimentos, loading: loadingEmpreendimentos, hasAllAccess } = useUserEmpreendimentos(user?.id);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProjurisRow[]>([]);
  const [filterEmpreendimento, setFilterEmpreendimento] = useState<string>('todos');
  const [filterEtapa, setFilterEtapa] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('ativos');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailRow, setDetailRow] = useState<ProjurisRow | null>(null);

  const hasActiveFilters = filterEmpreendimento !== 'todos' || filterEtapa !== 'todos' || filterStatus !== 'ativos' || searchTerm !== '';

  const clearFilters = () => {
    setFilterEmpreendimento('todos');
    setFilterEtapa('todos');
    setFilterStatus('ativos');
    setSearchTerm('');
  };

  useEffect(() => {
    if (!loadingEmpreendimentos) fetchData();
  }, [loadingEmpreendimentos]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sols } = await supabase
        .from('solicitacoes')
        .select('id, protocolo, numero_projuris, empreendimento, valor, instrumento_juridico, status, fornecedor_id, user_id')
        .not('numero_projuris', 'is', null);

      if (!sols || sols.length === 0) { setRows([]); setLoading(false); return; }

      const filteredSols = sols.filter(s =>
        hasAllAccess || userEmpreendimentos.includes(s.empreendimento as Empreendimento)
      );
      const solIds = filteredSols.map(s => s.id);

      const fornecedorIds = [...new Set(filteredSols.map(s => s.fornecedor_id).filter(Boolean))];
      let fornecedorMap: Record<string, string> = {};
      if (fornecedorIds.length > 0) {
        const { data: fornecedores } = await supabase
          .from('fornecedores')
          .select('id, razao_social, nome_fantasia')
          .in('id', fornecedorIds);
        if (fornecedores) {
          fornecedorMap = Object.fromEntries(fornecedores.map(f => [f.id, f.nome_fantasia || f.razao_social || '']));
        }
      }

      const { data: acomps } = await supabase
        .from('acompanhamento_juridico')
        .select('solicitacao_id, etapa, created_at')
        .in('solicitacao_id', solIds)
        .order('created_at', { ascending: true });

      const etapaMap: Record<string, { etapa: EtapaJuridica; created_at: string }> = {};
      (acomps || []).forEach((a: any) => {
        etapaMap[a.solicitacao_id] = { etapa: a.etapa as EtapaJuridica, created_at: a.created_at };
      });

      const enrichedRows: ProjurisRow[] = filteredSols.map(sol => {
        const acomp = etapaMap[sol.id];
        const etapaData = acomp?.created_at || null;
        const dias = etapaData ? differenceInDays(new Date(), new Date(etapaData)) : 0;
        return {
          id: sol.id,
          protocolo: sol.protocolo || '',
          numero_projuris: sol.numero_projuris || '',
          empreendimento: sol.empreendimento as Empreendimento,
          fornecedor_razao: sol.fornecedor_id ? fornecedorMap[sol.fornecedor_id] || null : null,
          valor: sol.valor,
          instrumento_juridico: (sol.instrumento_juridico as InstrumentoJuridico) || null,
          status: sol.status,
          etapa_atual: acomp?.etapa || null,
          etapa_data: etapaData,
          dias_na_etapa: dias,
          user_id: sol.user_id,
          prioridade_score: calcPrioridade(dias, sol.valor),
        };
      });

      enrichedRows.sort((a, b) => b.prioridade_score - a.prioridade_score);
      setRows(enrichedRows);
    } catch (error) {
      console.error('Error fetching projuris data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (filterEmpreendimento !== 'todos' && row.empreendimento !== filterEmpreendimento) return false;
      if (filterStatus === 'ativos' && ['concluida', 'cancelado'].includes(row.status)) return false;
      if (filterStatus !== 'todos' && filterStatus !== 'ativos' && row.status !== filterStatus) return false;
      if (filterEtapa !== 'todos') {
        if (filterEtapa === 'sem_etapa' && row.etapa_atual !== null) return false;
        if (filterEtapa !== 'sem_etapa' && row.etapa_atual !== filterEtapa) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!row.protocolo?.toLowerCase().includes(term) && !row.numero_projuris?.toLowerCase().includes(term) && !row.fornecedor_razao?.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [rows, filterEmpreendimento, filterEtapa, filterStatus, searchTerm]);

  const activeRows = useMemo(() => rows.filter(r => !['concluida', 'cancelado'].includes(r.status)), [rows]);

  const kpis = useMemo(() => ({
    total: activeRows.length,
    minuta: activeRows.filter(r => r.etapa_atual === 'minuta_elaboracao' || r.etapa_atual === 'minuta_revisao').length,
    assinatura: activeRows.filter(r => r.etapa_atual === 'enviado_assinatura' || r.etapa_atual === 'assinado_fornecedor' || r.etapa_atual === 'assinado_contratante').length,
    vigente: activeRows.filter(r => r.etapa_atual === 'contrato_vigente').length,
  }), [activeRows]);

  const availableEmpreendimentos = useMemo(() => {
    if (hasAllAccess) return Object.entries(EMPREENDIMENTO_LABELS).filter(([k]) => k !== 'todos');
    return Object.entries(EMPREENDIMENTO_LABELS).filter(([k]) => k !== 'todos' && userEmpreendimentos.includes(k as Empreendimento));
  }, [userEmpreendimentos, hasAllAccess]);

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getAgingBadge = (dias: number) => (
    <Badge variant="outline" className={cn(
      dias < 7 && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300',
      dias >= 7 && dias <= 15 && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300',
      dias > 15 && 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300',
    )}>
      {dias}d
    </Badge>
  );

  if (loading || loadingEmpreendimentos) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Scale className="h-5 w-5 text-primary" /></div>
                <div><p className="text-2xl font-bold">{kpis.total}</p><p className="text-xs text-muted-foreground">Com Projuris (ativos)</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10"><PenTool className="h-5 w-5 text-amber-600" /></div>
                <div><p className="text-2xl font-bold">{kpis.minuta}</p><p className="text-xs text-muted-foreground">Em Minuta</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="h-5 w-5 text-blue-600" /></div>
                <div><p className="text-2xl font-bold">{kpis.assinatura}</p><p className="text-xs text-muted-foreground">Em Assinatura</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
                <div><p className="text-2xl font-bold">{kpis.vigente}</p><p className="text-xs text-muted-foreground">Vigentes</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar protocolo, Projuris, fornecedor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <div className="w-48">
            <Select value={filterEmpreendimento} onValueChange={setFilterEmpreendimento}>
              <SelectTrigger><SelectValue placeholder="Empreendimento" /></SelectTrigger>
              <SelectContent>
                {availableEmpreendimentos.length > 1 && <SelectItem value="todos">Todos</SelectItem>}
                {availableEmpreendimentos.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-56">
            <Select value={filterEtapa} onValueChange={setFilterEtapa}>
              <SelectTrigger><SelectValue placeholder="Etapa jurídica" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as etapas</SelectItem>
                <SelectItem value="sem_etapa">Sem etapa registrada</SelectItem>
                {ETAPAS_JURIDICAS_ORDEM.map(e => <SelectItem key={e} value={e}>{ETAPA_JURIDICA_LABELS[e]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />Limpar filtros
              </Button>
            )}
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />{filteredRows.length} registro(s)
            </div>
          </div>
        </div>

        {/* Table */}
        <Card>
          <ScrollArea className="h-[550px]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Nº Projuris</TableHead>
                    <TableHead>Empreendimento</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Instrumento</TableHead>
                    <TableHead>Etapa Atual</TableHead>
                    <TableHead>Dias na etapa</TableHead>
                    <TableHead><div className="flex items-center gap-1"><ArrowUpDown className="h-3.5 w-3.5" />Prioridade</div></TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Inbox className="h-10 w-10 opacity-40" />
                          <p className="text-sm font-medium">Nenhuma solicitação com Projuris encontrada</p>
                          {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 mt-1"><X className="h-3.5 w-3.5" />Limpar filtros</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map(row => {
                      const isOwn = row.user_id === user?.id;
                      return (
                        <TableRow key={row.id} className={cn('cursor-pointer', isOwn && 'border-l-4 border-l-primary bg-primary/[0.03]')} onClick={() => setDetailRow(row)}>
                          <TableCell className="font-mono text-sm font-medium">
                            #{row.protocolo}
                            {isOwn && <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-primary" title="Sua solicitação" />}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{row.numero_projuris}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-xs', EMPREENDIMENTO_BADGE_COLORS[row.empreendimento] || '')}>
                              {EMPREENDIMENTO_LABELS[row.empreendimento] || row.empreendimento}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{row.fornecedor_razao || '—'}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(row.valor)}</TableCell>
                          <TableCell><InstrumentoJuridicoBadge instrumento={row.instrumento_juridico} /></TableCell>
                          <TableCell>
                            {row.etapa_atual ? (
                              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <Badge variant="secondary" className="text-xs">{ETAPA_JURIDICA_LABELS[row.etapa_atual]}</Badge>
                              </TooltipTrigger>
                              {row.etapa_data && <TooltipContent><p>Desde {formatBR(row.etapa_data, 'dd/MM/yyyy')}</p></TooltipContent>}
                              </Tooltip></TooltipProvider>
                            ) : <span className="text-xs text-muted-foreground">Não iniciado</span>}
                          </TableCell>
                          <TableCell>{row.etapa_atual ? getAgingBadge(row.dias_na_etapa) : '—'}</TableCell>
                          <TableCell>{getPrioridadeBadge(row.prioridade_score)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailRow(row)}><Eye className="h-4 w-4" /></Button>
                              </TooltipTrigger><TooltipContent>Detalhes</TooltipContent></Tooltip></TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </Card>
      </div>

      <OCDetalhesModal
        open={!!detailRow}
        onOpenChange={(open) => !open && setDetailRow(null)}
        solicitacaoId={detailRow?.id || null}
        protocolo={detailRow?.protocolo || null}
      />
    </>
  );
}
