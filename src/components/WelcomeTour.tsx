import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Bell, ClipboardList, LayoutDashboard, FileCheck, Users, Timer, Settings, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'onboarding_done';

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
}

const solicitanteSteps: TourStep[] = [
  {
    title: 'Crie sua primeira solicitação',
    description: 'Clique em "Nova Solicitação" para abrir um chamado de AC ou OC de forma rápida e guiada.',
    icon: Plus,
  },
  {
    title: 'Acompanhe suas solicitações',
    description: 'No menu "Solicitações" você vê o status de cada pedido em tempo real.',
    icon: ClipboardList,
  },
  {
    title: 'Fique por dentro das atualizações',
    description: 'O sino de notificações avisa quando há mudanças no status ou ações pendentes.',
    icon: Bell,
  },
];

const backofficeSteps: TourStep[] = [
  {
    title: 'Sua fila de trabalho',
    description: 'No Backoffice você encontra todas as solicitações pendentes organizadas por status.',
    icon: LayoutDashboard,
  },
  {
    title: 'Analise e processe solicitações',
    description: 'Abra cada solicitação para analisar, emitir OC/AC e acompanhar o fluxo completo.',
    icon: FileCheck,
  },
  {
    title: 'Painel Fluig integrado',
    description: 'Acompanhe o status das solicitações no Fluig diretamente pelo Painel.',
    icon: ClipboardList,
  },
];

const adminSteps: TourStep[] = [
  {
    title: 'Gerencie usuários e permissões',
    description: 'Na área Admin, aprove novos usuários e atribua roles de acesso.',
    icon: Users,
  },
  {
    title: 'Dashboard SLA',
    description: 'Monitore o tempo de atendimento e identifique gargalos no processo.',
    icon: Timer,
  },
  {
    title: 'Configurações avançadas',
    description: 'Configure rateios, feriados e parâmetros do sistema.',
    icon: Settings,
  },
];

function getStepsForRole(isBackofficeOrAdmin: boolean, isAdmin: boolean): TourStep[] {
  if (isAdmin) return adminSteps;
  if (isBackofficeOrAdmin) return backofficeSteps;
  return solicitanteSteps;
}

interface WelcomeTourProps {
  userName?: string;
  onComplete: () => void;
}

export function WelcomeTour({ userName, onComplete }: WelcomeTourProps) {
  const { user, profile, isBackofficeOrAdmin, isAdmin } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const steps = getStepsForRole(isBackofficeOrAdmin, isAdmin);

  useEffect(() => {
    // Check DB first, then fallback to localStorage
    if (profile?.onboarding_completed_at) {
      localStorage.setItem(STORAGE_KEY, 'true');
      return;
    }
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, [profile]);

  const handleFinish = async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    onComplete();

    // Persist to DB
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);
    }
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

  const RocketIllustration = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" className="fill-primary/10" />
      <path d="M24 10c-2 6-2 12 0 18 2-6 2-12 0-18z" className="fill-primary/30" />
      <path d="M24 10l-4 14h8L24 10z" className="fill-primary" />
      <circle cx="24" cy="20" r="2" className="fill-primary-foreground" />
      <path d="M20 28c-2 2-4 6-4 8h16c0-2-2-6-4-8" className="fill-primary/20" />
      <path d="M22 28l-1 6h6l-1-6" className="fill-primary/40" />
    </svg>
  );

  const greeting = isAdmin
    ? `Bem-vindo, Admin${userName ? ` ${userName}` : ''}! 🛡️`
    : isBackofficeOrAdmin
    ? `Bem-vindo ao Backoffice${userName ? `, ${userName}` : ''}! 🔧`
    : `Bem-vindo${userName ? `, ${userName}` : ''}! 👋`;

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
            {currentStep === 0 ? (
              <RocketIllustration />
            ) : (
              <Icon className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {currentStep === 0 && (
              <p className="text-sm text-primary font-medium mb-1">
                {greeting}
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
