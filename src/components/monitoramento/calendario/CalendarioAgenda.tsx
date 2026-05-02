import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CalendarDays, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EMPREENDIMENTO_LABELS } from '@/types';
import type { ServicoCalendario, ServicoCalendarioDia } from '@/hooks/useCalendarioServicos';
import { VISUAL_BG, VISUAL_LABEL, ordenarServicos } from './ServicoChip';

interface CalendarioAgendaProps {
  byDay: Map<string, ServicoCalendarioDia[]>;
  onChipClick: (s: ServicoCalendario) => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function CalendarioAgenda({ byDay, onChipClick }: CalendarioAgendaProps) {
  const grouped = useMemo(() => {
    const keys = Array.from(byDay.keys()).sort();
    return keys.map(k => {
      const items = ordenarServicos(byDay.get(k) || []);
      const total = items.reduce((acc, it) => acc + (it.valor || 0), 0);
      return { key: k, items, total };
    });
  }, [byDay]);

  if (grouped.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
        <Inbox className="h-10 w-10 opacity-40" />
        <p className="text-sm">Sem serviços para exibir.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(({ key, items, total }) => (
        <Card key={key} className="overflow-hidden">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold capitalize">
                {format(parseISO(key + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {items.length} {items.length === 1 ? 'serviço' : 'serviços'} · {formatCurrency(total)}
            </span>
          </div>
          <ul className="divide-y">
            {items.map(s => (
              <li
                key={s.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-muted/30"
                role="button"
                tabIndex={0}
                onClick={() => onChipClick(s)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChipClick(s);
                  }
                }}
              >
                <Badge
                  variant="outline"
                  className={cn('shrink-0 text-[10px] border-transparent', VISUAL_BG[s.visual])}
                >
                  {VISUAL_LABEL[s.visual]}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-semibold tabular-nums">#{s.protocolo}</span>{' '}
                    <span className="text-muted-foreground">— {s.fornecedor_razao || 'Sem fornecedor'}</span>
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {EMPREENDIMENTO_LABELS[s.empreendimento]} · {formatCurrency(s.valor)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChipClick(s);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" /> Ver
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
