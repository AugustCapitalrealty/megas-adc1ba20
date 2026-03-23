import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CorrectionDeadlineBadgeProps {
  dataPendenteCorrecao: string | null;
  status: string;
  prazoTotalDias?: number;
}

const TRACKED_STATUSES = ['pendente_correcao', 'aguardando_informacoes'];

export function CorrectionDeadlineBadge({ 
  dataPendenteCorrecao, 
  status,
  prazoTotalDias = 30 
}: CorrectionDeadlineBadgeProps) {
  if (!TRACKED_STATUSES.includes(status) || !dataPendenteCorrecao) {
    return null;
  }

  const dataPendente = new Date(dataPendenteCorrecao);
  const now = new Date();
  const diffMs = now.getTime() - dataPendente.getTime();
  const diasPassados = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diasRestantes = prazoTotalDias - diasPassados;

  const label = status === 'aguardando_informacoes' ? 'para resposta' : 'para correção';

  if (diasRestantes <= 0) {
    return (
      <Badge 
        variant="destructive" 
        className="gap-1 animate-pulse text-[10px]"
      >
        <AlertTriangle className="h-3 w-3" />
        Prazo expirado
      </Badge>
    );
  }

  const isUrgent = diasRestantes <= 7;
  const isWarning = diasRestantes <= 14 && diasRestantes > 7;

  return (
    <Badge 
      variant="outline"
      className={cn(
        "gap-1 text-[10px]",
        isUrgent && "bg-destructive/10 text-destructive border-destructive/30 animate-pulse",
        isWarning && "bg-warning/10 text-warning border-warning/30",
        !isUrgent && !isWarning && "bg-muted text-muted-foreground"
      )}
    >
      <Clock className="h-3 w-3" />
      {diasRestantes === 1 ? `1 dia ${label}` : `${diasRestantes} dias ${label}`}
    </Badge>
  );
}
