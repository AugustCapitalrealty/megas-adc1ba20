import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'success' | 'warning' | 'destructive';

interface SlaKpiCardProps {
  label: string;
  value: ReactNode;
  suffix?: string;
  icon: ReactNode;
  tone?: Tone;
  active?: boolean;
  onClick?: () => void;
  /** Variação numérica vs período anterior (mesma unidade do valor) */
  delta?: number | null;
  /** "Subir é bom" (true para % no prazo) ou "subir é ruim" (false para estourado) */
  deltaPositive?: 'up' | 'down';
  hint?: string;
}

const toneRing: Record<Tone, string> = {
  neutral: 'border-l-border',
  success: 'border-l-success',
  warning: 'border-l-warning',
  destructive: 'border-l-destructive',
};
const toneText: Record<Tone, string> = {
  neutral: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};
const toneIconBg: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function SlaKpiCard({
  label,
  value,
  suffix,
  icon,
  tone = 'neutral',
  active,
  onClick,
  delta,
  deltaPositive = 'up',
  hint,
}: SlaKpiCardProps) {
  const interactive = !!onClick;
  const showDelta = delta !== null && delta !== undefined && !Number.isNaN(delta);
  const isUp = showDelta && (delta as number) > 0;
  const isDown = showDelta && (delta as number) < 0;
  const isGood =
    (deltaPositive === 'up' && isUp) || (deltaPositive === 'down' && isDown);
  const isBad =
    (deltaPositive === 'up' && isDown) || (deltaPositive === 'down' && isUp);

  return (
    <Card
      onClick={onClick}
      className={cn(
        'border-l-4 transition-all',
        toneRing[tone],
        interactive && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        active && 'ring-2 ring-primary/40 shadow-md',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                'h-8 w-8 rounded-md flex items-center justify-center shrink-0',
                toneIconBg[tone],
              )}
            >
              {icon}
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {label}
            </span>
          </div>
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                <p className="text-xs">{hint}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className={cn('text-3xl font-bold tabular-nums', toneText[tone])}>
            {value}
          </span>
          {suffix && (
            <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
          )}
        </div>
        {showDelta && (
          <div
            className={cn(
              'mt-2 inline-flex items-center gap-1 text-xs font-medium',
              isGood && 'text-success',
              isBad && 'text-destructive',
              !isGood && !isBad && 'text-muted-foreground',
            )}
          >
            {isUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : isDown ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span>
              {(delta as number) > 0 ? '+' : ''}
              {delta} vs. período anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}