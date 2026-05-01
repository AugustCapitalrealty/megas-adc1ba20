import { useMemo, useState } from 'react';
import { addMonths, subMonths, format, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle,
  CalendarDays, Clock, Receipt, Loader2, X, Layers, FileWarning,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { SlaKpiCard } from '@/components/sla/SlaKpiCard';
import {
  useCalendarioServicos,
  type CalendarioStatusVisual,
  type ServicoCalendario,
} from '@/hooks/useCalendarioServicos';
import { CalendarioGrid } from './CalendarioGrid';
import { DiaServicosSheet } from './DiaServicosSheet';
import { OCDetalhesModal } from '@/components/monitoramento/OCDetalhesModal';
import { VISUAL_DOT, VISUAL_LABEL } from './ServicoChip';
import { cn } from '@/lib/utils';

type KpiFilter = 'todos' | 'hoje' | 'proximos7' | 'atrasados' | 'aguardando_nf' | 'sem_oc_risco';

const KPI_TO_VISUAL: Record<KpiFilter, CalendarioStatusVisual[] | null> = {
  todos: null,
  hoje: [],          // tratado pela data abaixo
  proximos7: [],     // tratado pela data abaixo
  atrasados: ['atrasado'],
  aguardando_nf: ['aguardando_nf'],
};

const LEGEND_ITEMS: CalendarioStatusVisual[] = [
  'agendado',
  'oc_enviada',
  'oc_nao_liberada',
  'aguardando_nf',
  'atrasado',
  'previsao_sem_oc',
  'previsao_sem_oc_risco',
  'concluido',
  'cancel_solicitado',
];

export function CalendarioServicos() {
  const { user, effectiveProfile, isImpersonating } = useAuth();
  const effectiveUserId = isImpersonating ? effectiveProfile?.id : user?.id;
  const { empreendimentos: userEmpreendimentos, loading: loadingEmpreendimentos, hasAllAccess } =
    useUserEmpreendimentos(effectiveUserId);

  const [refMonth, setRefMonth] = useState<Date>(() => startOfDay(new Date()));
  const [filterEmpreendimento, setFilterEmpreendimento] = useState<string>('todos');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<CalendarioStatusVisual | 'todos'>('todos');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDate, setSheetDate] = useState<Date | null>(null);
  const [sheetServicos, setSheetServicos] = useState<ServicoCalendario[]>([]);
  const [detalhesId, setDetalhesId] = useState<string | null>(null);
  const [detalhesProtocolo, setDetalhesProtocolo] = useState<string | null>(null);

  const { loading, servicos, byDay } = useCalendarioServicos({
    refMonth,
    userEmpreendimentos,
    hasAllAccess,
    enabled: !loadingEmpreendimentos,
  });

  // Aplica filtros (empreendimento + KPI + status visual) sobre a lista
  const filteredServicos = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const in7 = addDays(new Date(), 7).toISOString().slice(0, 10);
    return servicos.filter(s => {
      if (filterEmpreendimento !== 'todos' && s.empreendimento !== filterEmpreendimento) return false;
      if (statusFilter !== 'todos' && s.visual !== statusFilter) return false;
      // Data de referência: execucao || data_fim || data_inicio
      const refDate = s.data_execucao_servico || s.data_fim || s.data_inicio || '';
      const refStart = s.data_execucao_servico || s.data_inicio || s.data_fim || '';
      if (kpiFilter === 'hoje') {
        // serviço cobre hoje (intervalo) ou data exata == hoje
        const covers = s.data_inicio && s.data_fim
          ? s.data_inicio <= today && s.data_fim >= today
          : refDate === today;
        if (!covers) return false;
      }
      if (kpiFilter === 'proximos7') {
        const covers = s.data_inicio && s.data_fim
          ? s.data_inicio <= in7 && s.data_fim >= today
          : refStart >= today && refStart <= in7;
        if (!covers) return false;
      }
      if (kpiFilter === 'atrasados' && s.visual !== 'atrasado') return false;
      if (kpiFilter === 'aguardando_nf' && s.visual !== 'aguardando_nf') return false;
      if (kpiFilter === 'sem_oc_risco' && s.visual !== 'previsao_sem_oc_risco') return false;
      return true;
    });
  }, [servicos, filterEmpreendimento, statusFilter, kpiFilter]);

  const filteredByDay = useMemo(() => {
    const ids = new Set(filteredServicos.map(s => s.id));
    const map = new Map<string, any[]>();
    byDay.forEach((items, key) => {
      const kept = items.filter(it => ids.has(it.id));
      if (kept.length) map.set(key, kept);
    });
    return map;
  }, [filteredServicos, byDay]);

  // KPIs (sempre sobre o conjunto base, ignorando KPI ativo, igual aos cards do OC×NF)
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const in7 = addDays(new Date(), 7).toISOString().slice(0, 10);
    let hoje = 0, prox7 = 0, atrasados = 0, agNf = 0, semOcRisco = 0;
    const base = servicos.filter(s =>
      filterEmpreendimento === 'todos' ? true : s.empreendimento === filterEmpreendimento
    );
    base.forEach(s => {
      const coversToday = s.data_inicio && s.data_fim
        ? s.data_inicio <= today && s.data_fim >= today
        : s.data_execucao_servico === today;
      const coversNext7 = s.data_inicio && s.data_fim
        ? s.data_inicio <= in7 && s.data_fim >= today
        : !!s.data_execucao_servico && s.data_execucao_servico >= today && s.data_execucao_servico <= in7;
      if (coversToday) hoje++;
      if (coversNext7) prox7++;
      if (s.visual === 'atrasado') atrasados++;
      if (s.visual === 'aguardando_nf') agNf++;
      if (s.visual === 'previsao_sem_oc_risco') semOcRisco++;
    });
    return { hoje, prox7, atrasados, agNf, semOcRisco };
  }, [servicos, filterEmpreendimento]);

  const availableEmpreendimentos = useMemo(() => {
    if (hasAllAccess) {
      return Object.entries(EMPREENDIMENTO_LABELS).filter(([k]) => k !== 'todos');
    }
    return Object.entries(EMPREENDIMENTO_LABELS).filter(
      ([k]) => k !== 'todos' && userEmpreendimentos.includes(k as Empreendimento)
    );
  }, [userEmpreendimentos, hasAllAccess]);

  const toggleKpi = (next: KpiFilter) =>
    setKpiFilter(prev => (prev === next ? 'todos' : next));

  const handleDayClick = (date: Date, items: ServicoCalendario[]) => {
    if (items.length === 0) return;
    setSheetDate(date);
    setSheetServicos(items);
    setSheetOpen(true);
  };

  const handleChipClick = (s: ServicoCalendario) => {
    setDetalhesId(s.id);
    setDetalhesProtocolo(s.protocolo);
  };

  if (loading || loadingEmpreendimentos) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasActiveFilters =
    filterEmpreendimento !== 'todos' || kpiFilter !== 'todos' || statusFilter !== 'todos';

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SlaKpiCard
          label="Hoje"
          value={kpis.hoje}
          icon={<CalendarIcon className="h-4 w-4" />}
          tone="neutral"
          active={kpiFilter === 'hoje'}
          onClick={() => toggleKpi('hoje')}
          hint="Serviços previstos para hoje (data de execução = hoje)."
        />
        <SlaKpiCard
          label="Próximos 7 dias"
          value={kpis.prox7}
          icon={<CalendarDays className="h-4 w-4" />}
          tone="success"
          active={kpiFilter === 'proximos7'}
          onClick={() => toggleKpi('proximos7')}
          hint="Serviços agendados dentro da próxima semana."
        />
        <SlaKpiCard
          label="Atrasados"
          value={kpis.atrasados}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="destructive"
          active={kpiFilter === 'atrasados'}
          onClick={() => toggleKpi('atrasados')}
          hint="Data de execução já passou e o serviço ainda não recebeu NF."
        />
        <SlaKpiCard
          label="Aguardando NF"
          value={kpis.agNf}
          icon={<Receipt className="h-4 w-4" />}
          tone="warning"
          active={kpiFilter === 'aguardando_nf'}
          onClick={() => toggleKpi('aguardando_nf')}
          hint="Serviços executados aguardando emissão da nota fiscal."
        />
        <SlaKpiCard
          label="Sem OC (em risco)"
          value={kpis.semOcRisco}
          icon={<FileWarning className="h-4 w-4" />}
          tone="destructive"
          active={kpiFilter === 'sem_oc_risco'}
          onClick={() => toggleKpi('sem_oc_risco')}
          hint="Solicitações com previsão até 3 dias (ou já vencida) e ainda sem OC emitida."
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setRefMonth(d => subMonths(d, 1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[140px] text-center text-sm font-semibold capitalize">
            {format(refMonth, "MMMM yyyy", { locale: ptBR })}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setRefMonth(d => addMonths(d, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefMonth(startOfDay(new Date()))}
            className="ml-1 text-xs"
          >
            Hoje
          </Button>
        </div>

        <Select value={filterEmpreendimento} onValueChange={setFilterEmpreendimento}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Empreendimento" /></SelectTrigger>
          <SelectContent>
            {availableEmpreendimentos.length > 1 && (
              <SelectItem value="todos">Todos empreendimentos</SelectItem>
            )}
            {availableEmpreendimentos.map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {LEGEND_ITEMS.map(v => (
              <SelectItem key={v} value={v}>{VISUAL_LABEL[v]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterEmpreendimento('todos');
              setKpiFilter('todos');
              setStatusFilter('todos');
            }}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground tabular-nums">
          {filteredServicos.length} serviços
        </span>
      </div>

      {/* Legenda */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Legenda
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            {LEGEND_ITEMS.map(v => (
              <span key={v} className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', VISUAL_DOT[v])} />
                <span className="text-muted-foreground">{VISUAL_LABEL[v]}</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grade */}
      <CalendarioGrid
        refMonth={refMonth}
        byDay={filteredByDay}
        onDayClick={handleDayClick}
        onChipClick={handleChipClick}
      />

      {/* Sheet do dia */}
      <DiaServicosSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={sheetDate}
        servicos={sheetServicos}
        onOpenDetalhes={(s) => {
          setSheetOpen(false);
          handleChipClick(s);
        }}
      />

      {/* Detalhes (reaproveita modal de OCxNF) */}
      <OCDetalhesModal
        open={!!detalhesId}
        onOpenChange={(open) => {
          if (!open) {
            setDetalhesId(null);
            setDetalhesProtocolo(null);
          }
        }}
        solicitacaoId={detalhesId}
        protocolo={detalhesProtocolo}
      />
    </div>
  );
}