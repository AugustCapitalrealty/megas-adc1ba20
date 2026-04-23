import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Edit, CheckCircle, Receipt, ChevronRight, CalendarDays, PartyPopper, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingAction {
  type: 'correcao' | 'aceite_oc' | 'nf_boleto' | 'info_requests' | 'justificativa_oc' | 'ciencia_cancelamento';
  count: number;
  label: string;
  description: string;
  ownCount?: number;
}

interface PendingActionsCardProps {
  pendingCorrections: number;
  pendingAcceptance: number;
  pendingNfBoleto: number;
  pendingInfoRequests?: number;
  pendingJustificativas?: number;
  pendingJustificativasOwn?: number;
  pendingCiencia?: number;
  isBackofficeOrAdmin?: boolean;
  onViewPending: (filter: string) => void;
  onDarCiencia?: () => void;
  className?: string;
}

export function PendingActionsCard({
  pendingCorrections,
  pendingAcceptance,
  pendingNfBoleto,
  pendingInfoRequests = 0,
  pendingJustificativas = 0,
  pendingJustificativasOwn = 0,
  pendingCiencia = 0,
  isBackofficeOrAdmin = false,
  onViewPending,
  onDarCiencia,
  className,
}: PendingActionsCardProps) {
  // For solicitantes, only count justificativas if they have their own pending
  const effectiveJustificativas = isBackofficeOrAdmin ? pendingJustificativas : pendingJustificativasOwn;
  const totalPending = pendingCorrections + pendingAcceptance + pendingNfBoleto + pendingInfoRequests + effectiveJustificativas + pendingCiencia;

  // Empty state — all clear
  if (totalPending === 0) {
    return (
      <Card className={cn(
        "border border-success/30 bg-gradient-to-r from-success/5 to-background",
        className
      )}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 rounded-full bg-success/10">
              <PartyPopper className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Tudo em dia!</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Nenhuma ação pendente no momento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allActions: PendingAction[] = [
    { type: 'correcao', count: pendingCorrections, label: 'Correções', description: 'Solicitações que precisam de ajustes' },
    { type: 'aceite_oc', count: pendingAcceptance, label: 'Liberar OC', description: 'Ordens de compra aguardando liberação' },
    { type: 'nf_boleto', count: pendingNfBoleto, label: 'NF/Boleto', description: 'Aguardando envio de documentos fiscais' },
    { type: 'info_requests', count: pendingInfoRequests, label: 'Informações', description: 'Backoffice solicitou informações adicionais' },
    { type: 'justificativa_oc', count: isBackofficeOrAdmin ? pendingJustificativas : pendingJustificativasOwn, label: 'Justificativas OC', description: 'OCs sem NF que precisam de justificativa', ownCount: isBackofficeOrAdmin ? pendingJustificativasOwn : undefined },
    { type: 'ciencia_cancelamento', count: pendingCiencia, label: 'Canceladas', description: 'Solicitações canceladas por falta de resposta — confirme ciência' },
  ];
  
  const actions = allActions.filter(a => a.count > 0);

  const getFilterForAction = (type: string) => {
    switch (type) {
      case 'correcao': return 'correcoes';
      case 'aceite_oc': return 'oc_emitida';
      case 'nf_boleto': return 'enviadas';
      case 'info_requests': return 'informacoes';
      case 'justificativa_oc': return 'justificativa_oc';
      case 'ciencia_cancelamento': return 'ciencia';
      default: return 'todas';
    }
  };

  const getIconForAction = (type: string) => {
    switch (type) {
      case 'correcao': return <Edit className="h-5 w-5" />;
      case 'aceite_oc': return <CheckCircle className="h-5 w-5" />;
      case 'nf_boleto': return <Receipt className="h-5 w-5" />;
      case 'info_requests': return <AlertTriangle className="h-5 w-5" />;
      case 'justificativa_oc': return <CalendarDays className="h-5 w-5" />;
      case 'ciencia_cancelamento': return <Eye className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getColorForAction = (type: string) => {
    switch (type) {
      case 'correcao': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'aceite_oc': return 'text-success bg-success/10 border-success/20';
      case 'nf_boleto': return 'text-[hsl(260,70%,50%)] bg-[hsl(260,70%,50%)]/10 border-[hsl(260,70%,50%)]/20';
      case 'info_requests': return 'text-amber-600 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-700';
      case 'justificativa_oc': return 'text-orange-600 bg-orange-100 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-700';
      case 'ciencia_cancelamento': return 'text-destructive bg-destructive/10 border-destructive/20';
      default: return 'text-warning bg-warning/10 border-warning/20';
    }
  };

  const handleClick = (action: PendingAction) => {
    if (action.type === 'ciencia_cancelamento' && onDarCiencia) {
      onDarCiencia();
    } else if (action.type === 'justificativa_oc') {
      onViewPending('justificativa_oc');
    } else {
      onViewPending(getFilterForAction(action.type));
    }
  };

  return (
    <Card
      className={cn(
        "border-2 border-destructive/30 bg-gradient-to-r from-destructive/5 to-background shadow-md",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">
                Ações Pendentes
              </h3>
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                {totalPending}
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
              {totalPending} {totalPending === 1 ? 'item precisa' : 'itens precisam'} da sua atenção
            </p>
            
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.type}
                  variant="outline"
                  size="sm"
                  onClick={() => handleClick(action)}
                  className={cn(
                    "gap-2 h-9 border focus-visible:ring-2 focus-visible:ring-ring",
                    getColorForAction(action.type)
                  )}
                  aria-label={`${action.label}: ${action.count} ${action.count === 1 ? 'item' : 'itens'}. ${action.description}`}
                >
                  {getIconForAction(action.type)}
                  <span className="truncate max-w-[100px] sm:max-w-none">
                    {action.type === 'ciencia_cancelamento' ? 'Dar ciência' : action.label}
                  </span>
                  <span className="font-bold">({action.count})</span>
                  {action.type === 'justificativa_oc' && action.ownCount != null && action.ownCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-600 text-white dark:bg-orange-500">
                      {action.ownCount} {action.ownCount === 1 ? 'sua' : 'suas'}
                    </span>
                  )}
                  {action.type !== 'ciencia_cancelamento' && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
