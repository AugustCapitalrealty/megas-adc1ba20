import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyInsightCardProps {
  pendingCorrections: number;
  pendingAcceptance: number;
  pendingNfBoleto: number;
  pendingInfoRequests: number;
  pendingJustificativas: number;
  pendingCiencia: number;
  concluded: number;
  total: number;
  isBackofficeOrAdmin: boolean;
  newInQueue: number;
  waitingSolicitor: number;
  onAction?: () => void;
}

export function DailyInsightCard({
  pendingCorrections,
  pendingAcceptance,
  pendingNfBoleto,
  pendingInfoRequests,
  pendingJustificativas,
  concluded,
  total,
  isBackofficeOrAdmin,
  newInQueue,
  waitingSolicitor,
  onAction,
}: DailyInsightCardProps) {
  const totalPending = pendingCorrections + pendingAcceptance + pendingNfBoleto + pendingInfoRequests + pendingJustificativas;

  const insights: string[] = [];

  if (isBackofficeOrAdmin) {
    if (newInQueue > 0) insights.push(`${newInQueue} solicitaç${newInQueue > 1 ? 'ões' : 'ão'} nova${newInQueue > 1 ? 's' : ''} na fila`);
    if (waitingSolicitor > 0) insights.push(`${waitingSolicitor} aguardando resposta do solicitante`);
  } else {
    if (pendingCorrections > 0) insights.push(`${pendingCorrections} correção${pendingCorrections > 1 ? 'ões' : ''} pendente${pendingCorrections > 1 ? 's' : ''}`);
    if (pendingAcceptance > 0) insights.push(`${pendingAcceptance} OC${pendingAcceptance > 1 ? 's' : ''} para liberar`);
    if (pendingNfBoleto > 0) insights.push(`${pendingNfBoleto} NF/Boleto${pendingNfBoleto > 1 ? 's' : ''} para enviar`);
    if (pendingInfoRequests > 0) insights.push(`${pendingInfoRequests} pedido${pendingInfoRequests > 1 ? 's' : ''} de informação`);
    if (pendingJustificativas > 0) insights.push(`${pendingJustificativas} justificativa${pendingJustificativas > 1 ? 's' : ''} de OC pendente${pendingJustificativas > 1 ? 's' : ''}`);
  }

  const isAllClear = totalPending === 0;
  const Icon = isAllClear ? CheckCircle2 : totalPending >= 3 ? AlertTriangle : Clock;
  const iconColor = isAllClear ? 'text-success' : totalPending >= 3 ? 'text-warning' : 'text-info';
  const bgColor = isAllClear ? 'bg-success/5 border-success/20' : totalPending >= 3 ? 'bg-warning/5 border-warning/20' : 'bg-info/5 border-info/20';

  const message = isAllClear
    ? total === 0
      ? 'Nenhuma solicitação criada ainda. Comece criando a primeira!'
      : 'Tudo em dia! Nenhuma ação pendente no momento.'
    : insights.join(' · ');

  return (
    <Card className={cn('border', bgColor)}>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Icon className={cn('h-5 w-5 shrink-0', iconColor)} />
        <p className={cn('text-sm text-foreground flex-1', !isAllClear && 'font-semibold')}>
          <span className="font-medium">Resumo: </span>
          {message}
        </p>
        {!isAllClear && onAction && (
          <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-xs" onClick={onAction}>
            Ver pendências <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
