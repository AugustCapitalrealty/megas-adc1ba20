import { cn } from '@/lib/utils';
import type { RequestStatus } from '@/types';
import { STATUS_LABELS, STATUS_ACTION_LABELS } from '@/types';
import { Clock, Eye, AlertCircle, CheckCircle, XCircle, Cog, FileCheck, CheckCheck, Send, HelpCircle, FileText, Receipt, CreditCard, Truck, PackageCheck, Ban, Wrench } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
  showActionHint?: boolean;
}

const statusConfig: Record<RequestStatus, { 
  className: string;
  Icon: typeof Clock;
}> = {
  recebido: { className: 'status-recebido', Icon: Clock },
  em_analise: { className: 'status-em-analise', Icon: Eye },
  pendente_correcao: { className: 'status-pendente', Icon: AlertCircle },
  aprovado: { className: 'status-aprovado', Icon: CheckCircle },
  rejeitado: { className: 'status-rejeitado', Icon: XCircle },
  em_processamento: { className: 'status-em-processamento', Icon: Cog },
  oc_ac_emitida: { className: 'status-oc-emitida', Icon: FileCheck },
  aguardando_aceite: { className: 'status-aguardando-aceite', Icon: Send },
  aguardando_informacoes: { className: 'status-aguardando-info', Icon: HelpCircle },
  concluida: { className: 'status-concluida', Icon: CheckCheck },
  aguardando_nf_boleto: { className: 'status-aguardando-nf', Icon: FileText },
  nf_boleto_enviados: { className: 'status-nf-enviados', Icon: Receipt },
  enviado_pagamento: { className: 'status-enviado-pagamento', Icon: CreditCard },
  liberado_fornecedor: { className: 'status-liberado-fornecedor', Icon: Truck },
  enviado_fornecedor: { className: 'status-enviado-fornecedor', Icon: PackageCheck },
  cancelado: { className: 'status-cancelado', Icon: Ban },
};

export function StatusBadge({ status, className, showActionHint = false }: StatusBadgeProps) {
  const config = statusConfig[status];
  const { Icon } = config;
  const actionHint = STATUS_ACTION_LABELS[status];

  const badge = (
    <span
      className={cn('status-badge', config.className, className)}
      aria-label={`Status: ${STATUS_LABELS[status]}. ${actionHint}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {STATUS_LABELS[status]}
    </span>
  );

  if (showActionHint && actionHint) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {actionHint}
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
