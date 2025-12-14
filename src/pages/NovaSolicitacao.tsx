import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCNPJ } from '@/hooks/useCNPJ';
import { supabase } from '@/integrations/supabase/client';
import { 
  EMPREENDIMENTO_LABELS, 
  NATUREZA_ORCAMENTARIA_LABELS,
  TIPO_CONTRATACAO_LABELS,
  ORIGEM_CUSTO_LABELS,
  TIPO_GARANTIA_LABELS,
  type Empreendimento,
  type NaturezaOrcamentaria,
  type TipoContratacao,
  type OrigemCusto,
  type TipoGarantia,
  type Fornecedor,
} from '@/types';
import { ArrowLeft, ArrowRight, Check, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'empreendimento' | 'descricao' | 'tipo' | 'detalhes' | 'fornecedor' | 'anexos' | 'revisao';

export default function NovaSolicitacao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formatCNPJ, lookupCNPJ, loading: cnpjLoading, error: cnpjError } = useCNPJ();

  const [currentStep, setCurrentStep] = useState<Step>('empreendimento');
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [empreendimento, setEmpreendimento] = useState<Empreendimento | ''>('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipoContratacao, setTipoContratacao] = useState<TipoContratacao | ''>('');
  const [naturezaOrcamentaria, setNaturezaOrcamentaria] = useState<NaturezaOrcamentaria | ''>('');
  const [origemCusto, setOrigemCusto] = useState<OrigemCusto>('empreendimento');
  
  // AC specific
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [contratoMensal, setContratoMensal] = useState(false);
  const [faturamentoDireto, setFaturamentoDireto] = useState(false);
  const [retencao6, setRetencao6] = useState(false);
  const [tipoGarantia, setTipoGarantia] = useState<TipoGarantia>('nenhuma');
  const [diasGarantia, setDiasGarantia] = useState('');
  const [custoCliente, setCustoCliente] = useState(false);
  const [emergencial, setEmergencial] = useState(false);

  // Fornecedor
  const [cnpj, setCnpj] = useState('');
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);

  const valorNumerico = parseFloat(valor.replace(/\D/g, '')) / 100 || 0;
  const isOC = valorNumerico <= 1000 || (valorNumerico > 1000 && tipoContratacao !== 'servicos');
  const isAC = valorNumerico > 1000 && tipoContratacao === 'servicos';

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleCNPJSearch = async () => {
    const result = await lookupCNPJ(cnpj);
    if (result) {
      setFornecedor(result);
      toast({ title: 'Fornecedor encontrado', description: result.razao_social || result.cnpj });
    }
  };

  const handleSubmit = async () => {
    if (!user || !empreendimento || !naturezaOrcamentaria || !fornecedor) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('solicitacoes')
        .insert({
          user_id: user.id,
          empreendimento,
          descricao,
          valor: valorNumerico,
          tipo: isAC ? 'AC' : 'OC',
          natureza_orcamentaria: naturezaOrcamentaria,
          origem_custo: origemCusto,
          fornecedor_id: fornecedor.id,
          tipo_contratacao: tipoContratacao || null,
          data_inicio: dataInicio || null,
          data_fim: dataFim || null,
          parcelas: parseInt(parcelas) || 1,
          contrato_mensal: contratoMensal,
          faturamento_direto: faturamentoDireto,
          retencao_6_porcento: retencao6,
          tipo_garantia: tipoGarantia,
          dias_garantia: diasGarantia ? parseInt(diasGarantia) : null,
          custo_cliente: custoCliente,
          emergencial,
        })
        .select('protocolo')
        .single();

      if (error) throw error;

      toast({
        title: 'Solicitação criada!',
        description: `Protocolo: ${data.protocolo}`,
      });
      navigate('/minhas-solicitacoes');
    } catch (error) {
      console.error('Error creating solicitacao:', error);
      toast({
        title: 'Erro ao criar solicitação',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const steps: { id: Step; label: string; show: boolean }[] = [
    { id: 'empreendimento', label: 'Empreendimento', show: true },
    { id: 'descricao', label: 'Descrição e Valor', show: true },
    { id: 'tipo', label: 'Tipo', show: valorNumerico > 1000 },
    { id: 'detalhes', label: 'Detalhes', show: true },
    { id: 'fornecedor', label: 'Fornecedor', show: true },
    { id: 'revisao', label: 'Revisão', show: true },
  ];

  const visibleSteps = steps.filter((s) => s.show);
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'empreendimento': return !!empreendimento;
      case 'descricao': return !!descricao && valorNumerico > 0;
      case 'tipo': return valorNumerico <= 1000 || !!tipoContratacao;
      case 'detalhes': return !!naturezaOrcamentaria;
      case 'fornecedor': return !!fornecedor;
      default: return true;
    }
  };

  const goNext = () => {
    if (currentIndex < visibleSteps.length - 1) {
      setCurrentStep(visibleSteps[currentIndex + 1].id);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(visibleSteps[currentIndex - 1].id);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Nova Solicitação</h1>
          <p className="text-muted-foreground">Preencha os dados para criar uma solicitação</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          {visibleSteps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                'step-indicator',
                i < currentIndex && 'step-indicator-completed',
                i === currentIndex && 'step-indicator-active',
                i > currentIndex && 'step-indicator-pending'
              )}>
                {i < currentIndex ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < visibleSteps.length - 1 && (
                <div className={cn(
                  'h-0.5 w-8 sm:w-16 mx-2',
                  i < currentIndex ? 'bg-success' : 'bg-muted'
                )} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{visibleSteps[currentIndex]?.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 'empreendimento' && (
              <RadioGroup value={empreendimento} onValueChange={(v) => setEmpreendimento(v as Empreendimento)}>
                {Object.entries(EMPREENDIMENTO_LABELS).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                    <RadioGroupItem value={value} id={value} />
                    <Label htmlFor={value} className="flex-1 cursor-pointer">{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentStep === 'descricao' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="descricao">Descrição do serviço ou material</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Descreva detalhadamente..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input
                    id="valor"
                    placeholder="R$ 0,00"
                    value={valor ? formatCurrency(valor) : ''}
                    onChange={(e) => setValor(e.target.value.replace(/\D/g, ''))}
                  />
                  {valorNumerico > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {valorNumerico <= 1000 ? 'Fluxo: OC (até R$ 1.000)' : 'Fluxo: Definir tipo de contratação'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 'tipo' && valorNumerico > 1000 && (
              <RadioGroup value={tipoContratacao} onValueChange={(v) => setTipoContratacao(v as TipoContratacao)}>
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
            )}

            {currentStep === 'detalhes' && (
              <div className="space-y-4">
                <div>
                  <Label>Natureza Orçamentária</Label>
                  <Select value={naturezaOrcamentaria} onValueChange={(v) => setNaturezaOrcamentaria(v as NaturezaOrcamentaria)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(NATUREZA_ORCAMENTARIA_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Origem do Custo</Label>
                  <Select value={origemCusto} onValueChange={(v) => setOrigemCusto(v as OrigemCusto)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORIGEM_CUSTO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isAC && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data Início</Label>
                        <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                      </div>
                      <div>
                        <Label>Data Fim</Label>
                        <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label>Parcelas</Label>
                      <Select value={parcelas} onValueChange={setParcelas}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[...Array(12)].map((_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep === 'fornecedor' && (
              <div className="space-y-4">
                <div>
                  <Label>CNPJ do Fornecedor</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="00.000.000/0000-00"
                      value={formatCNPJ(cnpj)}
                      onChange={(e) => setCnpj(e.target.value)}
                    />
                    <Button onClick={handleCNPJSearch} disabled={cnpjLoading}>
                      {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  {cnpjError && <p className="text-sm text-destructive mt-1">{cnpjError}</p>}
                </div>
                {fornecedor && (
                  <Card className="bg-accent/50">
                    <CardContent className="pt-4">
                      <p className="font-medium">{fornecedor.razao_social}</p>
                      {fornecedor.nome_fantasia && <p className="text-sm text-muted-foreground">{fornecedor.nome_fantasia}</p>}
                      <p className="text-sm text-muted-foreground mt-1">{fornecedor.cidade}/{fornecedor.uf}</p>
                      {fornecedor.is_mei && <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded mt-2 inline-block">MEI</span>}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {currentStep === 'revisao' && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium">{isAC ? 'AC - Autorização de Contratação' : 'OC - Ordem de Compra'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Empreendimento</span>
                  <span>{empreendimento && EMPREENDIMENTO_LABELS[empreendimento]}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Valor</span>
                  <span>{formatCurrency(valor)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Fornecedor</span>
                  <span>{fornecedor?.razao_social}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={goBack} disabled={currentIndex === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          {currentStep === 'revisao' ? (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Enviar Solicitação
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canProceed()}>
              Próximo <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}