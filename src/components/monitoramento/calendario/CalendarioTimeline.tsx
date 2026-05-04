import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  isWeekend,
  parseISO,
  differenceInCalendarDays,
  addMonths,
  subMonths,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EMPREENDIMENTO_LABELS } from '@/types';
import { formatBR } from '@/lib/date-utils';
import {
  VISUAL_BG,
  VISUAL_DOT,
  VISUAL_LABEL,
  VISUAL_PRIORIDADE,
} from './ServicoChip';
import type { ServicoCalendario } from '@/hooks/useCalendarioServicos';

interface CalendarioTimelineProps {
  refMonth: Date;
  servicos: ServicoCalendario[];
  onChipClick: (s: ServicoCalendario) => void;
  /** IDs selecionados (seleção persistente entre dias). */
  selectedIds?: Set<string>;
  onToggleSelect?: (s: ServicoCalendario, additive: boolean) => void;
}

interface TimelineRow {
  servico: ServicoCalendario;
  startCol: number; // 1-based
  span: number;
  startsBefore: boolean;
  endsAfter: boolean;
  label: string;
}

const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 36;
const MIN_LABEL_PX = 60;

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/**
 * Resolve start/end ISO de um serviço para a visão Timeline.
 * Contratos mensais e ACs com período usam [data_inicio, data_fim].
 * Pontual usa data_execucao_servico para ambos.
 */
function resolveRange(s: ServicoCalendario): { from: string; to: string } | null {
  if (s.data_inicio && s.data_fim && s.data_inicio <= s.data_fim) {
    return { from: s.data_inicio, to: s.data_fim };
  }
  if (s.data_execucao_servico) {
    return { from: s.data_execucao_servico, to: s.data_execucao_servico };
  }
  return null;
}

