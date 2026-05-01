import { useMemo, useState } from 'react';
import { addMonths, subMonths, format, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle,
  CalendarDays, Clock, Receipt, Loader2, X, Layers, FileWarning,
  Filter, Repeat, CalendarRange, MapPin,
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
  sem_oc_risco: ['previsao_sem_oc_risco'],
};

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

export function CalendarioServicos() {
  const { user, effectiveProfile, isImpersonating } = useAuth();
  const effectiveUserId = isImpersonating ? effectiveProfile?.id : user?.id;
  const { empreendimentos: userEmpreendimentos, loading: loadingEmpreendimentos, hasAllAccess } =
    useUserEmpreendimentos(effectiveUserId);

  const [refMonth, setRefMonth] = useState<Date>(() => startOfDay(new Date()));
  const [filterEmpreendimentos, setFilterEmpreendimentos] = useState<Set<string>>(new Set());
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>('todos');
  const [statusFilters, setStatusFilters] = useState<Set<CalendarioStatusVisual>>(new Set());
  const [categoriaFilters, setCategoriaFilters] = useState<Set<CategoriaServico>>(new Set());

  const toggleSet = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };
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
      if (filterEmpreendimentos.size > 0 && !filterEmpreendimentos.has(s.empreendimento)) return false;
      if (statusFilters.size > 0 && !statusFilters.has(s.visual)) return false;
      if (categoriaFilters.size > 0 && !categoriaFilters.has(getCategoria(s))) return false;
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
  }, [servicos, filterEmpreendimentos, statusFilters, categoriaFilters, kpiFilter]);

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
    filterEmpreendimentos.size > 0 || kpiFilter !== 'todos' || statusFilters.size > 0 || categoriaFilters.size > 0;

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

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterEmpreendimentos(new Set());
              setKpiFilter('todos');
              setStatusFilters(new Set());
              setCategoriaFilters(new Set());
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
