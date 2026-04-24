import { cn } from '@/lib/utils';
import type { CalendarioStatusVisual, ServicoCalendario } from '@/hooks/useCalendarioServicos';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EMPREENDIMENTO_LABELS } from '@/types';

export const VISUAL_LABEL: Record<CalendarioStatusVisual, string> = {
  agendado: 'Agendado',
  atrasado: 'Atrasado (sem NF)',
  oc_enviada: 'OC enviada ao fornecedor',
  oc_nao_liberada: 'OC com solicitante',
  aguardando_nf: 'Aguardando NF',
  concluido: 'Concluído / pagamento',
  cancel_solicitado: 'Cancelamento solicitado',
  cancelado: 'Cancelado',
  em_processamento: 'Em processamento',
};

export const VISUAL_BG: Record<CalendarioStatusVisual, string> = {
  agendado: 'bg-warning text-warning-foreground',
  atrasado: 'bg-orange-500 text-white',
  oc_enviada: 'bg-success text-success-foreground',
  oc_nao_liberada: 'bg-blue-500 text-white',
  aguardando_nf: 'bg-purple-500 text-white',
  concluido: 'bg-muted text-muted-foreground',
  cancel_solicitado: 'bg-destructive/80 text-destructive-foreground',
  cancelado: 'bg-destructive text-destructive-foreground',
  em_processamento: 'bg-secondary text-secondary-foreground',
};

export const VISUAL_DOT: Record<CalendarioStatusVisual, string> = {
  agendado: 'bg-warning',
  atrasado: 'bg-orange-500',
  oc_enviada: 'bg-success',
  oc_nao_liberada: 'bg-blue-500',
  aguardando_nf: 'bg-purple-500',
  concluido: 'bg-muted-foreground',
  cancel_solicitado: 'bg-destructive/80',
  cancelado: 'bg-destructive',
  em_processamento: 'bg-secondary-foreground/40',
};

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

interface ServicoChipProps {
  servico: ServicoCalendario;
  onClick?: (s: ServicoCalendario) => void;
}

export function ServicoChip({ servico, onClick }: ServicoChipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(servico);
            }}
            className={cn(
              'w-full truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-left transition hover:opacity-90',
              VISUAL_BG[servico.visual]
            )}
          >
            {servico.fornecedor_razao || servico.protocolo}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs space-y-1">
          <div className="font-semibold">#{servico.protocolo}</div>
          <div className="text-muted-foreground">{EMPREENDIMENTO_LABELS[servico.empreendimento]}</div>
          <div>{servico.fornecedor_razao || '—'}</div>
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', VISUAL_DOT[servico.visual])} />
            <span>{VISUAL_LABEL[servico.visual]}</span>
          </div>
          <div className="text-muted-foreground">Valor: {formatCurrency(servico.valor)}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}