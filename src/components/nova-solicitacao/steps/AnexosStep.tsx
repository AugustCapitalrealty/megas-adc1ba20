import { FileText, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MultiFileUpload, OtherFilesUpload } from '@/components/FileUpload';
import type { StepProps } from '../types';

interface AnexosStepProps extends StepProps {
  getRequiredAttachments: () => { tipo: string; label: string; required: boolean }[];
}

export function AnexosStep({ formState, derived, setters, getRequiredAttachments }: AnexosStepProps) {
  const { naturezaOrcamentaria, origemCusto, temChamadoInfraspeak, emergencial, semMemorial, justificativaSemMemorial, anexos, outrosAnexos } = formState;
  const { isOC, isAC } = derived;

  return (
    <div className="space-y-4">
      {/* OC - Água/Energia info */}
      {isOC && (naturezaOrcamentaria === 'agua' || naturezaOrcamentaria === 'energia_eletrica') && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Água/Energia:</strong> Anexe a fatura (obrigatório) e a planilha de rateio (opcional).
          </AlertDescription>
        </Alert>
      )}

      {/* OC - Demais naturezas */}
      {isOC && !(naturezaOrcamentaria === 'agua' || naturezaOrcamentaria === 'energia_eletrica') && (
        <>
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>Proposta do Fornecedor:</strong> Anexe a proposta do fornecedor em PDF (obrigatório).
            </AlertDescription>
          </Alert>
          <div className="flex items-center space-x-2 p-3 rounded-lg border">
            <Checkbox id="temChamado" checked={temChamadoInfraspeak} onCheckedChange={(checked) => setters.setTemChamadoInfraspeak(!!checked)} />
            <Label htmlFor="temChamado" className="cursor-pointer">Existe chamado Infraspeak?</Label>
          </div>
        </>
      )}

      {isAC && !emergencial && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Anexe os documentos em formato PDF (máx. 100MB cada)</p>
          <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="semMemorial"
                checked={semMemorial}
                onCheckedChange={(checked) => {
                  setters.setSemMemorial(!!checked);
                  if (!checked) setters.setJustificativaSemMemorial('');
                }}
              />
              <Label htmlFor="semMemorial" className="cursor-pointer text-sm">
                Não tenho memorial descritivo/escopo para esta solicitação
              </Label>
            </div>
            {semMemorial && (
              <Textarea
                placeholder="Justifique por que não possui memorial descritivo/escopo..."
                value={justificativaSemMemorial}
                onChange={(e) => setters.setJustificativaSemMemorial(e.target.value)}
                rows={2}
                className="mt-2"
              />
            )}
          </div>
        </div>
      )}

      {isAC && emergencial && (
        <p className="text-sm text-muted-foreground">Anexe os documentos obrigatórios em formato PDF (máx. 100MB cada)</p>
      )}

      {isAC && (naturezaOrcamentaria === 'agua' || naturezaOrcamentaria === 'energia_eletrica') && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Água/Energia:</strong> Anexe a fatura (obrigatório) e a planilha de rateio (opcional).
          </AlertDescription>
        </Alert>
      )}

      {origemCusto === 'cliente' && (
        <Alert className="bg-warning/10 border-warning">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription>
            <strong>Origem Cliente:</strong> É obrigatório anexar o comunicado ao cliente.
          </AlertDescription>
        </Alert>
      )}

      <MultiFileUpload requirements={getRequiredAttachments()} files={anexos} onFilesChange={setters.setAnexos} />
      <OtherFilesUpload files={outrosAnexos} onFilesChange={setters.setOutrosAnexos} />
    </div>
  );
}
