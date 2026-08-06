import { useEffect, useMemo, useState } from 'react';
import { format, parseISO, differenceInCalendarMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { AlertTriangle, Calendar as CalendarIcon, Wand2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClienteSelect } from '@/components/ClienteSelect';
import { EscopoDetalhadoField } from '@/components/EscopoDetalhadoField';
import { DueDiligenceModule } from '@/components/DueDiligenceModule';
import { SignatariosBlock } from '../SignatariosBlock';
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

          {contratoMensal && valorNumerico > 0 && (
            <ValorMensalHelper
              valorTotal={valorNumerico}
              dataInicio={dataInicio}
              dataFim={dataFim}
              formatCurrency={formatCurrency}
            />
          )}

          <ParcelasField
            parcelas={parcelas}
            setParcelas={setters.setParcelas}
            valorTotal={valorNumerico}
          />

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

          <GarantiaBlock
            tipoGarantia={tipoGarantia}
            diasGarantia={diasGarantia}
            diasGarantiaServico={diasGarantiaServico}
            diasGarantiaProduto={diasGarantiaProduto}
            setTipoGarantia={setters.setTipoGarantia}
            setDiasGarantia={setters.setDiasGarantia}
            setDiasGarantiaServico={setters.setDiasGarantiaServico}
            setDiasGarantiaProduto={setters.setDiasGarantiaProduto}
          />
        </>
      )}

      {/* OC Garantia */}
      {isOC && (
        <GarantiaBlock
          tipoGarantia={tipoGarantia}
          diasGarantia={diasGarantia}
          diasGarantiaServico={diasGarantiaServico}
          diasGarantiaProduto={diasGarantiaProduto}
          setTipoGarantia={setters.setTipoGarantia}
          setDiasGarantia={setters.setDiasGarantia}
          setDiasGarantiaServico={setters.setDiasGarantiaServico}
          setDiasGarantiaProduto={setters.setDiasGarantiaProduto}
        />
      )}

      {/* Escopo Detalhado */}
      <EscopoDetalhadoField instrumentoJuridico={instrumentoJuridico} escopo={escopoDetalhadoMinuta} onEscopoChange={setters.setEscopoDetalhadoMinuta} />

      {/* Signatários — Webdox (somente quando não é OC) */}
      {instrumentoJuridico !== 'oc' && (
        <SignatariosBlock
          representante={{
            nome: formState.representanteLegalNome,
            cpf: formState.representanteLegalCpf,
            email: formState.representanteLegalEmail,
            telefone: formState.representanteLegalTelefone,
          }}
          testemunha={{
            nome: formState.testemunhaNome,
            cpf: formState.testemunhaCpf,
            email: formState.testemunhaEmail,
            telefone: formState.testemunhaTelefone,
          }}
          onRepresentanteChange={(campo, valor) => {
            if (campo === 'nome') setters.setRepresentanteLegalNome(valor);
            else if (campo === 'cpf') setters.setRepresentanteLegalCpf(valor);
            else if (campo === 'email') setters.setRepresentanteLegalEmail(valor);
            else setters.setRepresentanteLegalTelefone(valor);
          }}
          onTestemunhaChange={(campo, valor) => {
            if (campo === 'nome') setters.setTestemunhaNome(valor);
            else if (campo === 'cpf') setters.setTestemunhaCpf(valor);
            else if (campo === 'email') setters.setTestemunhaEmail(valor);
            else setters.setTestemunhaTelefone(valor);
          }}
          errors={errors}
        />
      )}

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

interface GarantiaBlockProps {
  tipoGarantia: TipoGarantia;
  diasGarantia: string;
  diasGarantiaServico: string;
  diasGarantiaProduto: string;
  setTipoGarantia: (v: TipoGarantia) => void;
  setDiasGarantia: (v: string) => void;
  setDiasGarantiaServico: (v: string) => void;
  setDiasGarantiaProduto: (v: string) => void;
}

function GarantiaBlock({
  tipoGarantia, diasGarantia, diasGarantiaServico, diasGarantiaProduto,
  setTipoGarantia, setDiasGarantia, setDiasGarantiaServico, setDiasGarantiaProduto,
}: GarantiaBlockProps) {
  return (
    <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 space-y-3">
      <Label className="text-amber-800 dark:text-amber-200">Tipo de Garantia</Label>
      <Select value={tipoGarantia} onValueChange={(v) => setTipoGarantia(v as TipoGarantia)}>
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
          <Input type="number" value={diasGarantia} onChange={(e) => setDiasGarantia(e.target.value)} placeholder="Ex: 90" className="bg-background" />
        </div>
      )}
      {tipoGarantia === 'ambos' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia (Serviço)</Label>
            <Input type="number" value={diasGarantiaServico} onChange={(e) => setDiasGarantiaServico(e.target.value)} placeholder="Ex: 90" className="bg-background" />
          </div>
          <div>
            <Label className="text-amber-800 dark:text-amber-200">Dias de Garantia (Produto)</Label>
            <Input type="number" value={diasGarantiaProduto} onChange={(e) => setDiasGarantiaProduto(e.target.value)} placeholder="Ex: 365" className="bg-background" />
          </div>
        </div>
      )}
    </div>
  );
}

interface ValorMensalHelperProps {
  valorTotal: number;
  dataInicio: string;
  dataFim: string;
  formatCurrency: (v: string) => string;
}

