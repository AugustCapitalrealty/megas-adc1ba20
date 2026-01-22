import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export type SlaStatus = 'no_prazo' | 'atencao' | 'estourado';

interface SlaBadgeProps {
  status: SlaStatus;
  diasUteis: number;
  className?: string;
  showDays?: boolean;
}

const statusConfig: Record<SlaStatus, { 
  label: string; 
  className: string; 
  Icon: React.ElementType;
}> = {
  no_prazo: {
    label: 'No Prazo',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
    Icon: CheckCircle,
  },
  atencao: {
    label: 'Atenção',
    className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100',
    Icon: AlertTriangle,
  },
  estourado: {
    label: 'Estourado',
    className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
    Icon: XCircle,
  },
};

export function SlaBadge({ status, diasUteis, className, showDays = true }: SlaBadgeProps) {
  const config = statusConfig[status] || statusConfig.no_prazo;
  const { Icon } = config;

  return (
    <Badge 
      variant="outline" 
      className={cn('gap-1.5 font-medium', config.className, className)}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
      {showDays && (
        <span className="text-xs opacity-75">
          ({diasUteis} {diasUteis === 1 ? 'dia' : 'dias'})
        </span>
      )}
    </Badge>
  );
}

export function SlaIndicator({ diasUteis }: { diasUteis: number }) {
  const getStatus = (dias: number): SlaStatus => {
    if (dias <= 2) return 'no_prazo';
    if (dias === 3) return 'atencao';
    return 'estourado';
  };

  return <SlaBadge status={getStatus(diasUteis)} diasUteis={diasUteis} />;
}
