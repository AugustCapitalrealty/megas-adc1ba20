import { useState, useMemo, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import {
  FileCheck, Clock, AlertTriangle, XCircle, CheckCircle,
  CalendarDays, Loader2, Download, AlertOctagon as AlertOctagonIcon,
  FileText, Ban, History, AlertCircle, Search, XOctagon, Scale, X, Inbox,
  ChevronDown, ChevronRight, Wallet, Layers,
} from 'lucide-react';
import { formatBR } from '@/lib/date-utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { OCDetalhesModal } from '@/components/monitoramento/OCDetalhesModal';
import { JustificativaModal } from '@/components/monitoramento/JustificativaModal';
import { TabProjuris } from '@/components/monitoramento/TabProjuris';
import { OcDistributionBar } from '@/components/monitoramento/OcDistributionBar';
import { TopOfensoresOC } from '@/components/monitoramento/TopOfensoresOC';
import { SlaKpiCard } from '@/components/sla/SlaKpiCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  useMonitoramentoOC,
  computeOcStatus,
  computeGroupStatus,
  type OCGroupRow,
  type OCItem,
  type OcVisualStatus,
} from '@/hooks/useMonitoramentoOC';

type StatusFilter = 'todos' | OcVisualStatus;

const STATUS_LABELS: Record<StatusFilter, string> = {
  todos: 'Todos',
  em_prazo: 'Em prazo',
  atencao: 'Atenção',
  pendente_justificativa: 'Pendente justif.',
  aguardando_nf: 'Aguardando NF',
  adiado: 'Adiado',
  cancel_solicitado: 'Cancel. solicitado',
  cancelado: 'Cancelado',
};