function ValorMensalHelper({ valorTotal, dataInicio, dataFim, formatCurrency }: ValorMensalHelperProps) {
  const periodoMeses = useMemo(() => {
    if (!dataInicio || !dataFim) return null;
    try {
      const di = parseISO(dataInicio);
      const df = parseISO(dataFim);
      return Math.max(1, differenceInCalendarMonths(df, di) + 1);
    } catch {
      return null;
    }
  }, [dataInicio, dataFim]);

  const mesesBase = periodoMeses ?? 12;
  const sugeridoCentavos = Math.round((valorTotal * 100) / mesesBase);

  // valor mensal em string de centavos (igual ao padrão de moeda do form)
  const [valorMensalStr, setValorMensalStr] = useState<string>(String(sugeridoCentavos));
  const [tocado, setTocado] = useState(false);

  // Re-sincroniza com sugerido enquanto o usuário não tocar
  useEffect(() => {
    if (!tocado) setValorMensalStr(String(sugeridoCentavos));
  }, [sugeridoCentavos, tocado]);

  const valorMensalNumerico = (parseInt(valorMensalStr || '0', 10) || 0) / 100;
  const mesesInferidos = valorMensalNumerico > 0 ? valorTotal / valorMensalNumerico : 0;
  const mesesInferidosFmt = mesesInferidos.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  const divergente = periodoMeses !== null && Math.abs(mesesInferidos - periodoMeses) >= 0.5;

  const aplicarSugestao = () => {
    setTocado(false);
    setValorMensalStr(String(sugeridoCentavos));
  };

  return (
    <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-blue-900 dark:text-blue-200">Valor mensal do contrato</Label>
        <span className="text-[11px] text-muted-foreground">
          Sugerido: <strong>{(sugeridoCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          className="bg-background"
          placeholder="R$ 0,00"
          value={valorMensalStr ? formatCurrency(valorMensalStr) : ''}
          onChange={(e) => {
            setTocado(true);
            setValorMensalStr(e.target.value.replace(/\D/g, ''));
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={aplicarSugestao}
          className="shrink-0 gap-1"
          title="Aplicar valor sugerido"
        >
          <Wand2 className="h-3.5 w-3.5" /> Sugerido
        </Button>
      </div>
      <p className="text-xs text-blue-900/80 dark:text-blue-200/80">
        Equivale a ≈ <strong>{mesesInferidosFmt}</strong> {mesesInferidos === 1 ? 'mês' : 'meses'} ·
        Total <strong>{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        {periodoMeses === null && (
          <span className="block text-muted-foreground mt-0.5">
            Sem datas definidas — usando estimativa de 12 meses. Defina Início e Fim para refinar.
          </span>
        )}
      </p>
      {divergente && periodoMeses !== null && (
        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          <AlertDescription className="text-amber-900 dark:text-amber-200 text-xs">
            Esse valor mensal corresponde a ≈ {mesesInferidosFmt} {mesesInferidos === 1 ? 'mês' : 'meses'},
            mas o período definido tem {periodoMeses} {periodoMeses === 1 ? 'mês' : 'meses'}.
            Ajuste as datas, o valor total ou o valor mensal.
          </AlertDescription>
        </Alert>
      )}
      <p className="text-[10px] text-muted-foreground italic">
        Auxiliar — o valor salvo na solicitação continua sendo o total ({valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).
      </p>
    </div>
  );
}

interface ParcelasFieldProps {
  parcelas: string;
  setParcelas: (v: string) => void;
  valorTotal: number;
}

const PARCELAS_PRESETS = [1, 3, 6, 12, 24, 36];

function ParcelasField({ parcelas, setParcelas, valorTotal }: ParcelasFieldProps) {
  const n = Math.max(1, parseInt(parcelas || '1', 10) || 1);
  const valorParcela = valorTotal > 0 ? valorTotal / n : 0;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const set = (v: number) => setParcelas(String(Math.max(1, Math.floor(v))));

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="parcelas-input">Parcelas</Label>
        <span className="text-[11px] text-muted-foreground">Sem limite</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Diminuir parcelas"
          onClick={() => set(n - 1)}
          disabled={n <= 1}
          className="shrink-0"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="relative flex-1">
          <Input
            id="parcelas-input"
            type="number"
            min={1}
            inputMode="numeric"
            value={parcelas}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
              setParcelas(cleaned);
            }}
            onBlur={() => { if (!parcelas || parseInt(parcelas, 10) < 1) setParcelas('1'); }}
            className="bg-background text-center pr-8 font-medium"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">x</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Aumentar parcelas"
          onClick={() => set(n + 1)}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PARCELAS_PRESETS.map((p) => (
          <Button
            key={p}
            type="button"
            variant={n === p ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => set(p)}
          >
            {p}x
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {n === 1 ? (
          <>À vista{valorTotal > 0 && <> · <strong className="text-foreground">{fmt(valorTotal)}</strong></>}</>
        ) : valorTotal > 0 ? (
          <><strong className="text-foreground">{n}x</strong> de <strong className="text-foreground">{fmt(valorParcela)}</strong> · Total {fmt(valorTotal)}</>
        ) : (
          <>Informe o valor total para ver o valor de cada parcela.</>
        )}
      </p>

      {n > 60 && (
        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          <AlertDescription className="text-amber-900 dark:text-amber-200 text-xs">
            Confirme se realmente são {n} parcelas — valor acima do usual.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
