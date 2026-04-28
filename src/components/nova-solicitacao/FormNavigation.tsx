import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Step, StepDefinition, FormState, DerivedValues } from './types';

interface FormNavigationProps {
  currentStep: Step;
  visibleSteps: StepDefinition[];
  currentIndex: number;
  submitting: boolean;
  canProceed: boolean;
  canSubmit?: boolean;
  firstInvalidStepLabel?: string | null;
  firstErrorMessage?: string | null;
  hasStepErrors?: boolean;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function FormNavigation({ currentStep, visibleSteps, currentIndex, submitting, canProceed, canSubmit = true, firstInvalidStepLabel = null, firstErrorMessage = null, hasStepErrors = false, onNext, onBack, onSubmit }: FormNavigationProps) {
  const submitDisabled = submitting || !canSubmit;
  const tooltipMessage = firstInvalidStepLabel
    ? `Falta completar a etapa "${firstInvalidStepLabel}" para enviar.`
    : 'Complete todas as etapas obrigatórias para enviar.';
  const submitButton = (
    <Button
      onClick={onSubmit}
      disabled={submitDisabled}
      aria-disabled={submitDisabled}
      className="shadow-lg sm:shadow-none gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
    >
      {submitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : canSubmit ? (
        <ShieldCheck className="h-4 w-4" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      {submitting ? 'Enviando…' : canSubmit ? 'Enviar Solicitação' : 'Enviar Solicitação'}
    </Button>
  );
  const nextStep = visibleSteps[currentIndex + 1];
  const nextLabel = nextStep && currentIndex < visibleSteps.length - 2
    ? `Ir para ${nextStep.label}`
    : 'Próximo';
  const nextButton = (
    <Button
      onClick={onNext}
      disabled={hasStepErrors}
      className="shadow-lg sm:shadow-none gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
    >
      {nextLabel}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
  return (
    <div className="flex justify-between sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t shadow-[0_-2px_8px_-4px_hsl(var(--foreground)/0.08)] sm:border-t-0 sm:shadow-none p-4 sm:p-0 sm:static sm:bg-transparent sm:backdrop-blur-none -mx-4 sm:mx-0 z-10 animate-fade-in motion-reduce:animate-none">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={currentIndex === 0}
        className="gap-2 transition-transform duration-200 hover:-translate-x-0.5"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
      {currentStep === 'revisao' ? (
        !canSubmit && !submitting ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>{submitButton}</span>
              </TooltipTrigger>
              <TooltipContent>{tooltipMessage}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : submitButton
      ) : hasStepErrors && firstErrorMessage ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{nextButton}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{firstErrorMessage}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        nextButton
      )}
    </div>
  );
}