const EMPREENDIMENTO_BADGE_COLORS: Record<string, string> = {
  mega_curitiba: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  mega_itajai: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
  mega_esteio: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
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

function getInitials(name: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

function StatusBadge({ status }: { status: OcVisualStatus }) {
  const config: Record<OcVisualStatus, { label: string; tone: string; icon: React.ReactNode }> = {
    em_prazo: { label: 'Em prazo', tone: 'bg-success/10 text-success border-success/30', icon: <CheckCircle className="h-3 w-3" /> },
    atencao: { label: 'Atenção', tone: 'bg-warning/10 text-warning border-warning/30', icon: <Clock className="h-3 w-3" /> },
    pendente_justificativa: { label: 'Pend. justif.', tone: 'bg-destructive/10 text-destructive border-destructive/30', icon: <AlertTriangle className="h-3 w-3" /> },
    aguardando_nf: { label: 'Com NF', tone: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400', icon: <FileText className="h-3 w-3" /> },
    adiado: { label: 'Adiado', tone: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400', icon: <CalendarDays className="h-3 w-3" /> },
    cancel_solicitado: { label: 'Cancel. solic.', tone: 'bg-destructive/10 text-destructive border-destructive/30', icon: <XCircle className="h-3 w-3" /> },
    cancelado: { label: 'Cancelado', tone: 'bg-muted text-muted-foreground border-border', icon: <Ban className="h-3 w-3" /> },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium border', c.tone)}>
      {c.icon}
      {c.label}
    </Badge>
  );
}

function AgingBadge({ dias, hasJustificativa, dataOc }: { dias: number; hasJustificativa: boolean; dataOc: string }) {
  const tone =
    dias < 15
      ? 'bg-success/10 text-success border-success/30'
      : dias <= 23 || hasJustificativa
      ? 'bg-warning/10 text-warning border-warning/30'
      : 'bg-destructive/10 text-destructive border-destructive/30';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn('font-medium border tabular-nums', tone)}>
            {dias}d
          </Badge>
        </TooltipTrigger>
        <TooltipContent>OC emitida em {formatBR(dataOc, 'dd/MM/yyyy')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function MonitoramentoOC() {
  const { user, effectiveProfile, isImpersonating } = useAuth();
  const effectiveUserId = isImpersonating ? effectiveProfile?.id : user?.id;
  const { empreendimentos: userEmpreendimentos, loading: loadingEmpreendimentos, hasAllAccess } = useUserEmpreendimentos(effectiveUserId);

  const {
    loading,
    groups,
    kpis,
    distribution,
    topOfensores,
    valorEmAberto,
    agingMedio,
    refetch,
  } = useMonitoramentoOC({ userEmpreendimentos, hasAllAccess, enabled: !loadingEmpreendimentos });

  const [filterEmpreendimento, setFilterEmpreendimento] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<OCGroupRow | null>(null);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detailGroup, setDetailGroup] = useState<OCGroupRow | null>(null);
  const [justificativaGroup, setJustificativaGroup] = useState<OCGroupRow | null>(null);
  const [cancelGroup, setCancelGroup] = useState<OCGroupRow | null>(null);
  const [cancelJustificativa, setCancelJustificativa] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);

  const hasActiveFilters = filterEmpreendimento !== 'todos' || filterStatus !== 'todos' || searchTerm !== '';

  const clearFilters = () => {
    setFilterEmpreendimento('todos');
    setFilterStatus('todos');
    setSearchTerm('');
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (filterEmpreendimento !== 'todos' && g.empreendimento !== filterEmpreendimento) return false;
      if (filterStatus !== 'todos') {
        const groupStatus = computeGroupStatus(g);
        if (groupStatus !== filterStatus) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          g.protocolo?.toLowerCase().includes(term) ||
          g.fornecedor_razao?.toLowerCase().includes(term) ||
          g.solicitante_nome?.toLowerCase().includes(term) ||
          g.ocs.some(oc => oc.numero_documento?.toLowerCase().includes(term));
        if (!match) return false;
      }
      return true;
    });
  }, [groups, filterEmpreendimento, filterStatus, searchTerm]);

  const availableEmpreendimentos = useMemo(() => {
    if (hasAllAccess) {
      return Object.entries(EMPREENDIMENTO_LABELS).filter(([k]) => k !== 'todos');
    }
    return Object.entries(EMPREENDIMENTO_LABELS).filter(([k]) => k !== 'todos' && userEmpreendimentos.includes(k as Empreendimento));
  }, [userEmpreendimentos, hasAllAccess]);

  const openHistory = async (group: OCGroupRow) => {
    setSelectedGroup(group);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('oc_acompanhamento')
        .select('id, tipo_acao, justificativa, previsao_execucao, previsao_nf, created_at, user_id')
        .eq('solicitacao_id', group.solicitacao_id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((d: any) => d.user_id).filter(Boolean))];
        let profileMap: Record<string, string> = {};
        if (userIds.length) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
          if (profiles) profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, p.full_name || 'Usuário']));
        }
        setHistoryEvents(data.map((d: any) => ({ ...d, user_name: profileMap[d.user_id] || 'Usuário' })));
      } else {
        setHistoryEvents([]);
      }
    } catch (err) {
      console.error('Error fetching history', err);
      setHistoryEvents([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSolicitarCancelamento = async () => {
    if (!cancelGroup || !user || cancelJustificativa.trim().length < 10) return;
    setCancelSaving(true);
    try {
      const { error: acompError } = await supabase.from('oc_acompanhamento').insert({
        solicitacao_id: cancelGroup.solicitacao_id,
        tipo_acao: 'cancelamento_solicitado' as const,
        justificativa: cancelJustificativa.trim(),
        user_id: user.id,
      });
      if (acompError) throw acompError;

      const { error: solError } = await supabase
        .from('solicitacoes')
        .update({ cancelamento_pendente: true })
        .eq('id', cancelGroup.solicitacao_id);
      if (solError) throw solError;

      toast.success('Solicitação de cancelamento registrada');
      setCancelGroup(null);
      setCancelJustificativa('');
      refetch();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao solicitar cancelamento');
    } finally {
      setCancelSaving(false);
    }
  };

  if (loading || loadingEmpreendimentos) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
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
            {/* HERO: Distribuição + métricas */}
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Distribuição operacional
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <OcDistributionBar
                    data={distribution}
                    onSegmentClick={(key) => {
                      const map: Record<string, StatusFilter> = {
                        em_prazo: 'em_prazo',
                        atencao: 'atencao',
                        pendente: 'pendente_justificativa',
                        adiado: 'adiado',
                        cancel: 'cancel_solicitado',
                      };
                      setFilterStatus(map[key] || 'todos');
                    }}
                  />
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                        <Clock className="h-3.5 w-3.5" />
                        Aging médio
                      </div>
                      <div className="mt-1 text-2xl font-bold tabular-nums">
                        {agingMedio}
                        <span className="text-sm font-normal text-muted-foreground ml-1">dias</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">OCs sem NF</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                        <Wallet className="h-3.5 w-3.5" />
                        Valor em aberto
                      </div>
                      <div className="mt-1 text-2xl font-bold tabular-nums">
                        {valorEmAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">solicitações com OC sem NF</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPIs + Top ofensores */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="grid grid-cols-2 gap-3 lg:col-span-2">
                <SlaKpiCard
                  label="OCs Ativas"
                  value={kpis.total_ativas}
                  icon={<FileCheck className="h-4 w-4" />}
                  tone="neutral"
                  active={filterStatus === 'todos' && !searchTerm && filterEmpreendimento === 'todos'}
                  onClick={() => setFilterStatus('todos')}
                  hint="Total de Ordens de Compra ativas (excluindo concluídas e canceladas)."
                />
                <SlaKpiCard
                  label="Sem NF"
                  value={kpis.sem_nf}
                  icon={<Clock className="h-4 w-4" />}
                  tone="warning"
                  active={filterStatus === 'aguardando_nf'}
                  onClick={() => setFilterStatus(filterStatus === 'aguardando_nf' ? 'todos' : 'aguardando_nf')}
                  hint="OCs ativas que ainda não receberam NF."
                />
                <SlaKpiCard
                  label="Pend. Justificativa"
                  value={kpis.pendente_justificativa}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  tone="destructive"
                  active={filterStatus === 'pendente_justificativa'}
                  onClick={() => setFilterStatus(filterStatus === 'pendente_justificativa' ? 'todos' : 'pendente_justificativa')}
                  hint="OCs sem NF do mês anterior, ou do mês atual após dia 23 sem previsão futura."
                />
                <SlaKpiCard
                  label="Cancel. Pendentes"
                  value={kpis.cancelamento_pendente}
                  icon={<XCircle className="h-4 w-4" />}
                  tone="warning"
                  active={filterStatus === 'cancel_solicitado'}
                  onClick={() => setFilterStatus(filterStatus === 'cancel_solicitado' ? 'todos' : 'cancel_solicitado')}
                  hint="Solicitações com cancelamento aguardando aprovação."
                />
              </div>
              <div className="lg:col-span-1">
                <TopOfensoresOC
                  items={topOfensores}
                  onJustificar={(g) => setJustificativaGroup(g)}
                />
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar protocolo, OC, fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterEmpreendimento} onValueChange={setFilterEmpreendimento}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Empreendimento" /></SelectTrigger>
                <SelectContent>
                  {availableEmpreendimentos.length > 1 && <SelectItem value="todos">Todos empreendimentos</SelectItem>}
                  {availableEmpreendimentos.map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as StatusFilter)}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
                    const data = filteredGroups.flatMap(g =>
                      g.ocs.map(oc => ({
                        'Protocolo': g.protocolo,
                        'Nº OC': oc.numero_documento,
                        'Empreendimento': EMPREENDIMENTO_LABELS[g.empreendimento],
                        'Fornecedor': g.fornecedor_razao || '-',
                        'Solicitante': g.solicitante_nome || '-',
                        'Valor (R$)': g.valor,
                        'Data OC': formatBR(oc.data_oc, 'dd/MM/yyyy'),
                        'Dias Aberto': oc.dias_aberto,
                        'Status': STATUS_LABELS[computeOcStatus(oc, g) as StatusFilter] || '-',
                        'Tem NF': oc.tem_nf ? 'Sim' : 'Não',
                        'Previsão NF': oc.previsao_nf || '-',
                      }))
                    );
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
                  disabled={filteredGroups.length === 0}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {filteredGroups.length} sol. · {filteredGroups.reduce((acc, g) => acc + g.ocs.length, 0)} OCs
                </span>
              </div>
            </div>

            {/* Tabela agrupada */}
            <Card>
              <ScrollArea className="h-[560px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead>Empreendimento</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>OC</TableHead>
                        <TableHead>Aging</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Última ação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-16">
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
                        filteredGroups.map(group => {
                          const isExpanded = expanded.has(group.solicitacao_id);
                          const isOwn = group.user_id === user?.id;
                          const groupStatus = computeGroupStatus(group);
                          const primary = group.primary;
                          const primaryStatus = computeOcStatus(primary, group);
                          const rowTone =
                            primaryStatus === 'pendente_justificativa' ? 'bg-destructive/[0.04]' :
                            primaryStatus === 'atencao' ? 'bg-warning/[0.04]' : '';

                          return (
                            <Fragment key={group.solicitacao_id}>
                              <TableRow
                                className={cn(
                                  'cursor-pointer group',
                                  rowTone,
                                  group.cancelamento_pendente && 'bg-destructive/5',
                                  isOwn && 'border-l-4 border-l-primary',
                                )}
                                onClick={() => setDetailGroup(group)}
                              >
                                <TableCell className="w-8 p-2" onClick={(e) => e.stopPropagation()}>
                                  {group.has_multiple ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => toggleExpand(group.solicitacao_id)}
                                    >
                                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                  ) : null}
                                </TableCell>
                                <TableCell className="font-mono text-sm font-medium">
                                  <div className="flex items-center gap-1.5">
                                    #{group.protocolo}
                                    {isOwn && <span className="inline-block w-2 h-2 rounded-full bg-primary" title="Sua solicitação" />}
                                    {group.has_multiple && (
                                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1">
                                        <Layers className="h-2.5 w-2.5" />
                                        {group.ocs.length} OCs
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Avatar className="h-6 w-6 shrink-0">
                                      <AvatarFallback className="text-[10px] bg-muted">
                                        {getInitials(group.solicitante_nome)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs truncate max-w-[140px]" title={group.solicitante_nome || ''}>
                                      {group.solicitante_nome || '—'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={cn('text-xs', EMPREENDIMENTO_BADGE_COLORS[group.empreendimento] || '')}>
                                    {EMPREENDIMENTO_LABELS[group.empreendimento] || group.empreendimento}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm max-w-[200px] truncate" title={group.fornecedor_razao || ''}>
                                  {group.fornecedor_razao || '—'}
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium tabular-nums">{formatCurrency(group.valor)}</TableCell>
                                <TableCell className="text-sm tabular-nums">
                                  {group.has_multiple ? (
                                    <span className="text-muted-foreground text-xs">
                                      {primary.numero_documento} <span className="opacity-60">+{group.ocs.length - 1}</span>
                                    </span>
                                  ) : (
                                    primary.numero_documento
                                  )}
                                </TableCell>
                                <TableCell>
                                  <AgingBadge dias={primary.dias_aberto} hasJustificativa={!!primary.ultima_justificativa} dataOc={primary.data_oc} />
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-0.5">
                                    <StatusBadge status={groupStatus} />
                                    {groupStatus === 'adiado' && primary.previsao_nf && (
                                      <span className="text-[10px] text-muted-foreground">
                                        Prev: {formatBR(primary.previsao_nf + 'T00:00:00', 'dd/MM/yy')}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {primary.ultima_acao_em ? (
                                    <div className="text-xs">
                                      <div className="text-muted-foreground">
                                        {TIPO_ACAO_LABELS[primary.ultima_acao_tipo || ''] || primary.ultima_acao_tipo}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground/70">
                                        {formatDistanceToNowStrict(new Date(primary.ultima_acao_em), { locale: ptBR, addSuffix: true })}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/60">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                                    {(groupStatus === 'pendente_justificativa' || groupStatus === 'atencao') && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8 text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => setJustificativaGroup(group)}>
                                              <AlertCircle className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Justificar</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    {group.status !== 'cancelado' && !group.cancelamento_pendente && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancelGroup(group)}>
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
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistory(group)}>
                                            <History className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Histórico</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </TableCell>
                              </TableRow>

                              {/* Linhas filhas (OCs adicionais) */}
                              {isExpanded && group.has_multiple && group.ocs.slice(1).map(oc => {
                                const ocStatus = computeOcStatus(oc, group);
                                return (
                                  <TableRow key={oc.id} className="bg-muted/30 hover:bg-muted/40">
                                    <TableCell className="w-8"></TableCell>
                                    <TableCell colSpan={5} className="text-xs text-muted-foreground">
                                      <span className="ml-6 inline-flex items-center gap-1.5">
                                        <span className="h-px w-3 bg-border" />
                                        OC adicional desta solicitação
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-sm tabular-nums font-medium">{oc.numero_documento}</TableCell>
                                    <TableCell>
                                      <AgingBadge dias={oc.dias_aberto} hasJustificativa={!!oc.ultima_justificativa} dataOc={oc.data_oc} />
                                    </TableCell>
                                    <TableCell>
                                      <StatusBadge status={ocStatus} />
                                    </TableCell>
                                    <TableCell>
                                      {oc.ultima_acao_em ? (
                                        <div className="text-[10px] text-muted-foreground">
                                          {formatDistanceToNowStrict(new Date(oc.ultima_acao_em), { locale: ptBR, addSuffix: true })}
                                        </div>
                                      ) : '—'}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">
                                      Emitida {formatBR(oc.data_oc, 'dd/MM/yy')}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </Fragment>
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
              Histórico — #{selectedGroup?.protocolo}
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
                        {formatBR(event.created_at, 'dd/MM/yy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{event.justificativa}</p>
                    {event.user_name && (
                      <p className="text-xs text-muted-foreground mt-1">por {event.user_name}</p>
                    )}
                    {(event.previsao_execucao || event.previsao_nf) && (
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {event.previsao_execucao && <span>Prev. execução: {formatBR(event.previsao_execucao, 'dd/MM/yy')}</span>}
                        {event.previsao_nf && <span>Prev. NF: {formatBR(event.previsao_nf, 'dd/MM/yy')}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={!!cancelGroup} onOpenChange={(open) => { if (!open) { setCancelGroup(null); setCancelJustificativa(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XOctagon className="h-5 w-5 text-destructive" />
              Solicitar Cancelamento — #{cancelGroup?.protocolo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {cancelGroup?.has_multiple
                ? `Esta solicitação possui ${cancelGroup.ocs.length} OCs. O cancelamento se aplica à solicitação inteira.`
                : <>OC nº <strong>{cancelGroup?.primary.numero_documento}</strong> • {cancelGroup?.fornecedor_razao || 'Sem fornecedor'}</>}
            </p>
            <div>
              <Label htmlFor="cancel-justificativa">Motivo do cancelamento *</Label>
              <Textarea
                id="cancel-justificativa"
                placeholder="Descreva o motivo (mín. 10 caracteres)..."
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
            <Button variant="outline" onClick={() => { setCancelGroup(null); setCancelJustificativa(''); }}>Voltar</Button>
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

      {/* Detail */}
      <OCDetalhesModal
        open={!!detailGroup}
        onOpenChange={(open) => !open && setDetailGroup(null)}
        solicitacaoId={detailGroup?.solicitacao_id || null}
        protocolo={detailGroup?.protocolo || null}
      />

      {/* Justification */}
      {justificativaGroup && (
        <JustificativaModal
          open={!!justificativaGroup}
          onOpenChange={(open) => !open && setJustificativaGroup(null)}
          solicitacaoId={justificativaGroup.solicitacao_id}
          protocolo={justificativaGroup.protocolo}
          onSuccess={refetch}
        />
      )}
    </>
  );
}
