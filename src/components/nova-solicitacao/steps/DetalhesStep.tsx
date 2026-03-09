import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClienteSelect } from '@/components/ClienteSelect';
import { EscopoDetalhadoField } from '@/components/EscopoDetalhadoField';
import { DueDiligenceModule } from '@/components/DueDiligenceModule';
import { RetencaoTecnicaAlert } from '@/components/RetencaoTecnicaAlert';
import { cn } from '@/lib/utils';
import {
  NATUREZA_ORCAMENTARIA_LABELS,
  ORIGEM_CUSTO_LABELS,
  TIPO_GARANTIA_LABELS,
  type NaturezaOrcamentaria,
  type OrigemCusto,
  type TipoGarantia,
} from '@/types';
import type { StepProps } from '../types';

interface DetalhesStepProps extends StepProps {
  formatCurrency: (v: string) => string;
  handleContratoMensalChange: (checked: boolean) => void;
}

export function DetalhesStep({ formState, derived, setters, formatCurrency, handleContratoMensalChange }: DetalhesStepProps) {
  const {
    naturezaOrcamentaria, origemCusto, empreendimento, clienteId,
    dataInicio, dataFim, parcelas, contratoMensal, retencao6,
    faturamentoDireto, valorServico, valorMaterial, valor,
    chamadoCorretiva, tipoGarantia, diasGarantia, diasGarantiaServico, diasGarantiaProduto,
    escopoDetalhadoMinuta, dueDiligenceConfirmada, dueDiligenceNumeroProjuris, temProcessoProjuris,
  } = formState;
  const { isAC, isOC, isOCAbove1000, valorNumerico, valorServicoNumerico, valorMaterialNumerico, instrumentoJuridico } = derived;

  // Garantia block (shared between AC and OC)
  const GarantiaBlock = () => (
    <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 space-y-3">
      <Label className="text-amber-800 dark:text-amber-200">Tipo de Garantia</Label>
      <Select value={tipoGarantia} onValueChange={(v) => setters.setTipoGarantia(v as TipoGarantia)}>
        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(TIPO_GARANTIA_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {tipoGarantia !== 'nenhuma' && tipoGarantia !== 'ambos' && (
        <div>
          <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia</Label>
          <Input type="number" value={diasGarantia} onChange={(e) => setters.setDiasGarantia(e.target.value)} placeholder="Ex: 90" className="bg-background" />
        </div>
      )}
      {tipoGarantia === 'ambos' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia (Serviço)</Label>
            <Input type="number" value={diasGarantiaServico} onChange={(e) => setters.setDiasGarantiaServico(e.target.value)} placeholder="Ex: 90" className="bg-background" />
          </div>
          <div>
            <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia (Produto)</Label>
            <Input type="number" value={diasGarantiaProduto} onChange={(e) => setters.setDiasGarantiaProduto(e.target.value)} placeholder="Ex: 365" className="bg-background" />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Natureza Orçamentária */}
      {(isAC || (isOC && valorNumerico <= 1000)) && (
        <div>
          <Label>Natureza Orçamentária</Label>
          <Select value={naturezaOrcamentaria} onValueChange={(v) => setters.setNaturezaOrcamentaria(v as NaturezaOrcamentaria)}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {Object.entries(NATUREZA_ORCAMENTARIA_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isOCAbove1000 && naturezaOrcamentaria && (
        <div className="p-3 bg-muted/30 rounded-lg">
          <Label className="text-muted-foreground text-sm">Natureza Orçamentária (automática)</Label>
          <p className="font-medium">{NATUREZA_ORCAMENTARIA_LABELS[naturezaOrcamentaria]}</p>
        </div>
      )}

      {/* Origem do Custo */}
      <div>
        <Label>Origem do Custo</Label>
        <Select
          value={origemCusto}
          onValueChange={(v) => {
            setters.setOrigemCusto(v as OrigemCusto);
            if (v !== 'cliente') setters.setClienteId(null);
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(ORIGEM_CUSTO_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {origemCusto === 'cliente' && (
        <ClienteSelect empreendimento={empreendimento} value={clienteId} onChange={setters.setClienteId} required />
      )}

      {/* AC specific fields */}
      {isAC && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(parseISO(dataInicio), 'dd/MM/yyyy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataInicio ? parseISO(dataInicio) : undefined} onSelect={(date) => setters.setDataInicio(date ? format(date, 'yyyy-MM-dd') : '')} locale={ptBR} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataFim && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(parseISO(dataFim), 'dd/MM/yyyy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataFim ? parseISO(dataFim) : undefined} onSelect={(date) => setters.setDataFim(date ? format(date, 'yyyy-MM-dd') : '')} locale={ptBR} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="contratoMensal" checked={contratoMensal} onCheckedChange={(checked) => handleContratoMensalChange(!!checked)} />
            <Label htmlFor="contratoMensal" className="cursor-pointer">Contrato Mensal</Label>
          </div>

          <div>
            <Label>Parcelas (máx. 12)</Label>
            <Select value={parcelas} onValueChange={setters.setParcelas}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...Array(12)].map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="retencao6" checked={retencao6} onCheckedChange={(checked) => setters.setRetencao6(!!checked)} />
              <Label htmlFor="retencao6" className="cursor-pointer">Retenção de 6%</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="faturamentoDireto"
                checked={faturamentoDireto}
                onCheckedChange={(checked) => {
                  setters.setFaturamentoDireto(!!checked);
                  if (!checked) { setters.setValorServico(''); setters.setValorMaterial(''); }
                }}
              />
              <Label htmlFor="faturamentoDireto" className="cursor-pointer">Faturamento Direto</Label>
            </div>
          </div>

          {faturamentoDireto && (
            <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
              <p className="text-sm text-muted-foreground">
                Informe os valores separados de serviço e material.
                <strong className="block mt-1">A soma deve ser igual ao valor total informado ({formatCurrency(valor)}).</strong>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor do Serviço (R$)</Label>
                  <Input placeholder="R$ 0,00" value={valorServico ? formatCurrency(valorServico) : ''} onChange={(e) => setters.setValorServico(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div>
                  <Label>Valor do Material (R$)</Label>
                  <Input placeholder="R$ 0,00" value={valorMaterial ? formatCurrency(valorMaterial) : ''} onChange={(e) => setters.setValorMaterial(e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Total (FD):</span>
                <span className={cn("font-bold", Math.abs((valorServicoNumerico + valorMaterialNumerico) - valorNumerico) > 0.01 ? "text-destructive" : "text-success")}>
                  {(valorServicoNumerico + valorMaterialNumerico).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              {Math.abs((valorServicoNumerico + valorMaterialNumerico) - valorNumerico) > 0.01 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    A soma de Serviço + Material deve ser exatamente igual ao valor total ({formatCurrency(valor)}).
                    Diferença: {formatCurrency(String(Math.round(Math.abs((valorServicoNumerico + valorMaterialNumerico) - valorNumerico) * 100)))}.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Chamado corretiva */}
          <div className="flex items-center space-x-2 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <Checkbox id="chamadoCorretiva" checked={chamadoCorretiva} onCheckedChange={(checked) => setters.setChamadoCorretiva(!!checked)} />
            <Label htmlFor="chamadoCorretiva" className="cursor-pointer text-amber-800 dark:text-amber-200">
              Chamado é uma corretiva?
            </Label>
          </div>

          <GarantiaBlock />
        </>
      )}

      {/* OC Garantia */}
      {isOC && <GarantiaBlock />}

      {/* Escopo Detalhado */}
      <EscopoDetalhadoField instrumentoJuridico={instrumentoJuridico} escopo={escopoDetalhadoMinuta} onEscopoChange={setters.setEscopoDetalhadoMinuta} />

      {/* Due Diligence */}
      <DueDiligenceModule
        valorNumerico={valorNumerico}
        confirmada={dueDiligenceConfirmada}
        numeroProjuris={dueDiligenceNumeroProjuris}
        temProcessoProjuris={temProcessoProjuris}
        onConfirmadaChange={setters.setDueDiligenceConfirmada}
        onNumeroProjurisChange={setters.setDueDiligenceNumeroProjuris}
        onTemProcessoChange={setters.setTemProcessoProjuris}
      />

      {/* Retenção Técnica */}
      <RetencaoTecnicaAlert instrumentoJuridico={instrumentoJuridico} valorNumerico={valorNumerico} dataInicio={dataInicio} dataFim={dataFim} />
    </div>
  );
}
