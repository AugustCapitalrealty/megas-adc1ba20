import { ChevronDown, FileText, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CNAECompatibilityBadge } from '@/components/CNAECompatibilityBadge';
import { MEIAlertBadge } from '@/components/MEIAlertBadge';
import {
  EMPREENDIMENTO_LABELS,
  NATUREZA_ORCAMENTARIA_LABELS,
  ORIGEM_CUSTO_LABELS,
  TIPO_CONTRATACAO_LABELS,
  TIPO_GARANTIA_LABELS,
} from '@/types';
import type { StepProps } from '../types';

interface RevisaoStepProps extends StepProps {
  formatCurrency: (v: string) => string;
}

export function RevisaoStep({ formState, derived, formatCurrency }: RevisaoStepProps) {
  const {
    descricao, empreendimento, valor, naturezaOrcamentaria, origemCusto,
    tipoContratacao, dataInicio, dataFim, parcelas, contratoMensal,
    faturamentoDireto, retencao6, custoCliente, tipoGarantia, diasGarantia,
    diasGarantiaServico, diasGarantiaProduto, fornecedor,
    fornecedorConcorrente1, fornecedorConcorrente2,
    justificativaFornecedores, emergencial, clienteNome, anexos,
  } = formState;
  const { isAC, valorNumerico, valorServicoNumerico, valorMaterialNumerico, requires3CNPJs } = derived;

  return (
    <div className="space-y-4">
      <Collapsible defaultOpen className="rounded-lg border p-3 bg-muted/30">
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <span className="font-medium text-sm">Descrição do Serviço/Material</span>
          <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <p className="text-sm whitespace-pre-wrap">{descricao}</p>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Tipo</span>
          <span className="font-medium">
            {isAC ? 'AC - Autorização de Contratação' : 'OC - Ordem de Compra'}
            {emergencial && <span className="ml-2 text-warning">(Emergencial)</span>}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Empreendimento</span>
          <span>{empreendimento && EMPREENDIMENTO_LABELS[empreendimento as keyof typeof EMPREENDIMENTO_LABELS]}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Valor Total</span>
          <span className="font-medium">
            {faturamentoDireto
              ? (valorServicoNumerico + valorMaterialNumerico).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : formatCurrency(valor)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Natureza Orçamentária</span>
          <span>{naturezaOrcamentaria && NATUREZA_ORCAMENTARIA_LABELS[naturezaOrcamentaria as keyof typeof NATUREZA_ORCAMENTARIA_LABELS]}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Origem do Custo</span>
          <span>{ORIGEM_CUSTO_LABELS[origemCusto]}</span>
        </div>
        {origemCusto === 'cliente' && clienteNome && (
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Cliente</span>
            <span className="font-medium">{clienteNome}</span>
          </div>
        )}
        {tipoContratacao && (
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Tipo de Contratação</span>
            <span>{TIPO_CONTRATACAO_LABELS[tipoContratacao as keyof typeof TIPO_CONTRATACAO_LABELS]}</span>
          </div>
        )}

        {isAC && (
          <>
            {dataInicio && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Data de Início</span>
                <span>{new Date(dataInicio).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
              </div>
            )}
            {dataFim && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Data de Término</span>
                <span>{new Date(dataFim).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Parcelas</span>
              <span>{parcelas}x</span>
            </div>
            {contratoMensal && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Contrato Mensal</span>
                <span className="text-success">Sim</span>
              </div>
            )}
          </>
        )}

        {faturamentoDireto && (
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Faturamento Direto</span>
            <span className="text-success font-medium">Sim</span>
          </div>
        )}
        {retencao6 && (
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Retenção 6%</span>
            <span className="text-success">Sim</span>
          </div>
        )}
        {custoCliente && (
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Custo do Cliente</span>
            <span className="text-success">Sim</span>
          </div>
        )}

        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Garantia</span>
          <span>
            {TIPO_GARANTIA_LABELS[tipoGarantia]}
            {tipoGarantia !== 'nenhuma' && tipoGarantia !== 'ambos' && diasGarantia && (
              <span className="ml-1">({diasGarantia} dias)</span>
            )}
            {tipoGarantia === 'ambos' && (
              <span className="ml-1">(Serviço: {diasGarantiaServico || '—'} dias, Produto: {diasGarantiaProduto || '—'} dias)</span>
            )}
          </span>
        </div>

        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Fornecedor</span>
          <span>{fornecedor?.razao_social || fornecedor?.cnpj}</span>
        </div>

        {fornecedor && fornecedor.cnae_principal_codigo && descricao.length >= 20 && (
          <div className="py-3 border-t">
            <span className="text-muted-foreground text-sm block mb-2">Validação CNAE</span>
            <CNAECompatibilityBadge descricao={descricao} fornecedor={fornecedor} enabled={true} />
          </div>
        )}

        {fornecedor?.is_mei && (
          <div className="py-3 border-t">
            <MEIAlertBadge showInlineAlert valorTotal={valorNumerico} />
          </div>
        )}

        {requires3CNPJs && (
          <>
            {fornecedorConcorrente1 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Concorrente 1</span>
                <span>{fornecedorConcorrente1.razao_social || fornecedorConcorrente1.cnpj}</span>
              </div>
            )}
            {fornecedorConcorrente2 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Concorrente 2</span>
                <span>{fornecedorConcorrente2.razao_social || fornecedorConcorrente2.cnpj}</span>
              </div>
            )}
            {justificativaFornecedores.trim() && (
              <div className="py-2 border-b">
                <span className="text-muted-foreground text-sm flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-warning" />
                  Justificativa (exceção 3 fornecedores)
                </span>
                <p className="text-sm mt-1">{justificativaFornecedores}</p>
              </div>
            )}
          </>
        )}

        <div className="pt-2">
          <span className="text-muted-foreground text-sm">Anexos ({Object.values(anexos).filter(Boolean).length})</span>
          <div className="mt-2 space-y-1">
            {Object.entries(anexos)
              .filter(([_, file]) => file !== null)
              .map(([tipo, file]) => (
                <div key={tipo} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{file?.file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {((file?.file.size || 0) / 1024).toFixed(0)} KB
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
