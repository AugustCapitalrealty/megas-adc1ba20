import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Inbox,
  Cog,
  FileCheck,
  Truck,
  AlertTriangle,
  Receipt,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { differenceInDays } from 'date-fns';
import type { SolicitacaoBackoffice } from '@/hooks/useBackofficeSolicitacoes';

interface GroupedSolicitacoes {
  recebidas: SolicitacaoBackoffice[];
  em_processamento: SolicitacaoBackoffice[];
  oc_emitidas: SolicitacaoBackoffice[];
  liberadas: SolicitacaoBackoffice[];
  enviadas: SolicitacaoBackoffice[];
  pendentes: SolicitacaoBackoffice[];
  concluidas: SolicitacaoBackoffice[];
  rejeitadas: SolicitacaoBackoffice[];
  cancelamento_pendente: SolicitacaoBackoffice[];
}

interface BackofficeKPIsProps {
  grouped: GroupedSolicitacoes;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface KpiItem {
  label: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  tab: string;
  variant: 'default' | 'warning' | 'destructive' | 'success';
}

export function BackofficeKPIs({ grouped, activeTab, onTabChange }: BackofficeKPIsProps) {
  const kpis = useMemo<KpiItem[]>(() => {
    // Count SLA critical: > 5 days in recebidas, > 3 days since approval in em_processamento
    const slaCritical = [
      ...grouped.recebidas.filter(s => differenceInDays(new Date(), new Date(s.created_at)) > 5),
      ...grouped.em_processamento.filter(s => s.dataAprovacao && differenceInDays(new Date(), new Date(s.dataAprovacao)) > 3),
    ].length;

    // Count NF pending (nf_boleto_enviados)
    const nfPending = grouped.liberadas.filter(s => s.status === 'nf_boleto_enviados').length;

    // Today count for recebidas
    const todayRecebidas = grouped.recebidas.filter(s =>
      differenceInDays(new Date(), new Date(s.created_at)) === 0
    ).length;

    return [
      {
        label: 'Na Fila',
        value: grouped.recebidas.length,
        subtitle: todayRecebidas > 0 ? `+${todayRecebidas} hoje` : 'Nenhuma nova hoje',
        icon: <Inbox className="h-4 w-4" />,
        tab: 'recebidas',
        variant: 'default',
      },
      {
        label: 'Em Processamento',
        value: grouped.em_processamento.length,
        subtitle: `${grouped.em_processamento.filter(s => s.numero_chamado_fluig).length} c/ Fluig`,
        icon: <Cog className="h-4 w-4" />,
        tab: 'em_processamento',
        variant: 'default',
      },
      {
        label: 'OC Emitida',
        value: grouped.oc_emitidas.length,
        subtitle: 'Aguardando aceite',
        icon: <FileCheck className="h-4 w-4" />,
        tab: 'oc_emitidas',
        variant: 'success',
      },
      {
        label: 'Liberadas',
        value: grouped.liberadas.length,
        subtitle: 'Aguardando envio',
        icon: <Truck className="h-4 w-4" />,
        tab: 'liberadas',
        variant: 'default',
      },
      {
        label: 'Enviadas',
        value: grouped.enviadas.length,
        subtitle: nfPending > 0 ? `${nfPending} NF pendente` : 'Em execução/NF',
        icon: <Receipt className="h-4 w-4" />,
        tab: 'enviadas',
        variant: nfPending > 0 ? 'warning' : 'default',
      },
      {
        label: 'SLA Crítico',
        value: slaCritical,
        subtitle: slaCritical > 0 ? 'Atenção necessária' : 'Tudo dentro do prazo',
        icon: <AlertTriangle className="h-4 w-4" />,
        tab: 'recebidas',
        variant: slaCritical > 0 ? 'destructive' : 'default',
      },
    ];
  }, [grouped]);

  const variantClasses: Record<string, string> = {
    default: 'border-border',
    warning: 'border-warning/50 bg-warning/5',
    destructive: 'border-destructive/50 bg-destructive/5',
    success: 'border-success/50 bg-success/5',
  };

  const iconClasses: Record<string, string> = {
    default: 'text-muted-foreground',
    warning: 'text-warning',
    destructive: 'text-destructive',
    success: 'text-success',
  };
  const AnimatedValue = ({ value }: { value: number }) => {
    const animated = useCountUp(value);
    return <span className="text-2xl font-bold tabular-nums">{animated}</span>;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((kpi) => (
        <Card
          key={kpi.label}
          className={cn(
            'cursor-pointer hover:shadow-md transition-all',
            variantClasses[kpi.variant],
            activeTab === kpi.tab && 'ring-2 ring-primary/30'
          )}
          onClick={() => onTabChange(kpi.tab)}
        >
          <CardContent className="p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={cn('', iconClasses[kpi.variant])}>{kpi.icon}</span>
              <AnimatedValue value={kpi.value} />
            </div>
            <span className="text-xs font-medium truncate">{kpi.label}</span>
            <span className="text-[10px] text-muted-foreground truncate">{kpi.subtitle}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
