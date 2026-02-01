import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Edit, CheckCircle, Receipt, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingAction {
  type: 'correcao' | 'aceite_oc' | 'nf_boleto';
  count: number;
  label: string;
  description: string;
}

interface PendingActionsCardProps {
  pendingCorrections: number;
  pendingAcceptance: number;
  pendingNfBoleto: number;
  onViewPending: (filter: string) => void;
  className?: string;
}

export function PendingActionsCard({
  pendingCorrections,
  pendingAcceptance,
  pendingNfBoleto,
  onViewPending,
  className,
}: PendingActionsCardProps) {
  const totalPending = pendingCorrections + pendingAcceptance + pendingNfBoleto;
  
  if (totalPending === 0) return null;

  const allActions: PendingAction[] = [
    {
      type: 'correcao',
      count: pendingCorrections,
      label: 'Correções',
      description: 'Solicitações que precisam de ajustes',
    },
    {
      type: 'aceite_oc',
      count: pendingAcceptance,
      label: 'Liberar OC',
      description: 'Ordens de compra aguardando liberação',
    },
    {
      type: 'nf_boleto',
      count: pendingNfBoleto,
      label: 'NF/Boleto',
      description: 'Aguardando envio de documentos fiscais',
    },
  ];
  
  const actions = allActions.filter(a => a.count > 0);

  const getFilterForAction = (type: string) => {
    switch (type) {
      case 'correcao': return 'correcoes';
      case 'aceite_oc': return 'oc_emitida';
      case 'nf_boleto': return 'aguardando_nf';
      default: return 'todas';
    }
  };

  const getIconForAction = (type: string) => {
    switch (type) {
      case 'correcao': return <Edit className="h-5 w-5" />;
      case 'aceite_oc': return <CheckCircle className="h-5 w-5" />;
      case 'nf_boleto': return <Receipt className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getColorForAction = (type: string) => {
    switch (type) {
      case 'correcao': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'aceite_oc': return 'text-success bg-success/10 border-success/20';
      case 'nf_boleto': return 'text-[hsl(260,70%,50%)] bg-[hsl(260,70%,50%)]/10 border-[hsl(260,70%,50%)]/20';
      default: return 'text-warning bg-warning/10 border-warning/20';
    }
  };

  return (
    <Card className={cn(
      "border-2 border-destructive/30 bg-gradient-to-r from-destructive/5 to-background shadow-md",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Alert Icon */}
          <div className="flex-shrink-0 p-2 rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">
                Ações Pendentes
              </h3>
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                {totalPending}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              Você tem {totalPending} {totalPending === 1 ? 'solicitação que precisa' : 'solicitações que precisam'} da sua atenção
            </p>
            
            {/* Action Items */}
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.type}
                  variant="outline"
                  size="sm"
                  onClick={() => onViewPending(getFilterForAction(action.type))}
                  className={cn(
                    "gap-2 h-9 border",
                    getColorForAction(action.type)
                  )}
                >
                  {getIconForAction(action.type)}
                  <span>{action.label}</span>
                  <span className="font-bold">({action.count})</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
