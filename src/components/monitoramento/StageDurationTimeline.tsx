import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ArrowRight } from 'lucide-react';
import { type HistoricoSolicitacao } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  recebido: 'Em Fila',
  em_analise: 'Em Análise',
  pendente_correcao: 'Correção',
  aprovado: 'Em Lançamento',
  rejeitado: 'Não Aprovado',
  em_processamento: 'Em Aprovação',
  oc_ac_emitida: 'OC/AC Emitida',
  concluida: 'Finalizada',
  aguardando_aceite: 'Aguardando Aceite',
  aguardando_informacoes: 'Aguardando Info',
  aguardando_nf_boleto: 'Aguardando NF',
  nf_boleto_enviados: 'NF Enviados',
  enviado_pagamento: 'Env. Pagamento',
  liberado_fornecedor: 'Liberado Fornecedor',
  enviado_fornecedor: 'Enviado Fornecedor',
  cancelado: 'Cancelado',
  aguardando_execucao: 'Aguardando Execução',
};

interface StageEntry {
  status: string;
  label: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMs: number;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  if (hours < 24) {
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

interface StageDurationTimelineProps {
  historico: (HistoricoSolicitacao & { usuario_nome?: string })[];
  createdAt: string;
  currentStatus: string;
}

export function StageDurationTimeline({ historico, createdAt, currentStatus }: StageDurationTimelineProps) {
  const stages = useMemo(() => {
    // Sort historico ascending
    const sorted = [...historico]
      .filter(h => h.status_novo)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const result: StageEntry[] = [];
    
    // First stage starts at creation
    let currentStageStatus = 'recebido';
    let currentStageStart = new Date(createdAt);

    for (const entry of sorted) {
      if (!entry.status_novo || entry.status_novo === currentStageStatus) continue;

      const transitionTime = new Date(entry.created_at);
      const durationMs = transitionTime.getTime() - currentStageStart.getTime();

      result.push({
        status: currentStageStatus,
        label: STATUS_LABELS[currentStageStatus] || currentStageStatus,
        startedAt: currentStageStart,
        endedAt: transitionTime,
        durationMs: Math.max(0, durationMs),
      });

      currentStageStatus = entry.status_novo;
      currentStageStart = transitionTime;
    }

    // Current/final stage
    const now = new Date();
    result.push({
      status: currentStageStatus,
      label: STATUS_LABELS[currentStageStatus] || currentStageStatus,
      startedAt: currentStageStart,
      endedAt: ['concluida', 'cancelado', 'rejeitado'].includes(currentStageStatus) ? currentStageStart : null,
      durationMs: Math.max(0, now.getTime() - currentStageStart.getTime()),
    });

    return result;
  }, [historico, createdAt, currentStatus]);

  const totalMs = stages.reduce((sum, s) => sum + s.durationMs, 0);
  const maxMs = Math.max(...stages.map(s => s.durationMs), 1);

  if (stages.length <= 1) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Tempo por Etapa
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            Total: {formatDuration(totalMs)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {stages.map((stage, i) => {
          const widthPercent = Math.max(4, (stage.durationMs / maxMs) * 100);
          const isCurrent = i === stages.length - 1 && !stage.endedAt;
          return (
            <div key={`${stage.status}-${i}`} className="flex items-center gap-2 text-xs">
              <span className="w-[120px] shrink-0 truncate text-muted-foreground">
                {stage.label}
              </span>
              <div className="flex-1 h-5 bg-muted/40 rounded-sm overflow-hidden">
                <div
                  className={`h-full rounded-sm flex items-center px-1.5 text-[10px] font-medium transition-all ${
                    isCurrent
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-primary/60 text-primary-foreground'
                  }`}
                  style={{ width: `${widthPercent}%` }}
                >
                  {formatDuration(stage.durationMs)}
                </div>
              </div>
              {i < stages.length - 1 && (
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
