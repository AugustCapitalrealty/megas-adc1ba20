import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, Info } from 'lucide-react';

interface DueDiligenceModuleProps {
  valorNumerico: number;
  confirmada: boolean;
  numeroProjuris: string;
  temProcessoProjuris: boolean;
  onConfirmadaChange: (checked: boolean) => void;
  onNumeroProjurisChange: (value: string) => void;
  onTemProcessoChange: (checked: boolean) => void;
  /** Se true, exibe versão simplificada/informativa (para visualização, não edição) */
  readOnly?: boolean;
}

export function DueDiligenceModule({
  valorNumerico,
  confirmada,
  numeroProjuris,
  temProcessoProjuris,
  onConfirmadaChange,
  onNumeroProjurisChange,
  onTemProcessoChange,
  readOnly = false,
}: DueDiligenceModuleProps) {
  // Só exibe se valor >= 50k
  if (valorNumerico < 50000) return null;

  // Versão informativa (read-only) para visualização de status
  if (readOnly) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Info className="h-5 w-5" />
            Due Diligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            O Backoffice verificará se a empresa possui Due Diligence válida com o Jurídico da Capital Realty.
            Caso não possua, será solicitada ao Jurídico e você será notificado sobre o andamento.
          </p>
          {numeroProjuris && (
            <p className="text-sm">
              <span className="font-medium">Número Webdox informado:</span>{' '}
              <span className="font-mono">{numeroProjuris}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {confirmada 
              ? '✅ Ciência da obrigatoriedade confirmada'
              : '⚠️ Pendente confirmação de ciência'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Versão completa para edição (formulário)
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
            <li>Após definição comercial, solicite Due Diligence no Webdox</li>
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
                Já possuo processo de Due Diligence no Webdox
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
