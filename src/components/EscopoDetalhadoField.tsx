import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertTriangle } from 'lucide-react';
import { INSTRUMENTO_JURIDICO_LABELS, type InstrumentoJuridico } from '@/types';

interface EscopoDetalhadoFieldProps {
  instrumentoJuridico: InstrumentoJuridico;
  escopo: string;
  onEscopoChange: (value: string) => void;
  minCaracteres?: number;
}

export function EscopoDetalhadoField({
  instrumentoJuridico,
  escopo,
  onEscopoChange,
  minCaracteres = 100,
}: EscopoDetalhadoFieldProps) {
  // Só exibe se NÃO for OC simples
  if (instrumentoJuridico === 'oc') return null;

  const caracteresRestantes = minCaracteres - escopo.length;
  const isValido = escopo.length >= minCaracteres;

  return (
    <div className="space-y-3">
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <FileText className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          <span className="font-medium">Identificamos que sua solicitação requer formalização jurídica</span>{' '}
          ({INSTRUMENTO_JURIDICO_LABELS[instrumentoJuridico]}). Por favor, detalhe o escopo para elaboração da minuta.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="escopo_detalhado" className="flex items-center gap-2">
          Escopo Detalhado para Minuta <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="escopo_detalhado"
          value={escopo}
          onChange={(e) => onEscopoChange(e.target.value)}
          placeholder="Descreva:
- Etapas do serviço
- Prazos esperados
- Materiais envolvidos (se aplicável)
- Condições específicas de execução"
          className="min-h-[150px]"
        />
        <div className="flex items-center justify-between text-xs">
          <span className={`${isValido ? 'text-green-600' : 'text-muted-foreground'}`}>
            {escopo.length}/{minCaracteres} caracteres
          </span>
          {!isValido && caracteresRestantes > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Faltam {caracteresRestantes} caracteres
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
