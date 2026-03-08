import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Bell, ClipboardList, Rocket, X } from 'lucide-react';

const STORAGE_KEY = 'onboarding_done';

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
}

const steps: TourStep[] = [
  {
    title: 'Crie sua primeira solicitação',
    description: 'Clique em "Nova Solicitação" para abrir um chamado de AC ou OC de forma rápida e guiada.',
    icon: Plus,
  },
  {
    title: 'Acompanhe suas solicitações',
    description: 'No menu "Minhas Solicitações" você vê o status de cada pedido em tempo real.',
    icon: ClipboardList,
  },
  {
    title: 'Fique por dentro das atualizações',
    description: 'O sino de notificações avisa quando há mudanças no status ou ações pendentes.',
    icon: Bell,
  },
];

interface WelcomeTourProps {
  userName?: string;
  onComplete: () => void;
}

export function WelcomeTour({ userName, onComplete }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const handleFinish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    onComplete();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <Card className="border-primary/30 bg-primary/5 relative overflow-hidden">
      <button
        onClick={handleFinish}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fechar tour"
      >
        <X className="h-4 w-4" />
      </button>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            {currentStep === 0 && !userName ? (
              <Rocket className="h-6 w-6 text-primary" />
            ) : (
              <Icon className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {currentStep === 0 && (
              <p className="text-sm text-primary font-medium mb-1">
                Bem-vindo{userName ? `, ${userName}` : ''}! 👋
              </p>
            )}
            <h3 className="font-semibold text-base">{step.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentStep
                        ? 'w-6 bg-primary'
                        : i < currentStep
                        ? 'w-1.5 bg-primary/50'
                        : 'w-1.5 bg-muted-foreground/20'
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {currentStep < steps.length - 1 && (
                  <Button variant="ghost" size="sm" onClick={handleFinish}>
                    Pular
                  </Button>
                )}
                <Button size="sm" onClick={handleNext}>
                  {currentStep < steps.length - 1 ? 'Próximo' : 'Começar!'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}
