import { useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isWeekend,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ServicoCalendario, ServicoCalendarioDia } from '@/hooks/useCalendarioServicos';
import { ServicoChip, VISUAL_DOT, ordenarServicos } from './ServicoChip';

interface CalendarioSemanaProps {
  refDate: Date;
  byDay: Map<string, ServicoCalendarioDia[]>;
  onDayClick: (date: Date, servicos: ServicoCalendario[]) => void;
  onChipClick: (s: ServicoCalendario) => void;
}

const formatShortBRL = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)}k`;
  return `R$ ${Math.round(v)}`;
};

export function CalendarioSemana({ refDate, byDay, onDayClick, onChipClick }: CalendarioSemanaProps) {
  const days = useMemo(() => {
    const start = startOfWeek(refDate, { weekStartsOn: 1 });
    const end = endOfWeek(refDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [refDate]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map(d => {
        const key = format(d, 'yyyy-MM-dd');
        const items = ordenarServicos(byDay.get(key) || []);
        const total = items.reduce((acc, it) => acc + (it.valor || 0), 0);
        const today = isToday(d);
        return (
          <button
            key={key}
            type="button"
            onClick={() => items.length && onDayClick(d, items)}
            className={cn(
              'flex min-h-[180px] flex-col rounded-lg border bg-card p-3 text-left transition hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40',
              today && 'ring-1 ring-primary/40',
              isWeekend(d) && 'bg-muted/10',
            )}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {format(d, 'EEE', { locale: ptBR })}
                </div>
                <div
                  className={cn(
                    'text-2xl font-bold tabular-nums',
                    today && 'text-primary',
                  )}
                >
                  {format(d, 'd')}
                </div>
              </div>
              {items.length > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums text-right">
                  {items.length}
                  <br />
                  {formatShortBRL(total)}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-0.5">
              {items.slice(0, 6).map(s => (
                <ServicoChip key={s.id} servico={s} onClick={onChipClick} />
              ))}
              {items.length > 6 && (
                <div className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  <span className="flex -space-x-1">
                    {items.slice(6, 9).map(s => (
                      <span key={s.id} className={cn('h-1.5 w-1.5 rounded-full ring-1 ring-background', VISUAL_DOT[s.visual])} />
                    ))}
                  </span>
                  +{items.length - 6} mais
                </div>
              )}
              {items.length === 0 && (
                <p className="text-[11px] text-muted-foreground/60">Sem serviços</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
