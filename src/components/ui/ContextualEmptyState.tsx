import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, Inbox, FileCheck, Truck, XCircle, AlertTriangle, Clock, Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateConfig {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  subtitle: string;
}

const SOLICITANTE_CONFIGS: Record<string, EmptyStateConfig> = {
  todas: {
    icon: <Inbox className="h-10 w-10" />,
    iconClassName: 'text-muted-foreground',
    title: 'Nenhuma solicitação ainda',
    subtitle: 'Crie sua primeira solicitação para começar',
  },
  com_backoffice: {
    icon: <Clock className="h-10 w-10" />,
    iconClassName: 'text-muted-foreground',
    title: 'Nenhuma solicitação com o backoffice',
    subtitle: 'Todas as suas solicitações já foram processadas',
  },
  correcoes: {
    icon: <CheckCircle className="h-10 w-10" />,
    iconClassName: 'text-success',
    title: 'Nenhuma correção pendente',
    subtitle: 'Suas solicitações estão em dia — nenhuma ação necessária',
  },
  oc_emitida: {
    icon: <FileCheck className="h-10 w-10" />,
    iconClassName: 'text-muted-foreground',
    title: 'Nenhuma OC aguardando aceite',
    subtitle: 'Quando uma OC for emitida, ela aparecerá aqui',
  },
  liberadas: {
    icon: <Truck className="h-10 w-10" />,
    iconClassName: 'text-muted-foreground',
    title: 'Nenhuma solicitação liberada',
    subtitle: 'Solicitações em execução aparecerão aqui',
  },
  reprovadas: {
    icon: <CheckCircle className="h-10 w-10" />,
    iconClassName: 'text-success',
    title: 'Nenhuma solicitação reprovada',
    subtitle: 'Ótimo! Todas as suas solicitações foram aprovadas',
  },
  concluidas: {
    icon: <Inbox className="h-10 w-10" />,
    iconClassName: 'text-muted-foreground',
    title: 'Nenhuma solicitação concluída',
    subtitle: 'Solicitações finalizadas aparecerão aqui',
  },
};

const BACKOFFICE_CONFIGS: Record<string, EmptyStateConfig> = {
  recebidas: {
    icon: <CheckCircle className="h-10 w-10" />,
    iconClassName: 'text-success',
    title: 'Fila limpa!',
    subtitle: 'Nenhuma solicitação aguardando análise no momento',
  },
  pendentes: {
    icon: <CheckCircle className="h-10 w-10" />,
    iconClassName: 'text-success',
    title: 'Sem pendências',
    subtitle: 'Nenhuma solicitação aguardando correção do solicitante',
  },
  em_processamento: {
    icon: <Inbox className="h-10 w-10" />,
    iconClassName: 'text-muted-foreground',
    title: 'Nenhuma em processamento',
    subtitle: 'Solicitações assumidas em andamento aparecerão aqui',
  },
  oc_emitidas: {
    icon: <FileCheck className="h-10 w-10" />,
    iconClassName: 'text-muted-foreground',
    title: 'Nenhuma OC emitida',
    subtitle: 'OCs aguardando aceite do solicitante aparecerão aqui',
  },
  liberadas: {
    icon: <Truck className="h-10 w-10" />,
    iconClassName: 'text-muted-foreground',
    title: 'Nenhuma solicitação liberada',
    subtitle: 'Solicitações liberadas ao fornecedor aparecerão aqui',
  },
  concluidas: {
    icon: <Inbox className="h-10 w-10" />,
    iconClassName: 'text-muted-foreground',
    title: 'Nenhuma solicitação concluída',
    subtitle: 'O histórico de concluídas aparecerá aqui',
  },
  rejeitadas: {
    icon: <Inbox className="h-10 w-10" />,
    iconClassName: 'text-muted-foreground',
    title: 'Nenhuma solicitação rejeitada',
    subtitle: 'Solicitações reprovadas aparecerão aqui',
  },
  cancelamento_pendente: {
    icon: <CheckCircle className="h-10 w-10" />,
    iconClassName: 'text-success',
    title: 'Nenhum cancelamento pendente',
    subtitle: 'Não há solicitações de cancelamento para revisar',
  },
};

interface ContextualEmptyStateProps {
  tab: string;
  variant: 'solicitante' | 'backoffice';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ContextualEmptyState({ tab, variant, action }: ContextualEmptyStateProps) {
  const configs = variant === 'solicitante' ? SOLICITANTE_CONFIGS : BACKOFFICE_CONFIGS;
  const config = configs[tab] || {
    icon: <Inbox className="h-10 w-10" />,
    iconClassName: 'text-muted-foreground',
    title: 'Nenhum item encontrado',
    subtitle: '',
  };

  return (
    <Card className="border-dashed bg-muted/20 animate-fade-in motion-reduce:animate-none">
      <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
        <div
          className={cn(
            'inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-background ring-1 ring-border',
            config.iconClassName,
          )}
        >
          {config.icon}
        </div>
        <p className="ds-text-h4 text-foreground">{config.title}</p>
        <p className="ds-text-body text-muted-foreground text-center max-w-sm">{config.subtitle}</p>
        {action && (
          <Button className="mt-2 transition-transform duration-200 hover:scale-[1.02]" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
