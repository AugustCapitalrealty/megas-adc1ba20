import {
  Building2,
  FileText,
  DollarSign,
  Tag,
  User,
  Paperclip,
  CheckCircle2,
  Circle,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EMPREENDIMENTO_LABELS, NATUREZA_ORCAMENTARIA_LABELS } from '@/types';
import type { FormState, DerivedValues, Step } from './types';
import { cn } from '@/lib/utils';

interface FormSummarySidebarProps {
  formState: FormState;
  derived: DerivedValues;
  currentStepIndex?: number;
  totalSteps?: number;
  onJumpToStep?: (step: Step) => void;
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  filled,
  onClick,
}: {
  icon: typeof Building2;
  label: string;
  value?: string | null;
  filled: boolean;
  onClick?: () => void;
}) {
  const Wrapper: any = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2.5 text-left text-sm rounded-md -mx-1 px-1 py-0.5 transition-colors',
        onClick && 'hover:bg-accent/40 focus-visible:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      )}
    >
      <div className="mt-0.5 shrink-0">
        {filled ? (
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/40" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3 w-3" aria-hidden="true" />
          <span>{label}</span>
        </div>
        <p
          className={
            filled
              ? 'font-medium text-foreground truncate'
              : 'text-muted-foreground/60 italic text-xs'
          }
          title={filled && value ? value : undefined}
        >
          {filled && value ? value : 'Não preenchido'}
        </p>
      </div>
    </Wrapper>
  );
}

const INSTRUMENTO_LABEL: Record<string, string> = {
  oc: 'Ordem de Compra',
  termo_contratacao: 'Termo de Contratação',
  contrato_prestacao: 'Contrato de Prestação',
  contrato_empreitada: 'Contrato de Empreitada',
};

export function FormSummarySidebar({
  formState,
  derived,
  currentStepIndex,
  totalSteps,
  onJumpToStep,
}: FormSummarySidebarProps) {
  const empreendimentoLabel = formState.empreendimento
    ? EMPREENDIMENTO_LABELS[formState.empreendimento]
    : null;
  const naturezaLabel = formState.naturezaOrcamentaria
    ? NATUREZA_ORCAMENTARIA_LABELS[formState.naturezaOrcamentaria]
    : null;
  const fornecedorLabel = formState.fornecedor
    ? formState.fornecedor.razao_social || formState.fornecedor.nome_fantasia || formState.fornecedor.cnpj
    : null;
  const totalAnexos =
    Object.values(formState.anexos).filter(Boolean).length + formState.outrosAnexos.length;
  const showProgress =
    typeof currentStepIndex === 'number' && typeof totalSteps === 'number' && totalSteps > 0;
  const progressPercent = showProgress
    ? Math.round(((currentStepIndex! + 1) / totalSteps!) * 100)
    : 0;

  return (
    <Card className="sticky top-4 shadow-sm ring-1 ring-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
            Resumo
          </CardTitle>
          {showProgress && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {currentStepIndex! + 1}/{totalSteps}
            </span>
          )}
        </div>
        {showProgress && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {derived.valorNumerico > 0 && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Valor total
            </div>
            <div className="text-2xl font-bold tabular-nums leading-tight">
              {formatBRL(derived.valorNumerico)}
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Fluxo: {derived.isAC ? 'AC' : 'OC'} ·{' '}
              {INSTRUMENTO_LABEL[derived.instrumentoJuridico] ?? derived.instrumentoJuridico}
            </div>
          </div>
        )}

        <SummaryItem
          icon={Building2}
          label="Empreendimento"
          value={empreendimentoLabel}
          filled={!!empreendimentoLabel}
          onClick={onJumpToStep ? () => onJumpToStep('empreendimento') : undefined}
        />
        <SummaryItem
          icon={FileText}
          label="Descrição"
          value={formState.descricao ? `${formState.descricao.slice(0, 60)}${formState.descricao.length > 60 ? '…' : ''}` : null}
          filled={!!formState.descricao}
          onClick={onJumpToStep ? () => onJumpToStep('descricao') : undefined}
        />
        <SummaryItem
          icon={DollarSign}
          label="Valor"
          value={derived.valorNumerico > 0 ? formatBRL(derived.valorNumerico) : null}
          filled={derived.valorNumerico > 0}
          onClick={onJumpToStep ? () => onJumpToStep('descricao') : undefined}
        />
        <SummaryItem
          icon={Tag}
          label="Tipo / Natureza"
          value={[derived.isAC ? 'AC' : 'OC', naturezaLabel].filter(Boolean).join(' · ')}
          filled={!!naturezaLabel}
          onClick={onJumpToStep ? () => onJumpToStep('detalhes') : undefined}
        />
        <SummaryItem
          icon={User}
          label="Fornecedor"
          value={fornecedorLabel}
          filled={!!fornecedorLabel}
          onClick={onJumpToStep ? () => onJumpToStep('fornecedor') : undefined}
        />
        <Separator />
        <SummaryItem
          icon={Paperclip}
          label="Anexos"
          value={totalAnexos > 0 ? `${totalAnexos} arquivo${totalAnexos > 1 ? 's' : ''}` : null}
          filled={totalAnexos > 0}
          onClick={onJumpToStep ? () => onJumpToStep('anexos') : undefined}
        />
      </CardContent>
    </Card>
  );
}