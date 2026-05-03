import { cn } from '@/lib/utils';
import type {
  CalendarioStatusVisual,
  ServicoCalendario,
  ServicoCalendarioDia,
} from '@/hooks/useCalendarioServicos';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { EMPREENDIMENTO_LABELS } from '@/types';
import { formatBR } from '@/lib/date-utils';
import { toast } from '@/hooks/use-toast';
import { Eye, Copy, GripVertical } from 'lucide-react';

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
  /** Habilita arrastar este chip para outro dia. */
  draggable?: boolean;
  onDragStart?: (s: ServicoCalendario, e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function ServicoChip({ servico, onClick, draggable, onDragStart, onDragEnd }: ServicoChipProps) {
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

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt).then(() => {
      toast({ title: 'Copiado', description: `${label}: ${txt}` });
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                draggable={!!draggable}
                onDragStart={(e) => {
                  if (!draggable) return;
                  e.stopPropagation();
                  e.dataTransfer.effectAllowed = 'move';
                  onDragStart?.(servico, e);
                }}
                onDragEnd={(e) => {
                  if (!draggable) return;
                  onDragEnd?.(e);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClick?.(servico);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={cn(
                  'w-full truncate rounded text-left transition hover:opacity-90',
                  isMeio
                    ? 'h-3 px-0 py-0 rounded-none cursor-pointer'
                    : 'px-1.5 py-0.5 text-[10px] font-medium',
                  draggable && !isMeio && 'cursor-grab active:cursor-grabbing',
                  VISUAL_BG[servico.visual],
                  posicao === 'inicio' && 'rounded-r-none',
                  posicao === 'fim' && 'rounded-l-none',
                )}
                aria-label={`Abrir detalhes de #${servico.protocolo}`}
                title={draggable && !isMeio ? 'Arraste para outro dia para reagendar' : undefined}
              >
                {!isMeio && (
                  <span className="inline-flex w-full items-center gap-1">
                    {draggable && (
                      <GripVertical className="h-2.5 w-2.5 shrink-0 opacity-60" />
                    )}
                    <span className="truncate">{prefix + (servico.fornecedor_razao || servico.protocolo)}</span>
                  </span>
                )}
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
              {draggable && (
                <div className="text-[10px] text-muted-foreground/80 italic pt-0.5">
                  Dica: arraste para outro dia para reagendar.
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => onClick?.(servico)} className="gap-2 text-xs">
          <Eye className="h-3.5 w-3.5" /> Ver detalhes
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => copy(servico.protocolo, 'Protocolo')} className="gap-2 text-xs">
          <Copy className="h-3.5 w-3.5" /> Copiar protocolo
        </ContextMenuItem>
        {servico.fornecedor_razao && (
          <ContextMenuItem onSelect={() => copy(servico.fornecedor_razao!, 'Fornecedor')} className="gap-2 text-xs">
            <Copy className="h-3.5 w-3.5" /> Copiar fornecedor
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}