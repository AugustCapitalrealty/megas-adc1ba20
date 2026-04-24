import { cn } from '@/lib/utils';

interface SlaDistributionBarProps {
  noPrazo: number;
  atencao: number;
  estourado: number;
  className?: string;
}

export function SlaDistributionBar({
  noPrazo,
  atencao,
  estourado,
  className,
}: SlaDistributionBarProps) {
  const total = noPrazo + atencao + estourado;
  if (total === 0) {
    return (
      <div className={cn('h-3 w-full rounded-full bg-muted', className)} />
    );
  }
  const p1 = (noPrazo / total) * 100;
  const p2 = (atencao / total) * 100;
  const p3 = (estourado / total) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
        {p1 > 0 && (
          <div
            className="bg-success transition-all"
            style={{ width: `${p1}%` }}
            title={`No prazo: ${noPrazo} (${p1.toFixed(0)}%)`}
          />
        )}
        {p2 > 0 && (
          <div
            className="bg-warning transition-all"
            style={{ width: `${p2}%` }}
            title={`Atenção: ${atencao} (${p2.toFixed(0)}%)`}
          />
        )}
        {p3 > 0 && (
          <div
            className="bg-destructive transition-all"
            style={{ width: `${p3}%` }}
            title={`Estourado: ${estourado} (${p3.toFixed(0)}%)`}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="font-medium">{noPrazo}</span>
          <span className="text-muted-foreground">no prazo · {p1.toFixed(0)}%</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" />
          <span className="font-medium">{atencao}</span>
          <span className="text-muted-foreground">atenção · {p2.toFixed(0)}%</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          <span className="font-medium">{estourado}</span>
          <span className="text-muted-foreground">estourado · {p3.toFixed(0)}%</span>
        </span>
      </div>
    </div>
  );
}