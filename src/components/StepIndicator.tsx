import { Check, Save, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
  className?: string;
  showTimeEstimate?: boolean;
  draftSaved?: boolean;
  lastSavedAt?: number | null;
  invalidStepIds?: string[];
}

const MINUTES_PER_STEP = 1.5;

function formatRelative(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 5) return 'agora';
  if (diff < 60) return `há ${diff}s`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  return `há ${h}h`;
}

export function StepIndicator({ steps, currentStepIndex, onStepClick, className, showTimeEstimate = false, draftSaved, lastSavedAt, invalidStepIds = [] }: StepIndicatorProps) {
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);
  const remainingSteps = steps.length - currentStepIndex - 1;
  const estimatedMinutes = Math.ceil(remainingSteps * MINUTES_PER_STEP);

  // Re-render every 15s to update relative timestamp
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  const savedLabel = lastSavedAt ? `Salvo ${formatRelative(lastSavedAt)}` : 'Salvo';

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: Compact view */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-primary">
            Passo {currentStepIndex + 1} de {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {draftSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Save className="h-3 w-3" /> {savedLabel}
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {progressPercent}%
            </span>
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {showTimeEstimate && remainingSteps > 0 && (
          <p className="text-xs text-muted-foreground mt-1.5 text-center">
            ≈ {estimatedMinutes} min restante{estimatedMinutes > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Desktop: Full stepper */}
      <div className="hidden sm:block">
        {/* Progress summary bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {progressPercent}% concluído
            </span>
            {showTimeEstimate && remainingSteps > 0 && (
              <span className="text-xs text-muted-foreground">
                ≈ {estimatedMinutes} min restante{estimatedMinutes > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {draftSaved && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Save className="h-3 w-3" /> {savedLabel}
            </span>
          )}
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isPending = index > currentStepIndex;
              const hasError = invalidStepIds.includes(step.id);
              // Allow clicking on any step that is not the current one, when handler exists
              const isClickable = !!onStepClick && !isCurrent;

              return (
                <li 
                  key={step.id} 
                  className={cn(
                    'flex items-center',
                    index < steps.length - 1 && 'flex-1'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick(index)}
                    disabled={!isClickable}
                    className={cn(
                      'group flex flex-col items-center transition-all duration-200',
                      isClickable && 'cursor-pointer hover:opacity-80',
                      !isClickable && 'cursor-default'
                    )}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {/* Step circle */}
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300',
                        hasError && !isCurrent && 'border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/20',
                        !hasError && isCompleted && 'border-primary bg-primary text-primary-foreground',
                        isCurrent && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20',
                        !hasError && isPending && 'border-muted-foreground/30 bg-background text-muted-foreground'
                      )}
                    >
                      {hasError && !isCurrent ? (
                        <AlertCircle className="h-4 w-4" aria-label="Pendente" />
                      ) : isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : step.icon ? (
                        <step.icon className="h-4 w-4" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </span>

                    {/* Step label */}
                    <span
                      className={cn(
                        'mt-1.5 text-[11px] font-medium text-center max-w-[100px] leading-tight transition-colors',
                        hasError && !isCurrent && 'text-destructive',
                        !hasError && isCompleted && 'text-primary',
                        isCurrent && 'text-primary font-semibold',
                        !hasError && isPending && 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                  </button>

                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-1.5">
                      <div
                        className={cn(
                          'h-0.5 rounded-full transition-all duration-500',
                          isCompleted && !hasError ? 'bg-primary' : 'bg-muted'
                        )}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
