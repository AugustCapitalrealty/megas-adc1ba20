import { useEffect, useMemo, useState } from 'react';
import { addMonths, subMonths, addWeeks, subWeeks, format, addDays, startOfDay, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle,
  CalendarDays, Receipt, X, Layers, FileWarning,
  Filter, Repeat, MapPin, Search, LayoutGrid, Rows3, CalendarRange,
  Maximize2, Minimize2, Inbox, Flame, GanttChart, Copy, Download, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { SlaKpiCard } from '@/components/sla/SlaKpiCard';
import {
  useCalendarioServicos,
  type CalendarioStatusVisual,
  type ServicoCalendario,
} from '@/hooks/useCalendarioServicos';
import { useCalendarioPrefs } from '@/hooks/useCalendarioPrefs';
import { CalendarioGrid } from './CalendarioGrid';
import { CalendarioSemana } from './CalendarioSemana';
import { CalendarioAgenda } from './CalendarioAgenda';
import { CalendarioTimeline } from './CalendarioTimeline';
import { DiaServicosSheet } from './DiaServicosSheet';
import { OCDetalhesModal } from '@/components/monitoramento/OCDetalhesModal';
import { VISUAL_DOT, VISUAL_LABEL } from './ServicoChip';
import { cn } from '@/lib/utils';

type KpiFilter = 'todos' | 'hoje' | 'proximos7' | 'atrasados' | 'aguardando_nf' | 'sem_oc_risco';
type CategoriaServico = 'mensal' | 'periodo' | 'pontual';

const CATEGORIA_LABEL: Record<CategoriaServico, string> = {
  mensal: 'Contrato mensal',
  periodo: 'Pontual com período',
  pontual: 'Pontual (data única)',
};

function getCategoria(s: { contrato_mensal: boolean; data_inicio: string | null; data_fim: string | null }): CategoriaServico {
  if (s.contrato_mensal && s.data_inicio && s.data_fim) return 'mensal';
  if (s.data_inicio && s.data_fim) return 'periodo';
  return 'pontual';
}

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

const RISCO_VISUAL = new Set<CalendarioStatusVisual>(['previsao_sem_oc_risco', 'atrasado']);

export function CalendarioServicos() {
  const { user, effectiveProfile, isImpersonating, isBackofficeOrAdmin } = useAuth();
  const effectiveUserId = isImpersonating ? effectiveProfile?.id : user?.id;
  const { empreendimentos: userEmpreendimentos, loading: loadingEmpreendimentos, hasAllAccess } =
    useUserEmpreendimentos(effectiveUserId);

  const { prefs, update } = useCalendarioPrefs();

  const [refMonth, setRefMonth] = useState<Date>(() => startOfDay(new Date()));
  const [filterEmpreendimentos, setFilterEmpreendimentos] = useState<Set<string>>(new Set());
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>('todos');
  const [statusFilters, setStatusFilters] = useState<Set<CalendarioStatusVisual>>(new Set());
  const [categoriaFilters, setCategoriaFilters] = useState<Set<CategoriaServico>>(new Set());
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setSearchDebounced(search.trim().toLowerCase()), 200);
    return () => clearTimeout(id);
  }, [search]);

  const toggleSet = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDate, setSheetDate] = useState<Date | null>(null);
  const [detalhesId, setDetalhesId] = useState<string | null>(null);
  const [detalhesProtocolo, setDetalhesProtocolo] = useState<string | null>(null);

  // Seleção persistente entre dias (Onda 3): IDs de serviços marcados.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (s: ServicoCalendario, _additive: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const { loading, servicos, byDay, refetch } = useCalendarioServicos({
    refMonth,
    userEmpreendimentos,
    hasAllAccess,
    enabled: !loadingEmpreendimentos,
  });

  const filteredServicos = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const in7 = addDays(new Date(), 7).toISOString().slice(0, 10);
    return servicos.filter(s => {
      if (filterEmpreendimentos.size > 0 && !filterEmpreendimentos.has(s.empreendimento)) return false;
      if (statusFilters.size > 0 && !statusFilters.has(s.visual)) return false;
      if (categoriaFilters.size > 0 && !categoriaFilters.has(getCategoria(s))) return false;
      if (prefs.apenasRisco && !RISCO_VISUAL.has(s.visual)) return false;
      if (searchDebounced) {
        const hay = `${s.protocolo} ${s.fornecedor_razao || ''} ${s.solicitante_nome || ''}`.toLowerCase();
        if (!hay.includes(searchDebounced)) return false;
      }
      const refDate = s.data_execucao_servico || s.data_fim || s.data_inicio || '';
      const refStart = s.data_execucao_servico || s.data_inicio || s.data_fim || '';
      if (kpiFilter === 'hoje') {
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
  }, [servicos, filterEmpreendimentos, statusFilters, categoriaFilters, kpiFilter, prefs.apenasRisco, searchDebounced]);

  const filteredByDay = useMemo(() => {
    const ids = new Set(filteredServicos.map(s => s.id));
    const map = new Map<string, any[]>();
    byDay.forEach((items, key) => {
      const kept = items.filter(it => ids.has(it.id));
      if (kept.length) map.set(key, kept);
    });
    return map;
  }, [filteredServicos, byDay]);

  // KPIs (sobre conjunto base, considerando apenas empreendimento)
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const in7 = addDays(new Date(), 7).toISOString().slice(0, 10);
    let hoje = 0, prox7 = 0, atrasados = 0, agNf = 0, semOcRisco = 0;
    const base = servicos.filter(s =>
      filterEmpreendimentos.size === 0 ? true : filterEmpreendimentos.has(s.empreendimento)
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
  }, [servicos, filterEmpreendimentos]);

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
    setSheetOpen(true);
  };

  const handleChipClick = (s: ServicoCalendario) => {
    setDetalhesId(s.id);
    setDetalhesProtocolo(s.protocolo);
  };

  const sheetServicosForDate = useMemo(() => {
    if (!sheetDate) return [];
    const key = format(sheetDate, 'yyyy-MM-dd');
    return filteredByDay.get(key) || [];
  }, [sheetDate, filteredByDay]);

  // ----- Drag & drop: reagendamento -----
  const STATUS_REAGENDAVEIS = useMemo(
    () => new Set(['rascunho', 'recebido', 'em_analise', 'aprovado', 'em_processamento']),
    [],
  );

  const canDragServico = (s: ServicoCalendario) => {
    // Sem data única: não dá para reagendar simplesmente movendo (envolve período).
    if (!s.data_execucao_servico) return false;
    if (s.contrato_mensal) return false;
    if (!STATUS_REAGENDAVEIS.has(s.status)) return false;
    if (s.cancelamento_pendente) return false;
    if (isBackofficeOrAdmin) return true;
    // Solicitante: só as próprias.
    return !!effectiveUserId && s.user_id === effectiveUserId;
  };

  const handleReschedule = async (s: ServicoCalendario, newDateISO: string) => {
    if (!s.data_execucao_servico || s.data_execucao_servico === newDateISO) return;
    if (!canDragServico(s)) return;
    const oldDate = s.data_execucao_servico;
    const fmt = (iso: string) => format(new Date(iso + 'T12:00:00'), 'dd/MM/yyyy');
    const ok = window.confirm(
      `Reagendar #${s.protocolo}\nDe: ${fmt(oldDate)}\nPara: ${fmt(newDateISO)}?`,
    );
    if (!ok) return;
    const { error } = await supabase
      .from('solicitacoes')
      .update({ data_execucao_servico: newDateISO })
      .eq('id', s.id);
    if (error) {
      toast({
        title: 'Não foi possível reagendar',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Reagendado',
      description: `#${s.protocolo} movido para ${fmt(newDateISO)}.`,
    });
    refetch();
  };

  // ----- Ações em lote no sheet do dia -----
  const handleDayBulkCopy = (items: ServicoCalendario[]) => {
    const txt = items.map(i => `#${i.protocolo}`).join('\n');
    navigator.clipboard.writeText(txt).then(() => {
      toast({ title: 'Protocolos copiados', description: `${items.length} protocolo(s).` });
    });
  };

  const handleDayBulkExport = (date: Date, items: ServicoCalendario[]) => {
    const header = ['Protocolo', 'Empreendimento', 'Fornecedor', 'Status', 'Valor'];
    const rows = items.map(i => [
      i.protocolo,
      i.empreendimento,
      (i.fornecedor_razao || '').split('"').join('""'),
      i.visual,
      String(i.valor ?? 0).replace('.', ','),
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${c}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendario-${format(date, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllFilters = () => {
    setFilterEmpreendimentos(new Set());
    setKpiFilter('todos');
    setStatusFilters(new Set());
    setCategoriaFilters(new Set());
    update('apenasRisco', false);
    setSearch('');
  };

  const hasActiveFilters =
    filterEmpreendimentos.size > 0 || kpiFilter !== 'todos' ||
    statusFilters.size > 0 || categoriaFilters.size > 0 ||
    prefs.apenasRisco || !!searchDebounced;

  // Header de navegação dependente do modo
  const headerLabel = prefs.modo === 'semana'
    ? `Semana de ${format(startOfWeek(refMonth, { weekStartsOn: 1 }), 'dd/MM')}`
    : format(refMonth, "MMMM yyyy", { locale: ptBR });

  const navPrev = () => {
    if (prefs.modo === 'semana') setRefMonth(d => subWeeks(d, 1));
    else setRefMonth(d => subMonths(d, 1));
  };
  const navNext = () => {
    if (prefs.modo === 'semana') setRefMonth(d => addWeeks(d, 1));
    else setRefMonth(d => addMonths(d, 1));
  };

  // ----- Ações em lote da seleção persistente -----
  const selectedServicos = useMemo(
    () => filteredServicos.filter(s => selectedIds.has(s.id)),
    [filteredServicos, selectedIds],
  );
  const selectedTotal = useMemo(
    () => selectedServicos.reduce((acc, s) => acc + (s.valor || 0), 0),
    [selectedServicos],
  );

  const handleSelectionCopy = () => {
    if (selectedServicos.length === 0) return;
    const txt = selectedServicos.map(i => `#${i.protocolo}`).join('\n');
    navigator.clipboard.writeText(txt).then(() => {
      toast({
        title: 'Protocolos copiados',
        description: `${selectedServicos.length} protocolo(s).`,
      });
    });
  };

  const handleSelectionExport = () => {
    if (selectedServicos.length === 0) return;
    const header = ['Protocolo', 'Empreendimento', 'Fornecedor', 'Status', 'Início', 'Fim', 'Execução', 'Valor'];
    const rows = selectedServicos.map(i => [
      i.protocolo,
      i.empreendimento,
      (i.fornecedor_razao || '').split('"').join('""'),
      i.visual,
      i.data_inicio || '',
      i.data_fim || '',
      i.data_execucao_servico || '',
      String(i.valor ?? 0).replace('.', ','),
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${c}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendario-selecao-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectionOpenAll = () => {
    if (selectedServicos.length === 0) return;
    const max = 5;
    if (selectedServicos.length > max) {
      toast({
        title: 'Muitos itens',
        description: `Abrir até ${max} por vez. Você selecionou ${selectedServicos.length}.`,
        variant: 'destructive',
      });
      return;
    }
    selectedServicos.forEach(s => {
      window.open(`/monitoramento?protocolo=${encodeURIComponent(s.protocolo)}`, '_blank');
    });
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SlaKpiCard
          label="Hoje"
          value={kpis.hoje}
          icon={<CalendarIcon className="h-4 w-4" />}
          tone={kpis.hoje > 0 ? 'neutral' : 'neutral'}
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
          tone={kpis.atrasados > 0 ? 'destructive' : 'neutral'}
          active={kpiFilter === 'atrasados'}
          onClick={() => toggleKpi('atrasados')}
          hint="Data de execução já passou e o serviço ainda não recebeu NF."
        />
        <SlaKpiCard
          label="Aguardando NF"
          value={kpis.agNf}
          icon={<Receipt className="h-4 w-4" />}
          tone={kpis.agNf > 0 ? 'warning' : 'neutral'}
          active={kpiFilter === 'aguardando_nf'}
          onClick={() => toggleKpi('aguardando_nf')}
          hint="Serviços executados aguardando emissão da nota fiscal."
        />
        <SlaKpiCard
          label="Sem OC (em risco)"
          value={kpis.semOcRisco}
          icon={<FileWarning className="h-4 w-4" />}
          tone={kpis.semOcRisco > 0 ? 'destructive' : 'neutral'}
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
            onClick={navPrev}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center text-sm font-semibold capitalize">
            {headerLabel}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={navNext}
            aria-label="Próximo"
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

        {/* Modo de visualização */}
        <div className="inline-flex rounded-md border bg-card p-0.5">
          <ModoButton active={prefs.modo === 'mes'} onClick={() => update('modo', 'mes')} icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Mês" />
          <ModoButton active={prefs.modo === 'semana'} onClick={() => update('modo', 'semana')} icon={<CalendarRange className="h-3.5 w-3.5" />} label="Semana" />
          <ModoButton active={prefs.modo === 'agenda'} onClick={() => update('modo', 'agenda')} icon={<Rows3 className="h-3.5 w-3.5" />} label="Agenda" />
          <ModoButton active={prefs.modo === 'timeline'} onClick={() => update('modo', 'timeline')} icon={<GanttChart className="h-3.5 w-3.5" />} label="Timeline" />
        </div>

        {/* Densidade — só no modo Mês */}
        {prefs.modo === 'mes' && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => update('densidade', prefs.densidade === 'compacto' ? 'confortavel' : 'compacto')}
            title={prefs.densidade === 'compacto' ? 'Aumentar densidade' : 'Reduzir densidade'}
          >
            {prefs.densidade === 'compacto' ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            <span className="text-xs">{prefs.densidade === 'compacto' ? 'Compacto' : 'Confortável'}</span>
          </Button>
        )}

        {/* Heatmap financeiro — só no modo Mês */}
        {prefs.modo === 'mes' && (
          <Button
            variant={prefs.heatmap ? 'default' : 'outline'}
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => update('heatmap', !prefs.heatmap)}
            title="Ativa/desativa o mapa de calor financeiro (Σ R$ por dia)"
            aria-pressed={prefs.heatmap}
          >
            <Flame className="h-3.5 w-3.5" />
            <span className="text-xs">Heatmap R$</span>
          </Button>
        )}

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar protocolo, fornecedor, solicitante..."
            className="h-9 w-64 pl-8 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <MultiFilter
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Empreendimento"
          allLabel="Todos empreendimentos"
          selected={filterEmpreendimentos}
          options={availableEmpreendimentos.map(([k, l]) => ({ value: k, label: l as string }))}
          onToggle={(v) => toggleSet(setFilterEmpreendimentos, v)}
          onClear={() => setFilterEmpreendimentos(new Set())}
        />

        <MultiFilter
          icon={<Filter className="h-3.5 w-3.5" />}
          label="Status"
          allLabel="Todos os status"
          selected={statusFilters as Set<string>}
          options={LEGEND_ITEMS.map(v => ({ value: v, label: VISUAL_LABEL[v], dot: VISUAL_DOT[v] }))}
          onToggle={(v) => toggleSet(setStatusFilters, v as CalendarioStatusVisual)}
          onClear={() => setStatusFilters(new Set())}
        />

        <MultiFilter
          icon={<Repeat className="h-3.5 w-3.5" />}
          label="Tipo"
          allLabel="Todos os tipos"
          selected={categoriaFilters as Set<string>}
          options={(Object.keys(CATEGORIA_LABEL) as CategoriaServico[]).map(k => ({
            value: k,
            label: CATEGORIA_LABEL[k],
          }))}
          onToggle={(v) => toggleSet(setCategoriaFilters, v as CategoriaServico)}
          onClear={() => setCategoriaFilters(new Set())}
        />

        {/* Apenas em risco */}
        <div className="flex items-center gap-2 rounded-md border px-3 h-9">
          <Switch
            id="apenas-risco"
            checked={prefs.apenasRisco}
            onCheckedChange={(v) => update('apenasRisco', v)}
          />
          <Label htmlFor="apenas-risco" className="text-xs cursor-pointer flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            Apenas em risco
          </Label>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground tabular-nums">
          {filteredServicos.length} serviços
        </span>
      </div>

      {/* Chips de filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {searchDebounced && (
            <FilterChip label={`Busca: "${searchDebounced}"`} onClear={() => setSearch('')} />
          )}
          {prefs.apenasRisco && (
            <FilterChip label="Apenas em risco" onClear={() => update('apenasRisco', false)} />
          )}
          {kpiFilter !== 'todos' && (
            <FilterChip label={`KPI: ${kpiFilter}`} onClear={() => setKpiFilter('todos')} />
          )}
          {Array.from(filterEmpreendimentos).map(emp => (
            <FilterChip
              key={emp}
              label={EMPREENDIMENTO_LABELS[emp as Empreendimento] || emp}
              onClear={() => toggleSet(setFilterEmpreendimentos, emp)}
            />
          ))}
          {Array.from(statusFilters).map(st => (
            <FilterChip
              key={st}
              label={VISUAL_LABEL[st]}
              onClear={() => toggleSet(setStatusFilters, st)}
            />
          ))}
          {Array.from(categoriaFilters).map(cat => (
            <FilterChip
              key={cat}
              label={CATEGORIA_LABEL[cat]}
              onClear={() => toggleSet(setCategoriaFilters, cat)}
            />
          ))}
        </div>
      )}

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

      {/* Conteúdo principal */}
      {(loading || loadingEmpreendimentos) ? (
        <CalendarioSkeleton modo={prefs.modo} />
      ) : filteredServicos.length === 0 && hasActiveFilters ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum serviço corresponde aos filtros.</p>
          <Button variant="outline" size="sm" onClick={clearAllFilters} className="gap-1">
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        </Card>
      ) : prefs.modo === 'mes' ? (
        <CalendarioGrid
          refMonth={refMonth}
          byDay={filteredByDay}
          onDayClick={handleDayClick}
          onChipClick={handleChipClick}
          densidade={prefs.densidade}
          heatmap={prefs.heatmap}
          dragEnabled
          canDrag={canDragServico}
          onReschedule={handleReschedule}
        />
      ) : prefs.modo === 'semana' ? (
        <CalendarioSemana
          refDate={refMonth}
          byDay={filteredByDay}
          onDayClick={handleDayClick}
          onChipClick={handleChipClick}
        />
      ) : prefs.modo === 'agenda' ? (
        <CalendarioAgenda byDay={filteredByDay} onChipClick={handleChipClick} />
      ) : (
        <CalendarioTimeline
          refMonth={refMonth}
          servicos={filteredServicos}
          onChipClick={handleChipClick}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      {/* Sheet do dia */}
      <DiaServicosSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={sheetDate}
        servicos={sheetServicosForDate}
        onOpenDetalhes={(s) => {
          setSheetOpen(false);
          handleChipClick(s);
        }}
        onNavigate={(newDate) => setSheetDate(newDate)}
        onBulkCopy={handleDayBulkCopy}
        onBulkExport={handleDayBulkExport}
      />

      {/* Detalhes */}
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

      {/* Barra flutuante de seleção persistente */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border bg-popover px-3 py-2 shadow-lg">
            <Badge variant="secondary" className="h-6 px-2 text-xs">
              {selectedIds.size} selecionado{selectedIds.size === 1 ? '' : 's'}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              Σ {selectedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </span>
            <div className="mx-1 h-5 w-px bg-border" />
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={handleSelectionCopy}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={handleSelectionExport}>
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={handleSelectionOpenAll}>
              <ExternalLink className="h-3.5 w-3.5" /> Abrir
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={clearSelection}>
              <X className="h-3.5 w-3.5" /> Limpar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface MultiFilterOption { value: string; label: string; dot?: string }
interface MultiFilterProps {
  icon: React.ReactNode;
  label: string;
  allLabel: string;
  selected: Set<string>;
  options: MultiFilterOption[];
  onToggle: (value: string) => void;
  onClear: () => void;
}

function MultiFilter({ icon, label, allLabel, selected, options, onToggle, onClear }: MultiFilterProps) {
  const count = selected.size;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          {icon}
          <span className="text-xs">{label}</span>
          {count > 0 ? (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{count}</Badge>
          ) : (
            <span className="ml-1 text-[10px] text-muted-foreground">Todos</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-semibold">{label}</span>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={onClear}>
              Limpar
            </Button>
          )}
        </div>
        <div className="max-h-64 overflow-auto p-2">
          {count === 0 && (
            <p className="px-1 pb-1 text-[10px] text-muted-foreground">{allLabel}</p>
          )}
          <div className="space-y-1">
            {options.map(opt => {
              const id = `mf-${label}-${opt.value}`;
              const checked = selected.has(opt.value);
              return (
                <Label
                  key={opt.value}
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs font-normal hover:bg-muted"
                >
                  <Checkbox id={id} checked={checked} onCheckedChange={() => onToggle(opt.value)} />
                  {opt.dot && <span className={cn('h-2 w-2 rounded-full', opt.dot)} />}
                  <span className="flex-1 truncate">{opt.label}</span>
                </Label>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ModoButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition',
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon} {label}
    </button>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 pl-2 pr-1 py-0.5 text-[11px]">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 hover:bg-muted"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function CalendarioSkeleton({ modo }: { modo: 'mes' | 'semana' | 'agenda' }) {
  if (modo === 'agenda') {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  if (modo === 'semana') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
