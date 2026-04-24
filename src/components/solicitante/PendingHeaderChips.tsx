import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Receipt, Eye, PartyPopper } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PendingHeaderChipsProps {
  pendingCorrections: number;
  pendingAcceptance: number;
  pendingNfBoleto: number;
  pendingInfoRequests?: number;
  pendingCiencia?: number;
  onViewPending: (filter: string) => void;
  onDarCiencia?: () => void;
  className?: string;
}

interface Chip {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  filter: string;
  variant: 'destructive' | 'success' | 'purple' | 'info' | 'warning';
}

const variantClasses: Record<Chip['variant'], string> = {
  destructive: 'border-destructive/40 text-destructive hover:bg-destructive/10',
  success: 'border-success/40 text-success hover:bg-success/10',
  purple: 'border-[hsl(260,70%,50%)]/40 text-[hsl(260,70%,50%)] hover:bg-[hsl(260,70%,50%)]/10',
  info: 'border-info/40 text-info hover:bg-info/10',
  warning: 'border-warning/40 text-warning hover:bg-warning/10',
};

const countBg: Record<Chip['variant'], string> = {
  destructive: 'bg-destructive text-destructive-foreground',
  success: 'bg-success text-success-foreground',
  purple: 'bg-[hsl(260,70%,50%)] text-white',
  info: 'bg-info text-info-foreground',
  warning: 'bg-warning text-warning-foreground',
};

/**
 * Compact header chip bar — replaces the larger PendingActionsCard
 * when the user has pending actions. Inspired by Linear / Stripe inbox bars.
 */
export function PendingHeaderChips({
  pendingCorrections,
  pendingAcceptance,
  pendingNfBoleto,
  pendingInfoRequests = 0,
  pendingCiencia = 0,
  onViewPending,
  onDarCiencia,
  className,
}: PendingHeaderChipsProps) {
  const pendentesEmVoce = pendingCorrections + pendingInfoRequests;
  const total =
    pendentesEmVoce + pendingAcceptance + pendingNfBoleto + pendingCiencia;

  if (total === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm',
          className
        )}
      >
        <PartyPopper className="h-4 w-4 text-success shrink-0" />
        <span className="text-success font-medium">Tudo em dia</span>
        <span className="text-muted-foreground text-xs">— nenhuma ação pendente</span>
      </div>
    );
  }

  const allChips: Chip[] = [
    {
      key: 'pendentes',
      label: 'Pendentes em você',
      count: pendentesEmVoce,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      filter: 'pendentes',
      variant: 'destructive',
    },
    {
      key: 'aceite',
      label: 'Liberar OC',
      count: pendingAcceptance,
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      filter: 'oc_emitida',
      variant: 'success',
    },
    {
      key: 'nf',
      label: 'NF/Boleto',
      count: pendingNfBoleto,
      icon: <Receipt className="h-3.5 w-3.5" />,
      filter: 'enviadas',
      variant: 'purple',
    },
    {
      key: 'ciencia',
      label: 'Dar ciência',
      count: pendingCiencia,
      icon: <Eye className="h-3.5 w-3.5" />,
      filter: 'ciencia',
      variant: 'warning',
    },
  ];
  const chips = allChips.filter((c) => c.count > 0);

  return (
    <TooltipProvider delayDuration={150}>
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5 pr-2 border-r border-destructive/20">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span className="text-sm font-semibold text-foreground">
          {total} {total === 1 ? 'pendência' : 'pendências'}
        </span>
      </div>
      {chips.map((chip) => {
        const button = (
          <Button
            key={chip.key}
            variant="outline"
            size="sm"
            onClick={() =>
              chip.key === 'ciencia' && onDarCiencia ? onDarCiencia() : onViewPending(chip.filter)
            }
            className={cn('h-7 gap-1.5 text-xs px-2.5', variantClasses[chip.variant])}
            aria-label={`${chip.label}: ${chip.count} ${chip.count === 1 ? 'item' : 'itens'}`}
          >
            {chip.icon}
            <span>{chip.label}</span>
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                countBg[chip.variant]
              )}
            >
              {chip.count}
            </span>
          </Button>
        );
        if (chip.key === 'pendentes' && (pendingCorrections > 0 || pendingInfoRequests > 0)) {
          return (
            <Tooltip key={chip.key}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-0.5">
                  <div>{pendingCorrections} para corrigir</div>
                  <div>{pendingInfoRequests} para responder</div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        }
        return button;
      })}
    </div>
    </TooltipProvider>
  );
}