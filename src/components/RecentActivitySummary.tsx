import { Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { HistoricoSolicitacao } from '@/types';
import { STATUS_LABELS, type RequestStatus } from '@/types';

interface RecentActivitySummaryProps {
  historico: (HistoricoSolicitacao & { usuario_nome?: string })[];
}

export function RecentActivitySummary({ historico }: RecentActivitySummaryProps) {
  const recent = historico.slice(0, 3);
  if (recent.length === 0) return null;

  return (
    <div className="bg-muted/50 rounded-lg p-3 mb-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Atividade Recente
      </p>
      <div className="space-y-1.5">
        {recent.map((h) => (
          <div key={h.id} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: ptBR })}
            </span>
            {h.status_anterior && h.status_novo && h.status_anterior !== h.status_novo ? (
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground">{STATUS_LABELS[h.status_anterior as RequestStatus] || h.status_anterior}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{STATUS_LABELS[h.status_novo as RequestStatus] || h.status_novo}</span>
              </span>
            ) : (
              <span className="font-medium truncate">{h.acao}</span>
            )}
            {h.usuario_nome && (
              <span className="text-muted-foreground ml-auto shrink-0">por {h.usuario_nome}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
