import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Edit, CheckCircle, Receipt, ChevronRight, CalendarDays, Sparkles, Eye, Info } from 'lucide-react';
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
  /** Optional summary line shown in the header (e.g. "5 novas na fila · 3 aguardando solicitante") */
  summary?: string;
  onViewPending: (filter: string) => void;
  onDarCiencia?: () => void;
  className?: string;
}

const TONE: Record<string, { icon: string; tile: string; ring: string; bar: string; chip: string }> = {
  correcao: {
    icon: 'text-destructive',
    tile: 'bg-destructive/5 hover:bg-destructive/10 border-destructive/20',
    ring: 'group-hover:ring-destructive/30',
    bar: 'bg-destructive',
    chip: 'bg-destructive text-destructive-foreground',
  },
  aceite_oc: {
    icon: 'text-success',
    tile: 'bg-success/5 hover:bg-success/10 border-success/20',
    ring: 'group-hover:ring-success/30',
    bar: 'bg-success',
    chip: 'bg-success text-success-foreground',
  },
  nf_boleto: {
    icon: 'text-info',
    tile: 'bg-info/5 hover:bg-info/10 border-info/20',
    ring: 'group-hover:ring-info/30',
    bar: 'bg-info',
    chip: 'bg-info text-info-foreground',
  },
  info_requests: {
    icon: 'text-warning',
    tile: 'bg-warning/5 hover:bg-warning/10 border-warning/20',
    ring: 'group-hover:ring-warning/30',
    bar: 'bg-warning',
    chip: 'bg-warning text-warning-foreground',
  },
  justificativa_oc: {
    icon: 'text-warning',
    tile: 'bg-warning/5 hover:bg-warning/10 border-warning/20',
    ring: 'group-hover:ring-warning/30',
    bar: 'bg-warning',
    chip: 'bg-warning text-warning-foreground',
  },
  ciencia_cancelamento: {
    icon: 'text-destructive',
    tile: 'bg-destructive/5 hover:bg-destructive/10 border-destructive/20',
    ring: 'group-hover:ring-destructive/30',
    bar: 'bg-destructive',
    chip: 'bg-destructive text-destructive-foreground',
  },
};

const ICONS: Record<string, JSX.Element> = {
  correcao: <Edit className="h-5 w-5" />,
  aceite_oc: <CheckCircle className="h-5 w-5" />,
  nf_boleto: <Receipt className="h-5 w-5" />,
  info_requests: <Info className="h-5 w-5" />,
  justificativa_oc: <CalendarDays className="h-5 w-5" />,
  ciencia_cancelamento: <Eye className="h-5 w-5" />,
};

const FILTER_MAP: Record<string, string> = {
  correcao: 'correcoes',
  aceite_oc: 'oc_emitida',
  nf_boleto: 'enviadas',
  info_requests: 'informacoes',
  justificativa_oc: 'justificativa_oc',
  ciencia_cancelamento: 'ciencia',
};

export function PendingActionsCard({
  pendingCorrections,
  pendingAcceptance,
  pendingNfBoleto,
  pendingInfoRequests = 0,
  pendingJustificativas = 0,
  pendingJustificativasOwn = 0,
  pendingCiencia = 0,
  isBackofficeOrAdmin = false,
  summary,
  onViewPending,
  onDarCiencia,
  className,
}: PendingActionsCardProps) {
  const effectiveJustificativas = isBackofficeOrAdmin ? pendingJustificativas : pendingJustificativasOwn;
  const totalPending = pendingCorrections + pendingAcceptance + pendingNfBoleto + pendingInfoRequests + effectiveJustificativas + pendingCiencia;

  // Empty state — discreet "all clear"
  if (totalPending === 0) {
    return (
      <Card className={cn('border-success/30 bg-success/5 rounded-xl', className)}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15">
              <Sparkles className="h-4.5 w-4.5 text-success" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-foreground">Tudo em dia</h3>
              <p className="text-xs text-muted-foreground">
                {summary || 'Nenhuma ação pendente no momento.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allActions: PendingAction[] = [
    { type: 'correcao', count: pendingCorrections, label: 'Correções', description: 'Ajustes solicitados' },
    { type: 'aceite_oc', count: pendingAcceptance, label: 'Liberar OC', description: 'OCs aguardando liberação' },
    { type: 'nf_boleto', count: pendingNfBoleto, label: 'NF / Boleto', description: 'Documentos fiscais' },
    { type: 'info_requests', count: pendingInfoRequests, label: 'Informações', description: 'Backoffice pediu detalhes' },
    { type: 'justificativa_oc', count: isBackofficeOrAdmin ? pendingJustificativas : pendingJustificativasOwn, label: 'Justificativas OC', description: 'OCs sem NF', ownCount: isBackofficeOrAdmin ? pendingJustificativasOwn : undefined },
    { type: 'ciencia_cancelamento', count: pendingCiencia, label: 'Dar ciência', description: 'Canceladas por inatividade' },
  ];

  const actions = allActions.filter((a) => a.count > 0);

  const handleClick = (action: PendingAction) => {
    if (action.type === 'ciencia_cancelamento' && onDarCiencia) {
      onDarCiencia();
    } else {
      onViewPending(FILTER_MAP[action.type]);
    }
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-xl border-border/60 bg-card shadow-sm',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Side accent bar */}
      <div className="absolute inset-y-0 left-0 w-1 bg-destructive/80" aria-hidden />

      <CardContent className="p-4 sm:p-5 pl-5 sm:pl-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-[15px]">Ações pendentes</h3>
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
                  {totalPending}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {summary || `${totalPending} ${totalPending === 1 ? 'item precisa' : 'itens precisam'} da sua atenção`}
              </p>
            </div>
          </div>
        </div>

        {/* Action tiles grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {actions.map((action) => {
            const tone = TONE[action.type];
            return (
              <button
                key={action.type}
                onClick={() => handleClick(action)}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
                  'hover:shadow-sm hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  tone.tile
                )}
                aria-label={`${action.label}: ${action.count} ${action.count === 1 ? 'item' : 'itens'}. ${action.description}`}
              >
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background/80 ring-1 ring-transparent transition', tone.icon, tone.ring)}>
                  {ICONS[action.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold leading-none text-foreground">{action.count}</span>
                    {action.type === 'justificativa_oc' && action.ownCount != null && action.ownCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-warning text-warning-foreground">
                        {action.ownCount} {action.ownCount === 1 ? 'sua' : 'suas'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground truncate mt-0.5">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate hidden sm:block">{action.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 group-hover:text-foreground group-hover:translate-x-0.5 transition" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
