import { cn } from '@/lib/utils';
import type { RequestStatus } from '@/types';
import { CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

interface WorkflowStep {
  label: string;
  statuses: RequestStatus[];
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { label: 'Recebido', statuses: ['recebido'] },
  { label: 'Análise', statuses: ['em_analise', 'pendente_correcao', 'aguardando_informacoes'] },
  { label: 'Lançamento', statuses: ['aprovado', 'em_processamento'] },
  { label: 'OC Emitida', statuses: ['oc_ac_emitida', 'aguardando_aceite'] },
  { label: 'Liberada', statuses: ['liberado_fornecedor', 'aguardando_execucao', 'enviado_fornecedor', 'aguardando_nf_boleto', 'nf_boleto_enviados', 'enviado_pagamento'] },
  { label: 'Concluída', statuses: ['concluida'] },
];

const TERMINAL_STATUSES: RequestStatus[] = ['rejeitado', 'cancelado'];

function getStepIndex(status: RequestStatus): number {
  if (TERMINAL_STATUSES.includes(status)) return -1;
  return WORKFLOW_STEPS.findIndex(step => step.statuses.includes(status));
}

interface WorkflowProgressProps {
  status: RequestStatus;
  className?: string;
}

export function WorkflowProgress({ status, className }: WorkflowProgressProps) {
  const currentIndex = getStepIndex(status);
  const isMobile = useIsMobile();
  
  if (currentIndex === -1) return null; // Don't show for terminal statuses

  const content = (
    <div className={cn('flex items-center gap-0.5 w-full', className)}>
      {WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        const dot = (
          <div className={cn(
            'shrink-0 rounded-full flex items-center justify-center transition-all',
            isCompleted && 'h-5 w-5 bg-primary',
            isCurrent && 'h-6 w-6 bg-primary ring-2 ring-primary/20',
            isFuture && 'h-4 w-4 bg-border',
          )}>
            {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
            {isCurrent && <div className="h-2.5 w-2.5 bg-primary-foreground rounded-full" />}
          </div>
        );

        return (
          <div key={step.label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div className={cn(
                    'h-[2px] flex-1',
                    isCompleted || isCurrent ? 'bg-primary' : 'bg-border'
                  )} />
                )}
                {isMobile ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{dot}</TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">{step.label}</TooltipContent>
                  </Tooltip>
                ) : dot}
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className={cn(
                    'h-[2px] flex-1',
                    isCompleted ? 'bg-primary' : 'bg-border'
                  )} />
                )}
              </div>
              {!isMobile && (
                <span className={cn(
                  'text-[10px] leading-tight text-center truncate w-full',
                  isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground',
                  isCompleted && 'text-primary/70'
                )}>
                  {step.label}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return isMobile ? <TooltipProvider>{content}</TooltipProvider> : content;
}
