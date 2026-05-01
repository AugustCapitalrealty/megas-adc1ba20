import { cn } from '@/lib/utils';
import type {
  CalendarioStatusVisual,
  ServicoCalendario,
  ServicoCalendarioDia,
} from '@/hooks/useCalendarioServicos';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EMPREENDIMENTO_LABELS } from '@/types';
import { formatBR } from '@/lib/date-utils';

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
  previsao_sem_oc: 'Previsão sem OC',
  previsao_sem_oc_risco: 'Previsão em risco (sem OC)',
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
  previsao_sem_oc: 'bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  previsao_sem_oc_risco: 'bg-destructive text-destructive-foreground',
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
  previsao_sem_oc: 'bg-amber-400',
  previsao_sem_oc_risco: 'bg-destructive',
};

/** Prioridade de exibição: menor = mais urgente, vem antes na lista do dia. */
export const VISUAL_PRIORIDADE: Record<CalendarioStatusVisual, number> = {
  previsao_sem_oc_risco: 0,
  atrasado: 1,
  aguardando_nf: 2,
  previsao_sem_oc: 3,
  oc_nao_liberada: 4,
  oc_enviada: 5,
  agendado: 6,
  em_processamento: 7,
  cancel_solicitado: 8,
  concluido: 9,
  cancelado: 10,
};

export function ordenarServicos<T extends { visual: CalendarioStatusVisual; valor?: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const pa = VISUAL_PRIORIDADE[a.visual] ?? 99;
    const pb = VISUAL_PRIORIDADE[b.visual] ?? 99;
    if (pa !== pb) return pa - pb;
    return (b.valor ?? 0) - (a.valor ?? 0);
  });
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

interface ServicoChipProps {
  servico: ServicoCalendarioDia | ServicoCalendario;
  onClick?: (s: ServicoCalendario) => void;
}

export function ServicoChip({ servico, onClick }: ServicoChipProps) {
  const posicao = (servico as ServicoCalendarioDia).posicao ?? 'unico';
  const isMeio = posicao === 'meio';
  const periodo =
    servico.data_inicio && servico.data_fim
      ? `${formatBR(servico.data_inicio + 'T12:00:00', 'dd/MM')} – ${formatBR(servico.data_fim + 'T12:00:00', 'dd/MM')}`
      : null;

  const prefix =
    posicao === 'inicio' ? '▶ '
    : posicao === 'fim' ? '■ '
    : servico.contrato_mensal ? '↻ '
    : '';

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
              'w-full truncate rounded text-left transition hover:opacity-90',
              isMeio
                ? 'h-1.5 px-0 py-0 rounded-none'
                : 'px-1.5 py-0.5 text-[10px] font-medium',
              VISUAL_BG[servico.visual],
              posicao === 'inicio' && 'rounded-r-none',
              posicao === 'fim' && 'rounded-l-none',
            )}
          >
            {!isMeio && (prefix + (servico.fornecedor_razao || servico.protocolo))}
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
          {periodo && (
            <div className="text-muted-foreground">
              {servico.contrato_mensal ? 'Contrato mensal: ' : 'Período: '}{periodo}
            </div>
          )}
          <div className="text-muted-foreground">Valor: {formatCurrency(servico.valor)}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}