import { cn } from '@/lib/utils';
import type { OcDistribution } from '@/hooks/useMonitoramentoOC';

interface OcDistributionBarProps {
  data: OcDistribution;
  className?: string;
  onSegmentClick?: (key: keyof OcDistribution) => void;
}

const SEGMENTS: Array<{
  key: keyof OcDistribution;
  label: string;
  bg: string;
  dot: string;
}> = [
  { key: 'em_prazo', label: 'em prazo', bg: 'bg-success', dot: 'bg-success' },
  { key: 'atencao', label: 'atenção', bg: 'bg-warning', dot: 'bg-warning' },
  { key: 'pendente', label: 'pend. justif.', bg: 'bg-destructive', dot: 'bg-destructive' },
  { key: 'adiado', label: 'adiado', bg: 'bg-blue-500', dot: 'bg-blue-500' },
  { key: 'cancel', label: 'cancel.', bg: 'bg-muted-foreground', dot: 'bg-muted-foreground' },
];

export function OcDistributionBar({ data, className, onSegmentClick }: OcDistributionBarProps) {
  const total = SEGMENTS.reduce((acc, s) => acc + (data[s.key] || 0), 0);

  if (total === 0) {
    return <div className={cn('h-3 w-full rounded-full bg-muted', className)} />;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
        {SEGMENTS.map(s => {
          const value = data[s.key] || 0;
          if (value === 0) return null;
          const pct = (value / total) * 100;
          return (
            <button
              key={s.key}
              type="button"
              className={cn(s.bg, 'transition-all hover:opacity-80', onSegmentClick && 'cursor-pointer')}
              style={{ width: `${pct}%` }}
              title={`${s.label}: ${value} (${pct.toFixed(0)}%)`}
              onClick={() => onSegmentClick?.(s.key)}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {SEGMENTS.map(s => {
          const value = data[s.key] || 0;
          const pct = total > 0 ? (value / total) * 100 : 0;
          return (
            <span
              key={s.key}
              className={cn('flex items-center gap-1.5', onSegmentClick && 'cursor-pointer hover:opacity-80')}
              onClick={() => onSegmentClick?.(s.key)}
            >
              <span className={cn('h-2 w-2 rounded-full', s.dot)} />
              <span className="font-medium tabular-nums">{value}</span>
              <span className="text-muted-foreground">{s.label} · {pct.toFixed(0)}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}