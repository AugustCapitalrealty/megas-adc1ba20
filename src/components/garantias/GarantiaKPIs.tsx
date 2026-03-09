import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, ShieldAlert, Shield, ShieldX } from 'lucide-react';
import type { StatusFiltro } from '@/hooks/useGarantiasVigentes';

interface KPIs {
  vigentes: number;
  expirando: number;
  expirando_breve: number;
  expiradas: number;
  total: number;
  valorVigentes: number;
  valorExpirando: number;
  valorTotal: number;
  proximaExpiracao: number | null;
}

interface GarantiaKPIsProps {
  kpis: KPIs;
  filtroStatus: StatusFiltro;
  setFiltroStatus: (v: StatusFiltro) => void;
}

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

interface KpiCardProps {
  status: StatusFiltro;
  icon: React.ElementType;
  title: string;
  count: number;
  sub: string;
  active: boolean;
  onClick: () => void;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const KpiCard = React.memo(function KpiCard({
  icon: Icon,
  title,
  count,
  sub,
  active,
  onClick,
  colorClass,
  bgClass,
  borderClass,
}: KpiCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${borderClass} ${bgClass} ${
        active ? 'ring-2 ring-offset-1 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClass} bg-background/60 dark:bg-background/20 shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className={`text-2xl font-bold leading-tight ${colorClass}`}>{count}</p>
          <p className="text-xs text-muted-foreground truncate">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
});

export const GarantiaKPIs = React.memo(function GarantiaKPIs({
  kpis,
  filtroStatus,
  setFiltroStatus,
}: GarantiaKPIsProps) {
  const toggle = (s: StatusFiltro) => setFiltroStatus(filtroStatus === s ? 'todos' : s);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard
        status="vigente"
        icon={ShieldCheck}
        title="Vigentes"
        count={kpis.vigentes}
        sub={BRL(kpis.valorVigentes)}
        active={filtroStatus === 'vigente'}
        onClick={() => toggle('vigente')}
        colorClass="text-success"
        bgClass="bg-success/5 dark:bg-success/10"
        borderClass="border-success/30"
      />
      <KpiCard
        status="expirando"
        icon={ShieldAlert}
        title="Expirando <30d"
        count={kpis.expirando}
        sub={kpis.proximaExpiracao !== null ? `próxima: ${kpis.proximaExpiracao}d` : '—'}
        active={filtroStatus === 'expirando'}
        onClick={() => toggle('expirando')}
        colorClass="text-destructive"
        bgClass="bg-destructive/5 dark:bg-destructive/10"
        borderClass="border-destructive/30"
      />
      <KpiCard
        status="expirando_breve"
        icon={Shield}
        title="Expirando 30–60d"
        count={kpis.expirando_breve}
        sub={BRL(kpis.valorExpirando)}
        active={filtroStatus === 'expirando_breve'}
        onClick={() => toggle('expirando_breve')}
        colorClass="text-warning"
        bgClass="bg-warning/5 dark:bg-warning/10"
        borderClass="border-warning/30"
      />
      <KpiCard
        status="expirada"
        icon={ShieldX}
        title="Expiradas"
        count={kpis.expiradas}
        sub={`de ${kpis.total} total`}
        active={filtroStatus === 'expirada'}
        onClick={() => toggle('expirada')}
        colorClass="text-muted-foreground"
        bgClass="bg-muted/30"
        borderClass="border-muted"
      />
    </div>
  );
});
