import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { InstrumentoJuridico } from '@/types';

interface RetencaoTecnicaAlertProps {
  instrumentoJuridico: InstrumentoJuridico;
  valorNumerico: number;
  dataInicio?: string;
  dataFim?: string;
}

export function RetencaoTecnicaAlert({
  instrumentoJuridico,
  valorNumerico,
  dataInicio,
  dataFim,
}: RetencaoTecnicaAlertProps) {
  // Calcula duração em dias
  const calcularDuracaoDias = () => {
    if (!dataInicio || !dataFim) return 0;
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diff = fim.getTime() - inicio.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const duracaoDias = calcularDuracaoDias();
  
  // Verifica se requer retenção técnica
  const isEmpreitada = instrumentoJuridico === 'contrato_empreitada';
  const isContratoGrande = valorNumerico >= 150000 && duracaoDias > 30;
  const requerRetencao = isEmpreitada || isContratoGrande;

  if (!requerRetencao) return null;

  const prazoLiberacao = isEmpreitada ? '90-180 dias' : '45-90 dias';

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800 dark:text-blue-200">
        Retenção Técnica Aplicável
      </AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-300 mt-2">
        <p>Este contrato terá <strong>retenção de 6%</strong> sobre o valor total.</p>
        <p className="text-sm mt-1">
          Prazo de liberação: <strong>{prazoLiberacao}</strong> após termo de entrega.
          {isEmpreitada && <span className="block text-xs mt-1">(Contratos de empreitada possuem prazo maior)</span>}
        </p>
      </AlertDescription>
    </Alert>
  );
}
