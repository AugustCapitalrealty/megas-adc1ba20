import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function StepIndicator({ steps, currentStepIndex, onStepClick, className }: StepIndicatorProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: Compact view */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-primary">
            Passo {currentStepIndex + 1} de {steps.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {steps[currentStepIndex]?.label}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: Full stepper */}
      <div className="hidden sm:block">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isPending = index > currentStepIndex;
              const isClickable = isCompleted && onStepClick;

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
                        isCompleted && 'border-primary bg-primary text-primary-foreground',
                        isCurrent && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20',
                        isPending && 'border-muted-foreground/30 bg-background text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </span>

                    {/* Step label */}
                    <span
                      className={cn(
                        'mt-1.5 text-[11px] font-medium text-center max-w-[100px] leading-tight transition-colors',
                        isCompleted && 'text-primary',
                        isCurrent && 'text-primary font-semibold',
                        isPending && 'text-muted-foreground'
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
                          isCompleted ? 'bg-primary' : 'bg-muted'
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
