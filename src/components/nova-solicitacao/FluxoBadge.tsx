import {
  Package,
  ClipboardList,
  Zap,
  Shield,
  ShieldCheck,
  Scale,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DerivedValues, FormState } from './types';

interface FluxoBadgeProps {
  formState: FormState;
  derived: DerivedValues;
  compact?: boolean;
  className?: string;
}

const INSTRUMENTO_LABEL: Record<string, string> = {
  oc: 'OC',
  termo_contratacao: 'Termo de Contratação',
  contrato_prestacao: 'Contrato de Prestação',
  contrato_empreitada: 'Contrato de Empreitada',
};

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Banner dinâmico que mostra em tempo real o fluxo detectado (OC ou AC),
 * o instrumento jurídico aplicável e microbadges de regras especiais.
 */
export function FluxoBadge({ formState, derived, compact = false, className }: FluxoBadgeProps) {
  const { valorNumerico, isAC, instrumentoJuridico, requerDueDiligence, requires3CNPJs } = derived;

  if (valorNumerico <= 0) return null;

  const isEmergencial = isAC && formState.emergencial;

  // Decide tonalidade
  const tone = isEmergencial
    ? 'destructive'
    : isAC
      ? 'warning'
      : 'info';

  const toneClasses: Record<string, string> = {
    info: 'border-info/30 bg-info/5 text-info',
    warning: 'border-warning/40 bg-warning/5 text-warning',
    destructive: 'border-destructive/40 bg-destructive/5 text-destructive',
  };

  const Icon = isAC ? ClipboardList : Package;
  const tipoLabel = isAC ? 'AC · Autorização de Compra' : 'OC · Ordem de Compra';
  const subtitle = isAC
    ? `Serviço acima de ${formatBRL(1000)}`
    : valorNumerico <= 1000
      ? `Valor ≤ ${formatBRL(1000)} — fluxo simplificado`
      : 'Materiais/produtos acima de R$ 1.000';

  const microbadges: { icon: typeof Zap; label: string; tone?: string }[] = [];
  if (isEmergencial) microbadges.push({ icon: Zap, label: 'Emergencial', tone: 'destructive' });
  if (isAC && requires3CNPJs && !formState.emergencial)
    microbadges.push({ icon: Users, label: '3 CNPJs obrigatórios' });
  if (isAC && requerDueDiligence)
    microbadges.push({ icon: ShieldCheck, label: 'Due Diligence' });
  if (formState.retencao6) microbadges.push({ icon: Shield, label: 'Retenção 6%' });
  if (isAC && instrumentoJuridico !== 'oc')
    microbadges.push({
      icon: Scale,
      label: INSTRUMENTO_LABEL[instrumentoJuridico] ?? instrumentoJuridico,
    });

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium',
          toneClasses[tone],
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{tipoLabel}</span>
        <span className="text-muted-foreground font-normal">·</span>
        <span className="text-foreground font-semibold tabular-nums">
          {formatBRL(valorNumerico)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 transition-all duration-300 animate-fade-in',
        toneClasses[tone],
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            'bg-background/70 ring-1 ring-current/20',
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-foreground">{tipoLabel}</span>
            <span className="text-xs text-foreground/70 tabular-nums">
              {formatBRL(valorNumerico)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>

          {microbadges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {microbadges.map((b) => (
                <span
                  key={b.label}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border bg-background/70 px-1.5 py-0.5 text-[11px] font-medium',
                    b.tone === 'destructive'
                      ? 'border-destructive/30 text-destructive'
                      : 'border-border text-foreground/80',
                  )}
                >
                  <b.icon className="h-3 w-3" />
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {isEmergencial && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              Mapa de cotação dispensado. Apenas chamado e orçamento escolhido serão exigidos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
