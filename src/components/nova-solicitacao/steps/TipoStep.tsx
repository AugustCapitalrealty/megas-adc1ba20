import { Check, AlertTriangle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TIPO_CONTRATACAO_LABELS, type TipoContratacao } from '@/types';
import type { StepProps } from '../types';

export function TipoStep({ formState, derived, setters }: StepProps) {
  const { tipoContratacao, emergencial } = formState;
  const { valorNumerico } = derived;

  if (valorNumerico <= 1000) return null;

  return (
    <div className="space-y-4">
      <RadioGroup value={tipoContratacao} onValueChange={(v) => setters.setTipoContratacao(v as TipoContratacao)}>
        {Object.entries(TIPO_CONTRATACAO_LABELS).map(([value, label]) => (
          <div key={value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
            <RadioGroupItem value={value} id={value} />
            <Label htmlFor={value} className="flex-1 cursor-pointer">
              {label}
              {value === 'servicos' && <span className="text-sm text-muted-foreground ml-2">(AC)</span>}
              {value !== 'servicos' && <span className="text-sm text-muted-foreground ml-2">(OC)</span>}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {tipoContratacao === 'servicos' && (
        <Alert className="bg-warning/10 border-warning">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="flex items-center justify-between">
            <span>Marque se for uma contratação emergencial</span>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="emergencial"
                checked={emergencial}
                onCheckedChange={(checked) => setters.setEmergencial(!!checked)}
              />
              <Label htmlFor="emergencial" className="font-medium cursor-pointer">
                Emergencial
              </Label>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {emergencial && (
        <Alert>
          <Check className="h-4 w-4 text-success" />
          <AlertDescription>
            <strong>Emergencial:</strong> Dispensa mapa de cotação e orçamentos concorrentes.
            Apenas chamado e orçamento escolhido serão exigidos.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
