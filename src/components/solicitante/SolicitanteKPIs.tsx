import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Inbox, AlertTriangle, FileCheck, Truck, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SolicitacaoComFornecedor } from './types';

interface KpiItem {
  label: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  tab: string;
  variant: 'default' | 'warning' | 'destructive' | 'success';
}

interface SolicitanteKPIsProps {
  solicitacoes: SolicitacaoComFornecedor[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SolicitanteKPIs({ solicitacoes, activeTab, onTabChange }: SolicitanteKPIsProps) {
  const kpis = useMemo<KpiItem[]>(() => {
    const comBackoffice = solicitacoes.filter(s =>
      ['recebido', 'em_analise', 'aprovado', 'em_processamento'].includes(s.status)
    ).length;

    const correcoes = solicitacoes.filter(s =>
      s.status === 'pendente_correcao' || s.status === 'aguardando_informacoes'
    ).length;

    const aceitarOC = solicitacoes.filter(s => s.status === 'aguardando_aceite').length;

    const liberadas = solicitacoes.filter(s =>
      ['liberado_fornecedor', 'enviado_fornecedor', 'aguardando_nf_boleto', 'nf_boleto_enviados', 'enviado_pagamento'].includes(s.status)
    ).length;

    const concluidas = solicitacoes.filter(s => s.status === 'concluida').length;

    return [
      {
        label: 'Com Backoffice',
        value: comBackoffice,
        subtitle: 'Aguardando análise',
        icon: <Inbox className="h-4 w-4" />,
        tab: 'com_backoffice',
        variant: 'default',
      },
      {
        label: 'Correções',
        value: correcoes,
        subtitle: correcoes > 0 ? 'Ação necessária' : 'Nenhuma pendente',
        icon: <AlertTriangle className="h-4 w-4" />,
        tab: 'correcoes',
        variant: correcoes > 0 ? 'warning' : 'default',
      },
      {
        label: 'Aceitar OC',
        value: aceitarOC,
        subtitle: aceitarOC > 0 ? 'Disponível para aceite' : 'Nenhuma disponível',
        icon: <FileCheck className="h-4 w-4" />,
        tab: 'oc_emitida',
        variant: aceitarOC > 0 ? 'success' : 'default',
      },
      {
        label: 'Liberadas',
        value: liberadas,
        subtitle: 'Em execução',
        icon: <Truck className="h-4 w-4" />,
        tab: 'liberadas',
        variant: 'default',
      },
      {
        label: 'Finalizadas',
        value: concluidas,
        subtitle: 'Processo concluído',
        icon: <CheckCheck className="h-4 w-4" />,
        tab: 'concluidas',
        variant: 'success',
      },
    ];
  }, [solicitacoes]);

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
              <span className="text-2xl font-bold tabular-nums">{kpi.value}</span>
            </div>
            <span className="text-xs font-medium truncate">{kpi.label}</span>
            <span className="text-[10px] text-muted-foreground truncate">{kpi.subtitle}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
