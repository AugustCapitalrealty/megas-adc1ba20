import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CorrectionDeadlineBadgeProps {
  dataPendenteCorrecao: string | null;
  status: string;
  prazoTotalDias?: number;
}

export function CorrectionDeadlineBadge({ 
  dataPendenteCorrecao, 
  status,
  prazoTotalDias = 30 
}: CorrectionDeadlineBadgeProps) {
  // Only show for pendente_correcao status
  if (status !== 'pendente_correcao' || !dataPendenteCorrecao) {
    return null;
  }

  const dataPendente = new Date(dataPendenteCorrecao);
  const now = new Date();
  const diffMs = now.getTime() - dataPendente.getTime();
  const diasPassados = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diasRestantes = prazoTotalDias - diasPassados;

  if (diasRestantes <= 0) {
    return (
      <Badge 
        variant="destructive" 
        className="gap-1 animate-pulse"
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
        "gap-1",
        isUrgent && "bg-destructive/10 text-destructive border-destructive/30 animate-pulse",
        isWarning && "bg-warning/10 text-warning border-warning/30",
        !isUrgent && !isWarning && "bg-muted text-muted-foreground"
      )}
    >
      <Clock className="h-3 w-3" />
      {diasRestantes === 1 ? '1 dia restante' : `${diasRestantes} dias restantes`}
    </Badge>
  );
}
