import { cn } from '@/lib/utils';
import type { RequestStatus } from '@/types';
import { STATUS_LABELS } from '@/types';
import { Clock, Eye, AlertCircle, CheckCircle, XCircle, Cog, FileCheck, CheckCheck, Send, HelpCircle } from 'lucide-react';

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
  em_processamento: {
    className: 'status-em-processamento',
    Icon: Cog,
  },
  oc_ac_emitida: {
    className: 'status-oc-emitida',
    Icon: FileCheck,
  },
  aguardando_aceite: {
    className: 'status-aguardando-aceite',
    Icon: Send,
  },
  aguardando_informacoes: {
    className: 'status-aguardando-info',
    Icon: HelpCircle,
  },
  concluida: {
    className: 'status-concluida',
    Icon: CheckCheck,
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