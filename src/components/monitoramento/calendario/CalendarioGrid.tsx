import { useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isWeekend,
  format,
  getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ServicoCalendario, ServicoCalendarioDia } from '@/hooks/useCalendarioServicos';
import { ServicoChip, VISUAL_DOT, VISUAL_LABEL, ordenarServicos } from './ServicoChip';
import type { CalendarioDensidade } from '@/hooks/useCalendarioPrefs';

interface CalendarioGridProps {
  refMonth: Date;
  byDay: Map<string, ServicoCalendarioDia[]>;
  onDayClick: (date: Date, servicos: ServicoCalendario[]) => void;
  onChipClick: (s: ServicoCalendario) => void;
  densidade?: CalendarioDensidade;
  /** Quando true, pinta o fundo de cada dia proporcional ao Σ R$ daquele dia. */
  heatmap?: boolean;
  /** Habilita drag & drop de chips. */
  dragEnabled?: boolean;
  /** Decide, por serviço, se ele pode ser arrastado pelo usuário atual. */
  canDrag?: (s: ServicoCalendario) => boolean;
  /** Reagenda um serviço para a data alvo (YYYY-MM-DD). */
  onReschedule?: (s: ServicoCalendario, newDateISO: string) => void;
}

const WEEK_LABELS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

const formatShortBRL = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)}k`;
  return `R$ ${Math.round(v)}`;
};

export function CalendarioGrid({
  refMonth,
  byDay,
  onDayClick,
  onChipClick,
  densidade = 'confortavel',
  heatmap = false,
  dragEnabled = false,
  canDrag,
  onReschedule,
}: CalendarioGridProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(refMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(refMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [refMonth]);

  // Coluna do dia da semana de hoje (0 = segunda na nossa grade).
  const todayCol = useMemo(() => {
    const d = getDay(new Date()); // 0=dom..6=sáb
    return d === 0 ? 6 : d - 1;
  }, []);

  const isCompact = densidade === 'compacto';
  const maxChips = isCompact ? 2 : 4;
  const minH = isCompact ? 'min-h-[80px]' : 'min-h-[120px]';

  // Pré-calcula totais por dia visível e o teto, para escalar o heatmap.
  const totalsByKey = useMemo(() => {
    const m = new Map<string, number>();
    days.forEach(d => {
      const key = format(d, 'yyyy-MM-dd');
      const items = byDay.get(key) || [];
      const total = items.reduce((acc, it) => acc + (it.valor || 0), 0);
      if (total > 0) m.set(key, total);
    });
    return m;
  }, [days, byDay]);

  const maxTotal = useMemo(() => {
    let max = 0;
    totalsByKey.forEach(v => { if (v > max) max = v; });
    return max;
  }, [totalsByKey]);

  /** Intensidade 0..1 com escala raiz quadrada para suavizar dias dominantes. */
  const intensityFor = (key: string) => {
    if (!heatmap || maxTotal <= 0) return 0;
    const v = totalsByKey.get(key) || 0;
    if (v <= 0) return 0;
    return Math.min(1, Math.sqrt(v / maxTotal));
  };

  const [dragging, setDragging] = useState<ServicoCalendario | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  return (
    <div className="rounded-lg border bg-card" role="grid" aria-label="Calendário de serviços">
      <div className="grid grid-cols-7 border-b bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {WEEK_LABELS.map((d, idx) => (
          <div
            key={d}
            className={cn('px-2 py-2 text-center', idx === todayCol && 'text-primary font-semibold')}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7" role="rowgroup">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const rawItems = byDay.get(key) || [];
          const items = ordenarServicos(rawItems);
          const inMonth = isSameMonth(d, refMonth);
          const today = isToday(d);
          const visible = items.slice(0, maxChips);
          const extra = items.length - visible.length;
          const total = items.reduce((acc, it) => acc + (it.valor || 0), 0);
          const heat = intensityFor(key);
          // alpha máx 0.32 para não competir com chips; usa primary do tema.
          const heatStyle = heat > 0
            ? { backgroundColor: `hsl(var(--primary) / ${(heat * 0.32).toFixed(3)})` }
            : undefined;

          // Segmentos da mini-barra agrupados por status.
          const counts = new Map<string, number>();
          items.forEach(it => counts.set(it.visual, (counts.get(it.visual) || 0) + 1));

          const aria = items.length
            ? `${format(d, "d 'de' MMMM", { locale: ptBR })}, ${items.length} ${
                items.length === 1 ? 'serviço' : 'serviços'
              }${
                items[0] ? `, principal: ${VISUAL_LABEL[items[0].visual]}` : ''
              }`
            : `${format(d, "d 'de' MMMM", { locale: ptBR })}, sem serviços`;

          return (
            <div
              key={key}
              role="gridcell"
              tabIndex={0}
              aria-label={aria}
              onClick={() => onDayClick(d, items)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDayClick(d, items);
                }
              }}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (hoverKey !== key) setHoverKey(key);
              }}
              onDragLeave={() => {
                if (hoverKey === key) setHoverKey(null);
              }}
              onDrop={(e) => {
                if (!dragging) return;
                e.preventDefault();
                const target = dragging;
                setHoverKey(null);
                setDragging(null);
                onReschedule?.(target, key);
              }}
              style={heatStyle}
              className={cn(
                'group relative cursor-pointer border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:z-10',
                minH,
                !inMonth && 'bg-muted/10 text-muted-foreground/50',
                isWeekend(d) && inMonth && 'bg-muted/10',
                today && 'ring-1 ring-inset ring-primary/40',
                hoverKey === key && 'bg-primary/15 ring-2 ring-inset ring-primary/60',
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums',
                    today && 'bg-primary text-primary-foreground',
                  )}
                >
                  {format(d, 'd', { locale: ptBR })}
                </span>
                {items.length > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground tabular-nums whitespace-nowrap">
                    {items.length} · {formatShortBRL(total)}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {visible.map(s => (
                  <ServicoChip
                    key={s.id}
                    servico={s}
                    onClick={onChipClick}
                    draggable={dragEnabled && (canDrag ? canDrag(s) : true)}
                    onDragStart={(svc) => setDragging(svc)}
                    onDragEnd={() => { setDragging(null); setHoverKey(null); }}
                  />
                ))}
                {extra > 0 && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick(d, items);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onDayClick(d, items);
                      }
                    }}
                    className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 cursor-pointer"
                  >
                    <span className="flex -space-x-1">
                      {items.slice(maxChips, maxChips + 3).map(s => (
                        <span
                          key={s.id}
                          className={cn('h-1.5 w-1.5 rounded-full ring-1 ring-background', VISUAL_DOT[s.visual])}
                        />
                      ))}
                    </span>
                    +{extra} mais
                  </span>
                )}
              </div>
              {/* Mini-barra de status */}
              {items.length > 0 && (
                <div className="absolute inset-x-0 bottom-0 flex h-[3px] overflow-hidden rounded-b">
                  {Array.from(counts.entries()).map(([visual, qty]) => (
                    <span
                      key={visual}
                      className={cn(VISUAL_DOT[visual as keyof typeof VISUAL_DOT])}
                      style={{ flex: qty }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