export function CalendarioTimeline({
  refMonth,
  servicos,
  onChipClick,
  selectedIds,
  onToggleSelect,
}: CalendarioTimelineProps) {
  const monthStart = useMemo(() => startOfMonth(refMonth), [refMonth]);
  const monthEnd = useMemo(() => endOfMonth(refMonth), [refMonth]);
  const days = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd],
  );
  const totalDays = days.length;

  const monthStartISO = format(monthStart, 'yyyy-MM-dd');
  const monthEndISO = format(monthEnd, 'yyyy-MM-dd');

  // Linhas: 1 por serviço cuja janela intersecta o mês corrente.
  const rows = useMemo<TimelineRow[]>(() => {
    const out: TimelineRow[] = [];
    servicos.forEach((s) => {
      const range = resolveRange(s);
      if (!range) return;
      // Recorta para o mês atual.
      const fromISO = range.from < monthStartISO ? monthStartISO : range.from;
      const toISO = range.to > monthEndISO ? monthEndISO : range.to;
      if (fromISO > monthEndISO || toISO < monthStartISO) return;
      const startCol = differenceInCalendarDays(parseISO(fromISO), monthStart) + 1;
      const span = Math.max(1, differenceInCalendarDays(parseISO(toISO), parseISO(fromISO)) + 1);
      out.push({
        servico: s,
        startCol,
        span,
        startsBefore: range.from < monthStartISO,
        endsAfter: range.to > monthEndISO,
        label: s.fornecedor_razao || `#${s.protocolo}`,
      });
    });
    // Ordena: prioridade visual, depois início, depois maior span.
    out.sort((a, b) => {
      const pa = VISUAL_PRIORIDADE[a.servico.visual] ?? 99;
      const pb = VISUAL_PRIORIDADE[b.servico.visual] ?? 99;
      if (pa !== pb) return pa - pb;
      if (a.startCol !== b.startCol) return a.startCol - b.startCol;
      return b.span - a.span;
    });
    return out;
  }, [servicos, monthStart, monthStartISO, monthEndISO]);

  // Coluna de "hoje" para marcador vertical (somente se hoje cai no mês visível).
  const todayCol = useMemo(() => {
    const today = startOfDay(new Date());
    if (today < monthStart || today > monthEnd) return null;
    return differenceInCalendarDays(today, monthStart) + 1;
  }, [monthStart, monthEnd]);

  const totalValor = useMemo(
    () => rows.reduce((acc, r) => acc + (r.servico.valor || 0), 0),
    [rows],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
        Nenhum serviço com período ou data definida no mês.
      </div>
    );
  }

  // Largura mínima: 32px por dia para garantir leitura confortável.
  const minDayWidth = 32;
  const minWidth = totalDays * minDayWidth + 240; // + coluna de label

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
        <span className="font-semibold capitalize">
          {format(refMonth, "MMMM yyyy", { locale: ptBR })} · {rows.length} barra{rows.length === 1 ? '' : 's'}
        </span>
        <span className="text-muted-foreground tabular-nums">
          Σ {formatCurrency(totalValor)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth }} className="relative">
          {/* Cabeçalho de dias */}
          <div
            className="grid border-b bg-muted/30 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            style={{
              gridTemplateColumns: `240px repeat(${totalDays}, minmax(${minDayWidth}px, 1fr))`,
              height: HEADER_HEIGHT,
            }}
          >
            <div className="flex items-center px-3">Serviço</div>
            {days.map((d, idx) => {
              const col = idx + 1;
              return (
                <div
                  key={col}
                  className={cn(
                    'flex flex-col items-center justify-center border-l',
                    isWeekend(d) && 'bg-muted/40',
                    isToday(d) && 'bg-primary/10 text-primary font-semibold',
                  )}
                >
                  <span className="leading-none">{format(d, 'EEEEE', { locale: ptBR })}</span>
                  <span className="text-[10px] tabular-nums leading-none mt-0.5">{format(d, 'd')}</span>
                </div>
              );
            })}
          </div>

          {/* Linhas */}
          <TooltipProvider delayDuration={150}>
            {rows.map((row, idx) => {
              const s = row.servico;
              const isSelected = !!selectedIds?.has(s.id);
              return (
                <div
                  key={`${s.id}-${idx}`}
                  className="grid border-b last:border-b-0 hover:bg-muted/20"
                  style={{
                    gridTemplateColumns: `240px repeat(${totalDays}, minmax(${minDayWidth}px, 1fr))`,
                    height: ROW_HEIGHT,
                  }}
                >
                  {/* Label do serviço */}
                  <button
                    type="button"
                    onClick={(e) => {
                      if (e.shiftKey || e.metaKey || e.ctrlKey) {
                        onToggleSelect?.(s, true);
                      } else {
                        onChipClick(s);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 truncate border-r px-3 text-left text-xs hover:bg-muted/40',
                      isSelected && 'bg-primary/10',
                    )}
                    title={`${row.label} · #${s.protocolo}`}
                  >
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', VISUAL_DOT[s.visual])} />
                    <span className="truncate">{row.label}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      #{s.protocolo}
                    </span>
                  </button>
                  {/* Barra */}
                  <div
                    className="relative col-start-auto"
                    style={{ gridColumn: `${row.startCol + 1} / span ${row.span}` }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => {
                            if (e.shiftKey || e.metaKey || e.ctrlKey) {
                              onToggleSelect?.(s, true);
                            } else {
                              onChipClick(s);
                            }
                          }}
                          className={cn(
                            'absolute inset-y-1 left-0.5 right-0.5 flex items-center gap-1 truncate rounded px-2 text-[10px] font-medium transition hover:opacity-90',
                            VISUAL_BG[s.visual],
                            row.startsBefore && 'rounded-l-none border-l-2 border-l-foreground/40',
                            row.endsAfter && 'rounded-r-none border-r-2 border-r-foreground/40',
                            isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                          )}
                          aria-label={`Abrir #${s.protocolo}. Shift+click para selecionar.`}
                        >
                          <span className="truncate">
                            {s.contrato_mensal ? '↻ ' : ''}
                            {row.label}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] text-xs space-y-1">
                        <div className="font-semibold">#{s.protocolo}</div>
                        <div className="text-muted-foreground">
                          {EMPREENDIMENTO_LABELS[s.empreendimento]}
                        </div>
                        <div>{s.fornecedor_razao || '—'}</div>
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', VISUAL_DOT[s.visual])} />
                          <span>{VISUAL_LABEL[s.visual]}</span>
                        </div>
                        {(s.data_inicio || s.data_fim) && (
                          <div className="text-muted-foreground">
                            {s.contrato_mensal ? 'Contrato: ' : 'Período: '}
                            {s.data_inicio
                              ? formatBR(s.data_inicio + 'T12:00:00', 'dd/MM/yyyy')
                              : '—'}
                            {' – '}
                            {s.data_fim
                              ? formatBR(s.data_fim + 'T12:00:00', 'dd/MM/yyyy')
                              : '—'}
                          </div>
                        )}
                        <div className="text-muted-foreground">
                          Valor: {formatCurrency(s.valor)}
                        </div>
                        <div className="text-[10px] text-muted-foreground/80 italic pt-0.5">
                          Shift+click para selecionar.
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </TooltipProvider>

          {/* Marcador "hoje" */}
          {todayCol !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary/60"
              style={{
                left: `calc(240px + ((100% - 240px) / ${totalDays}) * ${todayCol - 0.5})`,
              }}
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Mantém helpers no módulo para tree-shaking simples (não exportados).
void addMonths; void subMonths;