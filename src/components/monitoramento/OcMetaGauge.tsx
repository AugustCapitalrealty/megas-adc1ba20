import { cn } from '@/lib/utils';

interface OcMetaGaugeProps {
  value: number; // % atingido (0-100)
  meta: number;
  size?: number;
  comNf: number;
  totalMes: number;
}

/**
 * Gauge SVG mostrando % de OCs do mês com NF emitida vs meta.
 * Padrão visual idêntico ao MetaGauge do SLA Dashboard.
 */
export function OcMetaGauge({ value, meta, size = 180, comNf, totalMes }: OcMetaGaugeProps) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const filled = arc * (pct / 100);

  const tone =
    pct >= meta ? 'text-success' : pct >= meta - 20 ? 'text-warning' : 'text-destructive';

  const metaPos = (meta / 100) * arc;

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-[225deg]"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          strokeDasharray={`${arc} ${c}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${c}`}
          strokeLinecap="round"
          className={cn('transition-all duration-700 ease-out', tone)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth={2}
          strokeDasharray={`2 ${c}`}
          strokeDashoffset={-metaPos + 1}
          strokeLinecap="butt"
          className="opacity-70"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 pointer-events-none">
        <div className={cn('text-5xl font-bold tracking-tight tabular-nums', tone)}>{pct}%</div>
        <div className="text-xs text-muted-foreground mt-0.5">com NF</div>
        <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
          {comNf}/{totalMes} no mês
        </div>
      </div>
      <div className="absolute bottom-2 text-[10px] text-muted-foreground uppercase tracking-wider">
        meta {meta}%
      </div>
    </div>
  );
}