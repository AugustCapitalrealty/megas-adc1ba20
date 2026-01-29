import { Badge } from '@/components/ui/badge';
import { INSTRUMENTO_JURIDICO_LABELS_SHORT, type InstrumentoJuridico } from '@/types';

interface InstrumentoJuridicoBadgeProps {
  instrumento: InstrumentoJuridico | null | undefined;
  showLabel?: boolean;
}

const getBadgeVariant = (instrumento: InstrumentoJuridico): string => {
  switch (instrumento) {
    case 'oc':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    case 'termo_contratacao':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'contrato_prestacao':
    case 'contrato_fornecimento':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    case 'contrato_empreitada':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function InstrumentoJuridicoBadge({ instrumento, showLabel = false }: InstrumentoJuridicoBadgeProps) {
  if (!instrumento) return null;

  return (
    <Badge 
      variant="outline" 
      className={`text-xs ${getBadgeVariant(instrumento)}`}
    >
      {showLabel ? INSTRUMENTO_JURIDICO_LABELS_SHORT[instrumento] : INSTRUMENTO_JURIDICO_LABELS_SHORT[instrumento]}
    </Badge>
  );
}
