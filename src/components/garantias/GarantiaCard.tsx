import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, ShieldAlert, Shield, ShieldX,
  Building2, Calendar, Wrench, ExternalLink, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EMPREENDIMENTO_LABELS, TIPO_GARANTIA_LABELS } from '@/types';
import type { GarantiaItem, GarantiaDetalhe } from '@/hooks/useGarantiasVigentes';

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (d: Date | string) =>
  format(typeof d === 'string' ? new Date(d) : d, 'dd/MM/yyyy', { locale: ptBR });

// ── Status badge ──────────────────────────────────────────────────────────────
function GarantiaBadge({ detalhe }: { detalhe: GarantiaDetalhe }) {
  if (detalhe.status === 'expirada') {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldX className="h-3 w-3" />
        {detalhe.label}: Expirada
      </Badge>
    );
  }
  if (detalhe.status === 'expirando') {
    return (
      <Badge className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/30">
        <ShieldAlert className="h-3 w-3" />
        {detalhe.label}: {detalhe.diasRestantes}d
      </Badge>
    );
  }
  if (detalhe.status === 'expirando_breve') {
    return (
      <Badge className="gap-1 bg-warning/10 text-warning hover:bg-warning/10 border-warning/30">
        <Shield className="h-3 w-3" />
        {detalhe.label}: {detalhe.diasRestantes}d
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-success border-success/30">
      <ShieldCheck className="h-3 w-3" />
      {detalhe.label}: {detalhe.diasRestantes}d
    </Badge>
  );
});

// ── Progress bar ──────────────────────────────────────────────────────────────
const GarantiaProgressBar = React.memo(function GarantiaProgressBar({ detalhe }: { detalhe: GarantiaDetalhe }) {
  const total = detalhe.diasContratados;
  const restantes = Math.max(0, detalhe.diasRestantes);
  const percentUsado = total > 0 ? Math.min(100, ((total - restantes) / total) * 100) : 100;

  const barColor =
    detalhe.status === 'expirada' ? 'bg-destructive' :
    detalhe.status === 'expirando' ? 'bg-destructive/70' :
    detalhe.status === 'expirando_breve' ? 'bg-warning' :
    'bg-success';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>Expira: {formatDate(detalhe.dataExpiracao)}</span>
        <span>{detalhe.diasContratados}d contratados</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percentUsado}%` }}
        />
      </div>
    </div>
  );
});

// ── Main Card ─────────────────────────────────────────────────────────────────
interface GarantiaCardProps {
  garantia: GarantiaItem;
  infraspeakLoading: string | null;
  onToggleInfraspeak: (id: string, current: boolean) => void;
  onVerOriginal: (protocolo: string) => void;
}

export const GarantiaCard = React.memo(function GarantiaCard({
  garantia: g,
  infraspeakLoading,
  onToggleInfraspeak,
  onVerOriginal,
}: GarantiaCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          {/* Top row: protocol + badges */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-primary">#{g.protocolo}</span>
              <Badge variant="secondary" className="text-xs gap-1">
                <Building2 className="h-3 w-3" />
                {EMPREENDIMENTO_LABELS[g.empreendimento]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {TIPO_GARANTIA_LABELS[g.tipo_garantia]}
              </Badge>
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
              {g.infraspeak_registrada && (
                <Badge className="gap-1 bg-info/10 text-info hover:bg-info/10 border-info/30">
                  <Wrench className="h-3 w-3" />
                  Infraspeak
                </Badge>
              )}
              {g.garantias.map((det, i) => (
                <GarantiaBadge key={i} detalhe={det} />
              ))}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-foreground line-clamp-2">{g.descricao}</p>

          {/* Fornecedor + data + valor */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            {(g.fornecedor_razao_social || g.fornecedor_nome_fantasia) && (
              <span>
                Fornecedor:{' '}
                <strong className="text-foreground">
                  {g.fornecedor_nome_fantasia || g.fornecedor_razao_social}
                </strong>
                {g.fornecedor_cnpj && ` (${g.fornecedor_cnpj})`}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Conclusão: {formatDate(g.data_conclusao)}
            </span>
            <span>Valor: {BRL(g.valor)}</span>
          </div>

          {/* Progress bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.garantias.map((det, i) => (
              <div key={i}>
                <p className="text-xs font-medium mb-1">{det.label} ({det.diasContratados}d)</p>
                <GarantiaProgressBar detalhe={det} />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-2 border-t">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs text-muted-foreground hover:text-primary"
              onClick={() => onVerOriginal(g.protocolo)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver OC Original
            </Button>
            <Button
              size="sm"
              variant={g.infraspeak_registrada ? 'default' : 'outline'}
              className={g.infraspeak_registrada ? 'gap-1.5' : 'gap-1.5 text-muted-foreground'}
              onClick={() => onToggleInfraspeak(g.id, g.infraspeak_registrada)}
              disabled={infraspeakLoading === g.id}
            >
              {infraspeakLoading === g.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wrench className="h-3.5 w-3.5" />
              )}
              {g.infraspeak_registrada ? 'Infraspeak ✓' : 'Marcar Infraspeak'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
