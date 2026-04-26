import { Loader2, AlertTriangle, Building2, Check } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import type { StepProps } from '../types';
import { cn } from '@/lib/utils';

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
          className="grid sm:grid-cols-2 gap-2"
        >
          {allowedEmpreendimentos.map((value) => {
            const selected = formState.empreendimento === value;
            return (
              <Label
                key={value}
                htmlFor={value}
                className={cn(
                  'group relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/40 hover:bg-accent/40',
                )}
              >
                <RadioGroupItem value={value} id={value} className="sr-only" />
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-colors',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Building2 className="h-4 w-4" />
                </div>
                <span className="flex-1 font-medium text-sm">{EMPREENDIMENTO_LABELS[value]}</span>
                {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </Label>
            );
          })}
        </RadioGroup>
      )}
    </div>
  );
}
