import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, HardHat, Building2, Droplets, TrendingUp } from 'lucide-react';
import { INSTRUMENTO_JURIDICO_LABELS, type InstrumentoJuridico } from '@/types';
import { useMemo } from 'react';

interface NaturezaServicoStepProps {
  valorNumerico: number;
  obraCivil: boolean;
  alturaRisco: boolean;
  fossaFiltro: boolean;
  precoVariavel: boolean;
  onObraCivilChange: (checked: boolean) => void;
  onAlturaRiscoChange: (checked: boolean) => void;
  onFossaFiltroChange: (checked: boolean) => void;
  onPrecoVariavelChange: (checked: boolean) => void;
}

const getInstrumentoBadgeColor = (instrumento: InstrumentoJuridico) => {
  switch (instrumento) {
    case 'oc':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'termo_contratacao':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'contrato_prestacao':
    case 'contrato_fornecimento':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'contrato_empreitada':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getInstrumentoDescription = (instrumento: InstrumentoJuridico) => {
  switch (instrumento) {
    case 'oc':
      return 'Dispensa formalização jurídica.';
    case 'termo_contratacao':
      return 'Seu pedido requer formalização jurídica simplificada.';
    case 'contrato_prestacao':
      return 'Contrato formal de prestação de serviços será necessário.';
    case 'contrato_fornecimento':
      return 'Contrato formal de fornecimento será necessário.';
    case 'contrato_empreitada':
      return 'Contrato de empreitada é obrigatório para obras civis.';
    default:
      return '';
  }
};

export function NaturezaServicoStep({
  valorNumerico,
  obraCivil,
  alturaRisco,
  fossaFiltro,
  precoVariavel,
  onObraCivilChange,
  onAlturaRiscoChange,
  onFossaFiltroChange,
  onPrecoVariavelChange,
}: NaturezaServicoStepProps) {
  // Calcular instrumento jurídico client-side (mesmo lógica do backend)
  const instrumentoJuridico = useMemo((): InstrumentoJuridico => {
    if (obraCivil) return 'contrato_empreitada';
    if (alturaRisco || fossaFiltro || precoVariavel) return 'termo_contratacao';
    if (valorNumerico >= 70000) return 'contrato_prestacao';
    if (valorNumerico >= 10000) return 'termo_contratacao';
    return 'oc';
  }, [valorNumerico, obraCivil, alturaRisco, fossaFiltro, precoVariavel]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Natureza do Serviço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Marque as opções que se aplicam ao seu serviço:
          </p>

          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
              <Checkbox
                id="obra_civil"
                checked={obraCivil}
                onCheckedChange={(checked) => onObraCivilChange(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="obra_civil" className="flex items-center gap-2 cursor-pointer font-medium">
                  <Building2 className="h-4 w-4 text-red-500" />
                  O serviço envolve obra civil ou alteração estrutural?
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: reforma, construção, demolição, alterações em alvenaria
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
              <Checkbox
                id="altura_risco"
                checked={alturaRisco}
                onCheckedChange={(checked) => onAlturaRiscoChange(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="altura_risco" className="flex items-center gap-2 cursor-pointer font-medium">
                  <HardHat className="h-4 w-4 text-orange-500" />
                  O serviço envolve trabalho em altura ou risco de vida?
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: manutenção em telhado, limpeza de fachada, trabalho acima de 2m
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
              <Checkbox
                id="fossa_filtro"
                checked={fossaFiltro}
                onCheckedChange={(checked) => onFossaFiltroChange(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="fossa_filtro" className="flex items-center gap-2 cursor-pointer font-medium">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  É um serviço de limpeza de fossa ou filtro?
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Serviços que envolvem espaços confinados ou resíduos
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
              <Checkbox
                id="preco_variavel"
                checked={precoVariavel}
                onCheckedChange={(checked) => onPrecoVariavelChange(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="preco_variavel" className="flex items-center gap-2 cursor-pointer font-medium">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  O valor final pode variar?
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: contratação por m², m³, hora técnica ou preço unitário
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de classificação automática */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Classificação Automática
              </p>
              <Badge className={`${getInstrumentoBadgeColor(instrumentoJuridico)} text-sm px-3 py-1`}>
                {INSTRUMENTO_JURIDICO_LABELS[instrumentoJuridico]}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {getInstrumentoDescription(instrumentoJuridico)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
