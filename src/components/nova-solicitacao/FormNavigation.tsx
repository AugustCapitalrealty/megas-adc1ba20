import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Step, StepDefinition, FormState, DerivedValues } from './types';

interface FormNavigationProps {
  currentStep: Step;
  visibleSteps: StepDefinition[];
  currentIndex: number;
  submitting: boolean;
  canProceed: boolean;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function FormNavigation({ currentStep, visibleSteps, currentIndex, submitting, canProceed, onNext, onBack, onSubmit }: FormNavigationProps) {
  return (
    <div className="flex justify-between sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t sm:border-t-0 p-4 sm:p-0 sm:static sm:bg-transparent sm:backdrop-blur-none -mx-4 sm:mx-0 z-10">
      <Button variant="ghost" onClick={onBack} disabled={currentIndex === 0} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
      {currentStep === 'revisao' ? (
        <Button onClick={onSubmit} disabled={submitting} className="shadow-lg sm:shadow-none">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Enviar Solicitação
        </Button>
      ) : (
        <Button onClick={onNext} disabled={!canProceed} className="shadow-lg sm:shadow-none">
          {currentIndex < visibleSteps.length - 2
            ? `Ir para ${visibleSteps[currentIndex + 1]?.label}`
            : 'Próximo'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
