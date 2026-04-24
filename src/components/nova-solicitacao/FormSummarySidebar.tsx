import { Building2, FileText, DollarSign, Tag, User, Paperclip, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EMPREENDIMENTO_LABELS, NATUREZA_ORCAMENTARIA_LABELS } from '@/types';
import type { FormState, DerivedValues } from './types';

interface FormSummarySidebarProps {
  formState: FormState;
  derived: DerivedValues;
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  filled,
}: {
  icon: typeof Building2;
  label: string;
  value?: string | null;
  filled: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
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
    </div>
  );
}

export function FormSummarySidebar({ formState, derived }: FormSummarySidebarProps) {
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

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
          Resumo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SummaryItem
          icon={Building2}
          label="Empreendimento"
          value={empreendimentoLabel}
          filled={!!empreendimentoLabel}
        />
        <SummaryItem
          icon={FileText}
          label="Descrição"
          value={formState.descricao ? `${formState.descricao.slice(0, 60)}${formState.descricao.length > 60 ? '…' : ''}` : null}
          filled={!!formState.descricao}
        />
        <SummaryItem
          icon={DollarSign}
          label="Valor"
          value={derived.valorNumerico > 0 ? formatBRL(derived.valorNumerico) : null}
          filled={derived.valorNumerico > 0}
        />
        <SummaryItem
          icon={Tag}
          label="Tipo / Natureza"
          value={[derived.isAC ? 'AC' : 'OC', naturezaLabel].filter(Boolean).join(' · ')}
          filled={!!naturezaLabel}
        />
        <SummaryItem
          icon={User}
          label="Fornecedor"
          value={fornecedorLabel}
          filled={!!fornecedorLabel}
        />
        <Separator />
        <SummaryItem
          icon={Paperclip}
          label="Anexos"
          value={totalAnexos > 0 ? `${totalAnexos} arquivo${totalAnexos > 1 ? 's' : ''}` : null}
          filled={totalAnexos > 0}
        />
      </CardContent>
    </Card>
  );
}