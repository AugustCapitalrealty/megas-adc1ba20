import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface DueDiligenceModuleProps {
  valorNumerico: number;
  confirmada: boolean;
  numeroProjuris: string;
  temProcessoProjuris: boolean;
  onConfirmadaChange: (checked: boolean) => void;
  onNumeroProjurisChange: (value: string) => void;
  onTemProcessoChange: (checked: boolean) => void;
}

export function DueDiligenceModule({
  valorNumerico,
  confirmada,
  numeroProjuris,
  temProcessoProjuris,
  onConfirmadaChange,
  onNumeroProjurisChange,
  onTemProcessoChange,
}: DueDiligenceModuleProps) {
  // Só exibe se valor >= 50k
  if (valorNumerico < 50000) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <Shield className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Due Diligence Obrigatória
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-4">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Contratações acima de R$ 50.000 exigem pesquisa reputacional do fornecedor antes da formalização.
        </p>

        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-medium mb-2">O que você deve fazer:</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Após definição comercial, solicite Due Diligence no Projuris</li>
            <li>Aguarde parecer do Jurídico (favorável/desfavorável)</li>
            <li>Somente após parecer, comunique o vencedor da concorrência</li>
          </ol>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="tem_processo_projuris"
              checked={temProcessoProjuris}
              onCheckedChange={(checked) => onTemProcessoChange(checked === true)}
            />
            <div className="flex-1">
              <Label htmlFor="tem_processo_projuris" className="cursor-pointer text-sm">
                Já possuo processo de Due Diligence no Projuris
              </Label>
              
              {temProcessoProjuris && (
                <div className="mt-2">
                  <Label htmlFor="numero_projuris" className="text-xs text-muted-foreground">
                    Número do Processo
                  </Label>
                  <Input
                    id="numero_projuris"
                    value={numeroProjuris}
                    onChange={(e) => onNumeroProjurisChange(e.target.value)}
                    placeholder="Ex: PROJ-2024-0001"
                    className="mt-1 h-9"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3 pt-2 border-t">
            <Checkbox
              id="due_diligence_confirmada"
              checked={confirmada}
              onCheckedChange={(checked) => onConfirmadaChange(checked === true)}
            />
            <Label htmlFor="due_diligence_confirmada" className="cursor-pointer text-sm font-medium">
              Declaro ciência da obrigatoriedade da Due Diligence <span className="text-destructive">*</span>
            </Label>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
