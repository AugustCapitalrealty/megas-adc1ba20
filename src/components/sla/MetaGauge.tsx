import { cn } from '@/lib/utils';

interface MetaGaugeProps {
  /** Valor atingido (0-100) */
  value: number;
  /** Meta (0-100) */
  meta: number;
  size?: number;
}

/**
 * Ring gauge SVG (sem libs externas) que mostra o atingimento da meta de SLA.
 * Cor muda conforme distância da meta:
 *   value >= meta            → success
 *   meta - 20 <= value <meta → warning
 *   value < meta - 20        → destructive
 */
export function MetaGauge({ value, meta, size = 180 }: MetaGaugeProps) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Arco aberto na base: 270° de cobertura
  const arc = c * 0.75;
  const filled = arc * (pct / 100);

  const tone =
    pct >= meta
      ? 'text-success'
      : pct >= meta - 20
      ? 'text-warning'
      : 'text-destructive';

  const metaPos = (meta / 100) * arc;

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-[225deg]"
        aria-hidden
      >
        {/* trilho */}
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
        {/* progresso */}
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
        {/* marca da meta */}
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
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
        <div className={cn('text-5xl font-bold tracking-tight', tone)}>
          {pct}%
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">no prazo</div>
      </div>
      <div className="absolute bottom-2 text-[10px] text-muted-foreground uppercase tracking-wider">
        meta {meta}%
      </div>
    </div>
  );
}