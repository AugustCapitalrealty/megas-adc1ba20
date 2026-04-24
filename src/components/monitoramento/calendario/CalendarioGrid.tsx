import { useMemo } from 'react';
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
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ServicoCalendario } from '@/hooks/useCalendarioServicos';
import { ServicoChip, VISUAL_DOT } from './ServicoChip';

interface CalendarioGridProps {
  refMonth: Date;
  byDay: Map<string, ServicoCalendario[]>;
  onDayClick: (date: Date, servicos: ServicoCalendario[]) => void;
  onChipClick: (s: ServicoCalendario) => void;
}

const WEEK_LABELS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

export function CalendarioGrid({ refMonth, byDay, onDayClick, onChipClick }: CalendarioGridProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(refMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(refMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [refMonth]);

  return (
    <div className="rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {WEEK_LABELS.map(d => (
          <div key={d} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const items = byDay.get(key) || [];
          const inMonth = isSameMonth(d, refMonth);
          const today = isToday(d);
          const visible = items.slice(0, 3);
          const extra = items.length - visible.length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick(d, items)}
              className={cn(
                'relative min-h-[110px] border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40',
                !inMonth && 'bg-muted/10 text-muted-foreground/50',
                isWeekend(d) && inMonth && 'bg-muted/10',
                today && 'ring-1 ring-inset ring-primary/40',
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
                  <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                    {items.length}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {visible.map(s => (
                  <ServicoChip key={s.id} servico={s} onClick={onChipClick} />
                ))}
                {extra > 0 && (
                  <div className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <div className="flex -space-x-1">
                      {items.slice(3, 6).map(s => (
                        <span
                          key={s.id}
                          className={cn('h-1.5 w-1.5 rounded-full ring-1 ring-background', VISUAL_DOT[s.visual])}
                        />
                      ))}
                    </div>
                    +{extra} mais
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}