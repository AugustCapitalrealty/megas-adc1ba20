import { cn } from '@/lib/utils';
import type { RequestStatus } from '@/types';
import { STATUS_LABELS } from '@/types';
import { Clock, Eye, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

const statusConfig: Record<RequestStatus, { 
  className: string;
  Icon: typeof Clock;
}> = {
  recebido: {
    className: 'status-recebido',
    Icon: Clock,
  },
  em_analise: {
    className: 'status-em-analise',
    Icon: Eye,
  },
  pendente_correcao: {
    className: 'status-pendente',
    Icon: AlertCircle,
  },
  aprovado: {
    className: 'status-aprovado',
    Icon: CheckCircle,
  },
  rejeitado: {
    className: 'status-rejeitado',
    Icon: XCircle,
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const { Icon } = config;

  return (
    <span className={cn('status-badge', config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      {STATUS_LABELS[status]}
    </span>
  );
}