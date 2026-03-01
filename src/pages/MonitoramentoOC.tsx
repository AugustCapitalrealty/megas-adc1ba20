import { useEffect, useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EMPREENDIMENTO_LABELS, type Empreendimento, type DocumentoEmitido } from '@/types';
import { 
  FileCheck, Clock, AlertTriangle, XCircle, CheckCircle, 
  DollarSign, CalendarDays, Eye, Loader2, BarChart3,
  FileText, Ban, History
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface OCMonitorRow {
  id: string;
  solicitacao_id: string;
  protocolo: string;
  fornecedor_razao: string | null;
  valor: number;
  empreendimento: Empreendimento;
  status: string;
  cancelamento_pendente: boolean;
  data_oc: string;
  dias_aberto: number;
  tem_nf: boolean;
  documento_numero: string;
  // Acompanhamento data
  ultima_justificativa?: string | null;
  previsao_nf?: string | null;
  previsao_execucao?: string | null;
}

interface AcompanhamentoEvent {
  id: string;
  tipo_acao: string;
  justificativa: string;
  previsao_execucao: string | null;
  previsao_nf: string | null;
  created_at: string;
  user_name: string | null;
}

type MonitorStatus = 'todos' | 'em_prazo' | 'pendente_justificativa' | 'aguardando_nf' | 'adiado_proximo_mes' | 'cancelamento_solicitado' | 'cancelado_aprovado';

const MONITOR_STATUS_LABELS: Record<MonitorStatus, string> = {
  todos: 'Todos',
  em_prazo: 'Em prazo',
  pendente_justificativa: 'Pendente justificativa',
  aguardando_nf: 'Aguardando NF',
  adiado_proximo_mes: 'Adiado próximo mês',
  cancelamento_solicitado: 'Cancel. solicitado',
  cancelado_aprovado: 'Cancelado',
};

export default function MonitoramentoOC() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OCMonitorRow[]>([]);
  const [filterEmpreendimento, setFilterEmpreendimento] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<MonitorStatus>('todos');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<OCMonitorRow | null>(null);
  const [historyEvents, setHistoryEvents] = useState<AcompanhamentoEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch solicitações with OC emitida (documentos_emitidos)
      const { data: docs } = await supabase
        .from('documentos_emitidos')
        .select('id, solicitacao_id, numero_documento, created_at, tipo_documento')
        .eq('tipo_documento', 'OC')
        .order('created_at', { ascending: false });

      if (!docs || docs.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const solIds = [...new Set(docs.map(d => d.solicitacao_id))];

      // Fetch solicitações data
      const { data: sols } = await supabase
        .from('solicitacoes')
        .select('id, protocolo, valor, empreendimento, status, cancelamento_pendente, fornecedor_id')
        .in('id', solIds);

      // Fetch fornecedores
      const fornecedorIds = [...new Set((sols || []).map(s => (s as any).fornecedor_id).filter(Boolean))];
      let fornecedorMap: Record<string, string> = {};
      if (fornecedorIds.length > 0) {
        const { data: fornecedores } = await supabase
          .from('fornecedores')
          .select('id, razao_social, nome_fantasia')
          .in('id', fornecedorIds);
        if (fornecedores) {
          fornecedorMap = Object.fromEntries(
            fornecedores.map(f => [f.id, f.nome_fantasia || f.razao_social || ''])
          );
        }
      }

      // Fetch documentos_fiscais to check if NF exists
      const { data: fiscais } = await supabase
        .from('documentos_fiscais')
        .select('solicitacao_id')
        .in('solicitacao_id', solIds)
        .eq('tipo', 'nota_fiscal');
      
      const nfSet = new Set((fiscais || []).map(f => f.solicitacao_id));

      // Fetch latest oc_acompanhamento per solicitacao
      const { data: acompanhamentos } = await supabase
        .from('oc_acompanhamento' as any)
        .select('solicitacao_id, tipo_acao, justificativa, previsao_execucao, previsao_nf, created_at')
        .in('solicitacao_id', solIds)
        .order('created_at', { ascending: false });

      const latestAcomp: Record<string, any> = {};
      (acompanhamentos || []).forEach((a: any) => {
        if (!latestAcomp[a.solicitacao_id]) latestAcomp[a.solicitacao_id] = a;
      });

      const solMap = Object.fromEntries((sols || []).map(s => [s.id, s]));

      const enrichedRows: OCMonitorRow[] = docs.map(doc => {
        const sol = solMap[doc.solicitacao_id] as any;
        if (!sol) return null;
        const diasAberto = differenceInDays(new Date(), new Date(doc.created_at));
        const acomp = latestAcomp[sol.id];

        return {
          id: doc.id,
          solicitacao_id: sol.id,
          protocolo: sol.protocolo,
          fornecedor_razao: sol.fornecedor_id ? fornecedorMap[sol.fornecedor_id] || null : null,
          valor: sol.valor,
          empreendimento: sol.empreendimento,
          status: sol.status,
          cancelamento_pendente: sol.cancelamento_pendente || false,
          data_oc: doc.created_at,
          dias_aberto: diasAberto,
          tem_nf: nfSet.has(sol.id),
          documento_numero: doc.numero_documento,
          ultima_justificativa: acomp?.justificativa || null,
          previsao_nf: acomp?.previsao_nf || null,
          previsao_execucao: acomp?.previsao_execucao || null,
        };
      }).filter(Boolean) as OCMonitorRow[];

      setRows(enrichedRows);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRowMonitorStatus = (row: OCMonitorRow): MonitorStatus => {
    if (row.status === 'cancelado') return 'cancelado_aprovado';
    if (row.cancelamento_pendente) return 'cancelamento_solicitado';
    if (row.tem_nf) return 'aguardando_nf'; // has NF
    
    const now = new Date();
    const dayOfMonth = now.getDate();
    const ocDate = new Date(row.data_oc);
    const sameMonth = ocDate.getMonth() === now.getMonth() && ocDate.getFullYear() === now.getFullYear();

    if (row.previsao_nf) return 'adiado_proximo_mes';
    if (dayOfMonth >= 23 && !row.tem_nf && !row.previsao_nf) return 'pendente_justificativa';
    if (sameMonth && row.dias_aberto <= 23) return 'em_prazo';
    
    return 'pendente_justificativa';
  };

  const getAgingBadge = (dias: number, hasJustificativa: boolean) => {
    if (dias < 15) return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300">{dias}d</Badge>;
    if (dias <= 23) return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300">{dias}d</Badge>;
    return <Badge variant={hasJustificativa ? 'outline' : 'destructive'} className={hasJustificativa ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300' : ''}>{dias}d</Badge>;
  };

  const getStatusBadge = (status: MonitorStatus) => {
    const config: Record<MonitorStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      todos: { label: 'Todos', variant: 'default', icon: null },
      em_prazo: { label: 'Em prazo', variant: 'outline', icon: <CheckCircle className="h-3 w-3" /> },
      pendente_justificativa: { label: 'Pend. justificativa', variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
      aguardando_nf: { label: 'Aguardando NF', variant: 'secondary', icon: <FileText className="h-3 w-3" /> },
      adiado_proximo_mes: { label: 'Adiado', variant: 'outline', icon: <CalendarDays className="h-3 w-3" /> },
      cancelamento_solicitado: { label: 'Cancel. solicitado', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      cancelado_aprovado: { label: 'Cancelado', variant: 'secondary', icon: <Ban className="h-3 w-3" /> },
    };
    const c = config[status];
    return (
      <Badge variant={c.variant} className="gap-1">
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (filterEmpreendimento !== 'todos' && row.empreendimento !== filterEmpreendimento) return false;
      if (filterStatus !== 'todos' && getRowMonitorStatus(row) !== filterStatus) return false;
      return true;
    });
  }, [rows, filterEmpreendimento, filterStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const activeOCs = rows.filter(r => r.status !== 'cancelado' && r.status !== 'concluida');
    const now = new Date();
    const dayOfMonth = now.getDate();
    return {
      total_ativas: activeOCs.length,
      sem_nf_mes: activeOCs.filter(r => !r.tem_nf).length,
      pendente_justificativa: activeOCs.filter(r => dayOfMonth >= 23 && !r.tem_nf && !r.previsao_nf).length,
      cancelamento_pendente: rows.filter(r => r.cancelamento_pendente).length,
    };
  }, [rows]);

  const openHistory = async (row: OCMonitorRow) => {
    setSelectedRow(row);
    setHistoryOpen(true);
    setHistoryLoading(true);

    try {
      const { data } = await supabase
        .from('oc_acompanhamento' as any)
        .select('id, tipo_acao, justificativa, previsao_execucao, previsao_nf, created_at, user_id')
        .eq('solicitacao_id', row.solicitacao_id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const userIds = [...new Set((data as any[]).map((d: any) => d.user_id).filter(Boolean))];
        let profileMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
          if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || 'Usuário']));
        }

        setHistoryEvents((data as any[]).map((d: any) => ({
          ...d,
          user_name: profileMap[d.user_id] || 'Usuário',
        })));
      } else {
        setHistoryEvents([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistoryEvents([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const TIPO_ACAO_LABELS: Record<string, string> = {
    justificativa_adiamento: 'Justificativa de adiamento',
    previsao_atualizada: 'Previsão atualizada',
    cancelamento_solicitado: 'Cancelamento solicitado',
    cancelamento_aprovado: 'Cancelamento aprovado',
    cancelamento_rejeitado: 'Cancelamento rejeitado',
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitoramento OC x NF</h1>
          <p className="text-muted-foreground">Controle de Ordens de Compra emitidas vs Notas Fiscais recebidas</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpis.total_ativas}</p>
                  <p className="text-xs text-muted-foreground">OCs Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpis.sem_nf_mes}</p>
                  <p className="text-xs text-muted-foreground">Sem NF</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpis.pendente_justificativa}</p>
                  <p className="text-xs text-muted-foreground">Pend. Justificativa</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpis.cancelamento_pendente}</p>
                  <p className="text-xs text-muted-foreground">Cancel. Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <Select value={filterEmpreendimento} onValueChange={setFilterEmpreendimento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Empreendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {Object.entries(EMPREENDIMENTO_LABELS).filter(([k]) => k !== 'todos').map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-56">
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as MonitorStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MONITOR_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto text-sm text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                {filteredRows.length} registro(s)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocolo</TableHead>
                <TableHead>Nº OC</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Data OC</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Status NF</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Nenhuma OC encontrada com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map(row => {
                  const monitorStatus = getRowMonitorStatus(row);
                  return (
                    <TableRow key={row.id} className={cn(
                      row.cancelamento_pendente && 'bg-destructive/5',
                      monitorStatus === 'pendente_justificativa' && 'bg-amber-50/50 dark:bg-amber-950/10'
                    )}>
                      <TableCell className="font-mono text-sm font-medium">#{row.protocolo}</TableCell>
                      <TableCell className="text-sm">{row.documento_numero}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{row.fornecedor_razao || '—'}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(row.valor)}</TableCell>
                      <TableCell className="text-sm">{format(new Date(row.data_oc), 'dd/MM/yy', { locale: ptBR })}</TableCell>
                      <TableCell>{getAgingBadge(row.dias_aberto, !!row.ultima_justificativa)}</TableCell>
                      <TableCell>{getStatusBadge(monitorStatus)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openHistory(row)}>
                          <History className="h-4 w-4 mr-1" />
                          Histórico
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico OC #{selectedRow?.protocolo} — {selectedRow?.documento_numero}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : historyEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento registrado.</p>
            ) : (
              <div className="space-y-4">
                {historyEvents.map(event => (
                  <div key={event.id} className="border-l-2 border-muted pl-4 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {TIPO_ACAO_LABELS[event.tipo_acao] || event.tipo_acao}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm">{event.justificativa}</p>
                    {event.user_name && (
                      <p className="text-xs text-muted-foreground mt-1">por {event.user_name}</p>
                    )}
                    {(event.previsao_execucao || event.previsao_nf) && (
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {event.previsao_execucao && (
                          <span>Prev. execução: {format(new Date(event.previsao_execucao), 'dd/MM/yy')}</span>
                        )}
                        {event.previsao_nf && (
                          <span>Prev. NF: {format(new Date(event.previsao_nf), 'dd/MM/yy')}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}