import { useEffect, useState, useMemo } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { 
  FileCheck, Clock, AlertTriangle, XCircle, CheckCircle, 
  CalendarDays, Loader2, BarChart3, Download,
  FileText, Ban, History, AlertCircle, Search, XOctagon, Scale, X, Inbox
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { OCDetalhesModal } from '@/components/monitoramento/OCDetalhesModal';
import { JustificativaModal } from '@/components/monitoramento/JustificativaModal';
import { TabProjuris } from '@/components/monitoramento/TabProjuris';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface OCMonitorRow {
  id: string;
  solicitacao_id: string;
  protocolo: string;
  fornecedor_razao: string | null;
  valor: number;
  empreendimento: Empreendimento;
  natureza_orcamentaria: string;
  status: string;
  cancelamento_pendente: boolean;
  data_oc: string;
  dias_aberto: number;
  tem_nf: boolean;
  documento_numero: string;
  ultima_justificativa?: string | null;
  previsao_nf?: string | null;
  previsao_execucao?: string | null;
  user_id: string;
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

const EMPREENDIMENTO_BADGE_COLORS: Record<string, string> = {
  mega_curitiba: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  mega_itajai: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
  mega_esteio: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
};

// KPI filter mapping
const KPI_FILTER_MAP: { key: string; status: MonitorStatus }[] = [
  { key: 'total_ativas', status: 'todos' },
  { key: 'sem_nf_mes', status: 'aguardando_nf' },
  { key: 'pendente_justificativa', status: 'pendente_justificativa' },
  { key: 'cancelamento_pendente', status: 'cancelamento_solicitado' },
];

export default function MonitoramentoOC() {
  const { user, effectiveProfile, isImpersonating } = useAuth();
  const effectiveUserId = isImpersonating ? effectiveProfile?.id : user?.id;
  const { empreendimentos: userEmpreendimentos, loading: loadingEmpreendimentos, hasAllAccess } = useUserEmpreendimentos(effectiveUserId);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OCMonitorRow[]>([]);
  const [filterEmpreendimento, setFilterEmpreendimento] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<MonitorStatus>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<OCMonitorRow | null>(null);
  const [historyEvents, setHistoryEvents] = useState<AcompanhamentoEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detailRow, setDetailRow] = useState<OCMonitorRow | null>(null);
  const [justificativaRow, setJustificativaRow] = useState<OCMonitorRow | null>(null);
  const [cancelRow, setCancelRow] = useState<OCMonitorRow | null>(null);
  const [cancelJustificativa, setCancelJustificativa] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);

  const hasActiveFilters = filterEmpreendimento !== 'todos' || filterStatus !== 'todos' || searchTerm !== '';

  const clearFilters = () => {
    setFilterEmpreendimento('todos');
    setFilterStatus('todos');
    setSearchTerm('');
  };

  useEffect(() => {
    if (!loadingEmpreendimentos) {
      fetchData();
    }
  }, [loadingEmpreendimentos]);

  const fetchData = async () => {
    setLoading(true);
    try {
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

      const { data: sols } = await supabase
        .from('solicitacoes')
        .select('id, protocolo, valor, empreendimento, status, cancelamento_pendente, fornecedor_id, natureza_orcamentaria, user_id')
        .in('id', solIds);

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

      const { data: fiscais } = await supabase
        .from('documentos_fiscais')
        .select('solicitacao_id')
        .in('solicitacao_id', solIds);
      
      const nfSet = new Set((fiscais || []).map(f => f.solicitacao_id));

      const { data: acompanhamentos } = await supabase
        .from('oc_acompanhamento')
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
        if (sol.natureza_orcamentaria === 'agua' || sol.natureza_orcamentaria === 'energia_eletrica') return null;
        if (sol.status === 'concluida') return null;
        
        if (!hasAllAccess && !userEmpreendimentos.includes(sol.empreendimento)) return null;

        const diasAberto = differenceInDays(new Date(), new Date(doc.created_at));
        const acomp = latestAcomp[sol.id];

        return {
          id: doc.id,
          solicitacao_id: sol.id,
          protocolo: sol.protocolo,
          fornecedor_razao: sol.fornecedor_id ? fornecedorMap[sol.fornecedor_id] || null : null,
          valor: sol.valor,
          empreendimento: sol.empreendimento,
          natureza_orcamentaria: sol.natureza_orcamentaria,
          status: sol.status,
          cancelamento_pendente: sol.cancelamento_pendente || false,
          data_oc: doc.created_at,
          dias_aberto: diasAberto,
          tem_nf: nfSet.has(sol.id),
          documento_numero: doc.numero_documento,
          ultima_justificativa: acomp?.justificativa || null,
          previsao_nf: (() => {
            const pnf = acomp?.previsao_nf || null;
            if (!pnf) return null;
            const today = new Date().toISOString().slice(0, 10);
            return pnf >= today ? pnf : null;
          })(),
          previsao_execucao: acomp?.previsao_execucao || null,
          user_id: sol.user_id,
        };
      }).filter(Boolean) as OCMonitorRow[];

      enrichedRows.sort((a, b) => b.dias_aberto - a.dias_aberto);
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
    if (row.tem_nf) return 'aguardando_nf';
    
    const now = new Date();
    const dayOfMonth = now.getDate();
    const ocDate = new Date(row.data_oc);
    const sameMonth = ocDate.getMonth() === now.getMonth() && ocDate.getFullYear() === now.getFullYear();

    if (row.previsao_nf) return 'adiado_proximo_mes';
    if (dayOfMonth >= 23 && !row.tem_nf && !row.previsao_nf) return 'pendente_justificativa';
    if (sameMonth && row.dias_aberto <= 23) return 'em_prazo';
    
    return 'pendente_justificativa';
  };

  const getAgingBadge = (dias: number, hasJustificativa: boolean, dataOc: string) => {
    const badge = (
      <Badge 
        variant={dias > 23 && !hasJustificativa ? 'destructive' : 'outline'} 
        className={cn(
          dias < 15 && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300',
          dias >= 15 && dias <= 23 && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300',
          dias > 23 && hasJustificativa && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300'
        )}
      >
        {dias}d
      </Badge>
    );

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>OC emitida em {formatBR(dataOc, 'dd/MM/yyyy')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getStatusBadge = (status: MonitorStatus, previsaoNf?: string | null) => {
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
      <div className="flex flex-col gap-1">
        <Badge variant={c.variant} className="gap-1 w-fit">
          {c.icon}
          {c.label}
        </Badge>
        {status === 'adiado_proximo_mes' && previsaoNf && (
          <span className="text-xs text-muted-foreground">
            Prev. NF: {formatBR(previsaoNf + 'T00:00:00', 'dd/MM/yy')}
          </span>
        )}
      </div>
    );
  };

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (filterEmpreendimento !== 'todos' && row.empreendimento !== filterEmpreendimento) return false;
      if (filterStatus !== 'todos' && getRowMonitorStatus(row) !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchProtocolo = row.protocolo?.toLowerCase().includes(term);
        const matchFornecedor = row.fornecedor_razao?.toLowerCase().includes(term);
        const matchDocumento = row.documento_numero?.toLowerCase().includes(term);
        if (!matchProtocolo && !matchFornecedor && !matchDocumento) return false;
      }
      return true;
    });
  }, [rows, filterEmpreendimento, filterStatus, searchTerm]);

  const kpis = useMemo(() => {
    const activeOCs = rows.filter(r => r.status !== 'cancelado' && r.status !== 'concluida');
    return {
      total_ativas: activeOCs.length,
      sem_nf_mes: activeOCs.filter(r => !r.tem_nf).length,
      pendente_justificativa: activeOCs.filter(r => !r.tem_nf && !r.previsao_nf).length,
      cancelamento_pendente: rows.filter(r => r.cancelamento_pendente).length,
    };
  }, [rows]);

  const availableEmpreendimentos = useMemo(() => {
    if (hasAllAccess) {
      return Object.entries(EMPREENDIMENTO_LABELS).filter(([k]) => k !== 'todos');
    }
    return Object.entries(EMPREENDIMENTO_LABELS).filter(([k]) => k !== 'todos' && userEmpreendimentos.includes(k as Empreendimento));
  }, [userEmpreendimentos, hasAllAccess]);

  const openHistory = async (row: OCMonitorRow) => {
    setSelectedRow(row);
    setHistoryOpen(true);
    setHistoryLoading(true);

    try {
      const { data } = await supabase
        .from('oc_acompanhamento')
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

  const handleSolicitarCancelamento = async () => {
    if (!cancelRow || !user || cancelJustificativa.trim().length < 10) return;
    setCancelSaving(true);
    try {
      const { error: acompError } = await supabase
        .from('oc_acompanhamento')
        .insert({
          solicitacao_id: cancelRow.solicitacao_id,
          tipo_acao: 'cancelamento_solicitado' as const,
          justificativa: cancelJustificativa.trim(),
          user_id: user.id,
        });
      if (acompError) throw acompError;

      const { error: solError } = await supabase
        .from('solicitacoes')
        .update({ cancelamento_pendente: true })
        .eq('id', cancelRow.solicitacao_id);
      if (solError) throw solError;

      toast.success('Solicitação de cancelamento registrada com sucesso');
      setCancelRow(null);
      setCancelJustificativa('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao solicitar cancelamento');
    } finally {
      setCancelSaving(false);
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

  if (loading || loadingEmpreendimentos) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpiCards = [
    { key: 'total_ativas', value: kpis.total_ativas, label: 'OCs Ativas', borderColor: 'border-l-primary', bgColor: 'bg-primary/10', icon: <FileCheck className="h-5 w-5 text-primary" />, targetStatus: 'todos' as MonitorStatus },
    { key: 'sem_nf_mes', value: kpis.sem_nf_mes, label: 'Sem NF', borderColor: 'border-l-amber-500', bgColor: 'bg-amber-500/10', icon: <Clock className="h-5 w-5 text-amber-600" />, targetStatus: 'aguardando_nf' as MonitorStatus },
    { key: 'pendente_justificativa', value: kpis.pendente_justificativa, label: 'Pend. Justificativa', borderColor: 'border-l-destructive', bgColor: 'bg-destructive/10', icon: <AlertTriangle className="h-5 w-5 text-destructive" />, targetStatus: 'pendente_justificativa' as MonitorStatus },
    { key: 'cancelamento_pendente', value: kpis.cancelamento_pendente, label: 'Cancel. Pendentes', borderColor: 'border-l-orange-500', bgColor: 'bg-orange-500/10', icon: <XCircle className="h-5 w-5 text-orange-600" />, targetStatus: 'cancelamento_solicitado' as MonitorStatus },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitoramento</h1>
          <p className="text-muted-foreground">Acompanhe OCs emitidas e solicitações com trâmite jurídico</p>
        </div>

        <Tabs defaultValue="oc-nf" className="space-y-6">
          <TabsList>
            <TabsTrigger value="oc-nf" className="gap-1.5">
              <FileCheck className="h-4 w-4" />
              OC x NF
            </TabsTrigger>
            <TabsTrigger value="projuris" className="gap-1.5">
              <Scale className="h-4 w-4" />
              Projuris
            </TabsTrigger>
          </TabsList>

          <TabsContent value="oc-nf" className="space-y-6">

        {/* KPIs — clickable */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiCards.map(kpi => {
            const isActive = filterStatus === kpi.targetStatus && kpi.targetStatus !== 'todos';
            return (
              <Card
                key={kpi.key}
                className={cn(
                  'border-l-4 cursor-pointer transition-all hover:shadow-md',
                  kpi.borderColor,
                  isActive && 'ring-2 ring-primary shadow-md'
                )}
                onClick={() => setFilterStatus(isActive ? 'todos' : kpi.targetStatus)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', kpi.bgColor)}>
                      {kpi.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters — inline, no Card wrapper */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar protocolo, fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-48">
            <Select value={filterEmpreendimento} onValueChange={setFilterEmpreendimento}>
              <SelectTrigger>
                <SelectValue placeholder="Empreendimento" />
              </SelectTrigger>
              <SelectContent>
                {availableEmpreendimentos.length > 1 && <SelectItem value="todos">Todos</SelectItem>}
                {availableEmpreendimentos.map(([key, label]) => (
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
          <div className="ml-auto flex items-center gap-3">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const data = filteredRows.map(r => ({
                  'Protocolo': r.protocolo,
                  'Nº OC': r.documento_numero,
                  'Empreendimento': EMPREENDIMENTO_LABELS[r.empreendimento],
                  'Fornecedor': r.fornecedor_razao || '-',
                  'Valor (R$)': r.valor,
                  'Dias Aberto': r.dias_aberto,
                  'Status': MONITOR_STATUS_LABELS[getRowMonitorStatus(r)],
                  'Tem NF': r.tem_nf ? 'Sim' : 'Não',
                  'Previsão NF': r.previsao_nf || '-',
                }));
                import('xlsx').then(XLSX => {
                  import('file-saver').then(({ saveAs }) => {
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Monitoramento OC');
                    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    saveAs(blob, `monitoramento_oc_${new Date().toISOString().slice(0, 10)}.xlsx`);
                  });
                });
              }}
              disabled={filteredRows.length === 0}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              {filteredRows.length} registro(s)
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
                <TableHead>Nº OC</TableHead>
                <TableHead>Empreendimento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Data OC</TableHead>
                <TableHead>Dias em aberto</TableHead>
                <TableHead>Status NF</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Inbox className="h-10 w-10 opacity-40" />
                      <p className="text-sm font-medium">Nenhuma OC encontrada</p>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 mt-1">
                          <X className="h-3.5 w-3.5" />
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map(row => {
                  const monitorStatus = getRowMonitorStatus(row);
                  const isOwn = row.user_id === user?.id;
                  return (
                    <TableRow 
                      key={row.id} 
                      className={cn(
                        'cursor-pointer',
                        row.cancelamento_pendente && 'bg-destructive/5',
                        monitorStatus === 'pendente_justificativa' && 'bg-amber-50/50 dark:bg-amber-950/10',
                        isOwn && 'border-l-4 border-l-primary bg-primary/[0.03]'
                      )}
                      onClick={() => setDetailRow(row)}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        #{row.protocolo}
                        {isOwn && (
                          <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-primary" title="Sua solicitação" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{row.documento_numero}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', EMPREENDIMENTO_BADGE_COLORS[row.empreendimento] || '')}>
                          {EMPREENDIMENTO_LABELS[row.empreendimento] || row.empreendimento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{row.fornecedor_razao || '—'}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(row.valor)}</TableCell>
                      <TableCell className="text-sm">{formatBR(row.data_oc, 'dd/MM/yy')}</TableCell>
                      <TableCell>{getAgingBadge(row.dias_aberto, !!row.ultima_justificativa, row.data_oc)}</TableCell>
                      <TableCell>{getStatusBadge(monitorStatus, row.previsao_nf)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {monitorStatus === 'pendente_justificativa' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-8 w-8 text-amber-600 border-amber-300" onClick={() => setJustificativaRow(row)}>
                                    <AlertCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Justificar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {row.status !== 'cancelado' && !row.cancelamento_pendente && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancelRow(row)}>
                                    <XOctagon className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancelar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistory(row)}>
                                  <History className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Histórico</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
          </TabsContent>

          <TabsContent value="projuris">
            <TabProjuris />
          </TabsContent>
        </Tabs>
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
                        {formatBR(event.created_at, "dd/MM/yy HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm">{event.justificativa}</p>
                    {event.user_name && (
                      <p className="text-xs text-muted-foreground mt-1">por {event.user_name}</p>
                    )}
                    {(event.previsao_execucao || event.previsao_nf) && (
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {event.previsao_execucao && (
                          <span>Prev. execução: {formatBR(event.previsao_execucao, 'dd/MM/yy')}</span>
                        )}
                        {event.previsao_nf && (
                          <span>Prev. NF: {formatBR(event.previsao_nf, 'dd/MM/yy')}</span>
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

      {/* Cancellation Request Modal */}
      <Dialog open={!!cancelRow} onOpenChange={(open) => { if (!open) { setCancelRow(null); setCancelJustificativa(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XOctagon className="h-5 w-5 text-destructive" />
              Solicitar Cancelamento — #{cancelRow?.protocolo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              OC nº <strong>{cancelRow?.documento_numero}</strong> • {cancelRow?.fornecedor_razao || 'Sem fornecedor'}
            </p>
            <div>
              <Label htmlFor="cancel-justificativa">Motivo do cancelamento *</Label>
              <Textarea
                id="cancel-justificativa"
                placeholder="Descreva o motivo pelo qual a OC deve ser cancelada (mín. 10 caracteres)..."
                value={cancelJustificativa}
                onChange={(e) => setCancelJustificativa(e.target.value)}
                rows={4}
                className="mt-1"
              />
              {cancelJustificativa.length > 0 && cancelJustificativa.length < 10 && (
                <p className="text-xs text-destructive mt-1">Mínimo 10 caracteres</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelRow(null); setCancelJustificativa(''); }}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSolicitarCancelamento}
              disabled={cancelJustificativa.trim().length < 10 || cancelSaving}
            >
              {cancelSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Solicitar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <OCDetalhesModal
        open={!!detailRow}
        onOpenChange={(open) => !open && setDetailRow(null)}
        solicitacaoId={detailRow?.solicitacao_id || null}
        protocolo={detailRow?.protocolo || null}
      />

      {/* Justification Modal */}
      {justificativaRow && (
        <JustificativaModal
          open={!!justificativaRow}
          onOpenChange={(open) => !open && setJustificativaRow(null)}
          solicitacaoId={justificativaRow.solicitacao_id}
          protocolo={justificativaRow.protocolo}
          onSuccess={fetchData}
        />
      )}
    </>
  );
}
