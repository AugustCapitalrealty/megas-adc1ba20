import { Check, AlertTriangle, ChevronDown, FileText, Sparkles, DollarSign, Package } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RateioPreview } from '@/components/RateioPreview';
import { cn } from '@/lib/utils';
import type { StepProps } from '../types';

interface DescricaoStepProps extends StepProps {
  isValidatingDescription: boolean;
  descriptionValidation: { isVague: boolean; suggestion?: string } | null;
  formatCurrency: (v: string) => string;
}

export function DescricaoStep({ formState, derived, setters, isValidatingDescription, descriptionValidation, formatCurrency }: DescricaoStepProps) {
  const { descricao, valor, empreendimento, tipoRateio } = formState;
  const { valorNumerico } = derived;

  return (
    <>
      {/* Rateio Preview */}
      {empreendimento === 'todos' && valorNumerico > 0 && (
        <RateioPreview
          valorTotal={valorNumerico}
          tipoRateio={tipoRateio}
          onTipoRateioChange={setters.setTipoRateio}
          onRateioValoresChange={setters.setRateioValores}
        />
      )}

      <div className="space-y-6">
        {/* Campo Descrição */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="descricao" className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              O que você precisa?
            </Label>
            {isValidatingDescription && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Analisando...
              </span>
            )}
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary hover:bg-transparent gap-1">
                <Sparkles className="h-3 w-3" />
                Ver exemplos de boa descrição
                <ChevronDown className="h-3 w-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                <AlertDescription className="text-sm space-y-2">
                  <p className="text-blue-800 dark:text-blue-200">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Bom:</span> "Aquisição de 4 luminárias para troca das atuais que estão queimadas. Será 2 para a portaria, 1 para o quiosque e 1 sala administrativa."
                  </p>
                  <p className="text-blue-800 dark:text-blue-200">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Bom:</span> "Contratação de serviço de reparo do ar-condicionado da sala administrativa, pois o equipamento apresentou falha e não está refrigerando."
                  </p>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>

          <Textarea
            id="descricao"
            placeholder="Descreva detalhadamente o serviço ou material necessário, incluindo quantidade, localização e motivo..."
            value={descricao}
            onChange={(e) => setters.setDescricao(e.target.value)}
            rows={5}
            className={cn(
              "min-h-[120px] border-2 transition-colors",
              descricao.length > 0 && descriptionValidation?.isVague
                ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
                : descricao.length >= 50
                  ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                  : "border-muted focus:border-primary focus:ring-primary/20"
            )}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{descricao.length} caracteres</span>
            {descricao.length < 50 && descricao.length > 0 && (
              <span className="text-amber-600">Mínimo recomendado: 50 caracteres</span>
            )}
            {descricao.length >= 50 && !descriptionValidation?.isVague && (
              <span className="text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Descrição adequada
              </span>
            )}
          </div>

          {descriptionValidation?.isVague && !isValidatingDescription && (
            <Alert className="bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <span className="font-medium">Descrição pode estar incompleta</span>
                <p className="text-sm mt-1 text-amber-700 dark:text-amber-300">
                  {descriptionValidation.suggestion}
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Campo Valor */}
        <div className="space-y-2">
          <Label htmlFor="valor" className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Qual o valor?
          </Label>
          <Input
            id="valor"
            placeholder="R$ 0,00"
            value={valor ? formatCurrency(valor) : ''}
            onChange={(e) => setters.setValor(e.target.value.replace(/\D/g, ''))}
            className="text-lg font-medium"
          />
          {valorNumerico > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />
              {valorNumerico <= 1000 ? 'Fluxo: OC (até R$ 1.000)' : 'Fluxo: Definir tipo de contratação'}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
