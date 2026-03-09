import { Loader2, AlertTriangle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import type { StepProps } from '../types';

interface EmpreendimentoStepProps extends StepProps {
  allowedEmpreendimentos: Empreendimento[];
  loadingEmpreendimentos: boolean;
}

export function EmpreendimentoStep({ formState, setters, allowedEmpreendimentos, loadingEmpreendimentos }: EmpreendimentoStepProps) {
  return (
    <div className="space-y-3">
      {loadingEmpreendimentos ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando empreendimentos...
        </div>
      ) : allowedEmpreendimentos.length === 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Nenhum empreendimento está vinculado a este usuário. Peça ao admin para configurar o empreendimento.
          </AlertDescription>
        </Alert>
      ) : (
        <RadioGroup
          value={formState.empreendimento}
          onValueChange={(v) => setters.setEmpreendimento(v as Empreendimento)}
        >
          {allowedEmpreendimentos.map((value) => (
            <div
              key={value}
              className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer"
            >
              <RadioGroupItem value={value} id={value} />
              <Label htmlFor={value} className="flex-1 cursor-pointer">
                {EMPREENDIMENTO_LABELS[value]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}
    </div>
  );
}
