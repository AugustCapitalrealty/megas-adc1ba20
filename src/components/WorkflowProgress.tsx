import { cn } from '@/lib/utils';
import type { RequestStatus } from '@/types';
import { CheckCircle2 } from 'lucide-react';

interface WorkflowStep {
  label: string;
  statuses: RequestStatus[];
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { label: 'Recebido', statuses: ['recebido'] },
  { label: 'Análise', statuses: ['em_analise', 'pendente_correcao', 'aguardando_informacoes'] },
  { label: 'Lançamento', statuses: ['aprovado', 'em_processamento'] },
  { label: 'OC Emitida', statuses: ['oc_ac_emitida', 'aguardando_aceite'] },
  { label: 'Liberada', statuses: ['liberado_fornecedor', 'enviado_fornecedor', 'aguardando_nf_boleto', 'nf_boleto_enviados', 'enviado_pagamento'] },
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
  
  if (currentIndex === -1) return null; // Don't show for terminal statuses

  return (
    <div className={cn('flex items-center gap-0.5 w-full', className)}>
      {WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={step.label} className="flex items-center flex-1 min-w-0">
            {/* Step indicator */}
            <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <div className="flex items-center w-full">
                {/* Left connector */}
                {index > 0 && (
                  <div className={cn(
                    'h-[2px] flex-1',
                    isCompleted || isCurrent ? 'bg-primary' : 'bg-border'
                  )} />
                )}
                {/* Dot */}
                <div className={cn(
                  'shrink-0 rounded-full flex items-center justify-center transition-all',
                  isCompleted && 'h-4 w-4 bg-primary',
                  isCurrent && 'h-5 w-5 bg-primary ring-2 ring-primary/20',
                  isFuture && 'h-3 w-3 bg-border',
                )}>
                  {isCompleted && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                  {isCurrent && <div className="h-2 w-2 bg-primary-foreground rounded-full" />}
                </div>
                {/* Right connector */}
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className={cn(
                    'h-[2px] flex-1',
                    isCompleted ? 'bg-primary' : 'bg-border'
                  )} />
                )}
              </div>
              <span className={cn(
                'text-[10px] leading-tight text-center truncate w-full',
                isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground',
                isCompleted && 'text-primary/70'
              )}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
