import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type KpiIntent = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  intent?: KpiIntent;
  hint?: string;
  /** % ou número de variação. Positivo = up. */
  delta?: number;
  deltaLabel?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const intentRing: Record<KpiIntent, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-[hsl(38,92%,38%)] dark:text-[hsl(38,92%,65%)]',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
};

/**
 * Card de KPI canônico. Usar SEMPRE em vez de variantes locais.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  intent = 'neutral',
  hint,
  delta,
  deltaLabel,
  loading,
  onClick,
  className,
}: KpiCardProps) {
  const Trend = delta == null ? null : delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const trendColor =
    delta == null
      ? ''
      : delta > 0
      ? 'text-success'
      : delta < 0
      ? 'text-destructive'
      : 'text-muted-foreground';

  return (
    <Card
      className={cn(
        'transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="ds-text-label">{label}</p>
            <div className="mt-2 ds-text-h2 font-bold tabular-nums">
              {loading ? <Skeleton className="h-7 w-20" /> : value}
            </div>
            {(hint || Trend) && (
              <div className="mt-1.5 flex items-center gap-1.5 ds-text-caption">
                {Trend && (
                  <span className={cn('flex items-center gap-0.5 font-medium', trendColor)}>
                    <Trend className="h-3 w-3" />
                    {Math.abs(delta as number)}
                    {typeof delta === 'number' && deltaLabel ? '' : '%'}
                  </span>
                )}
                {deltaLabel && <span>{deltaLabel}</span>}
                {hint && <span>{hint}</span>}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn('shrink-0 h-10 w-10 rounded-lg flex items-center justify-center', intentRing[intent])}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}