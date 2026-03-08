import { addDays, differenceInDays, isPast } from 'date-fns';
import { formatBR } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface GarantiaExpiracaoInfoProps {
  dataConclusao: string;
  tipoGarantia: 'servico' | 'produto' | 'ambos';
  diasGarantia?: number | null;
  diasGarantiaServico?: number | null;
  diasGarantiaProduto?: number | null;
}

interface GarantiaStatus {
  dataExpiracao: Date;
  diasRestantes: number;
  expirada: boolean;
}

function GarantiaStatusLine({ 
  label, 
  dataExpiracao, 
  diasRestantes, 
  expirada 
}: { 
  label: string; 
  dataExpiracao: Date; 
  diasRestantes: number; 
  expirada: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <span className="text-muted-foreground text-sm">{label} expira em:</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{formatBR(dataExpiracao, 'dd/MM/yyyy')}</span>
        {expirada ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expirada
          </Badge>
        ) : diasRestantes <= 30 ? (
          <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
            <Clock className="h-3 w-3" />
            {diasRestantes} dias restantes
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-green-700 border-green-300">
            <CheckCircle2 className="h-3 w-3" />
            {diasRestantes} dias restantes
          </Badge>
        )}
      </div>
    </div>
  );
}

export function GarantiaExpiracaoInfo({
  dataConclusao,
  tipoGarantia,
  diasGarantia,
  diasGarantiaServico,
  diasGarantiaProduto,
}: GarantiaExpiracaoInfoProps) {
  const dataInicio = new Date(dataConclusao);
  
  const calcularStatus = (dias: number): GarantiaStatus => {
    const dataExpiracao = addDays(dataInicio, dias);
    const diasRestantes = differenceInDays(dataExpiracao, new Date());
    const expirada = isPast(dataExpiracao);
    
    return { dataExpiracao, diasRestantes, expirada };
  };

  if (tipoGarantia === 'ambos') {
    const servicoStatus = calcularStatus(diasGarantiaServico || 0);
    const produtoStatus = calcularStatus(diasGarantiaProduto || 0);
    
    return (
      <div className="mt-2 space-y-2">
        <GarantiaStatusLine label="Serviço" {...servicoStatus} />
        <GarantiaStatusLine label="Produto" {...produtoStatus} />
      </div>
    );
  }
  
  const status = calcularStatus(diasGarantia || 0);
  return (
    <div className="mt-2">
      <GarantiaStatusLine label="Garantia" {...status} />
    </div>
  );
}
