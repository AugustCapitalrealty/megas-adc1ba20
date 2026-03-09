import { Card, CardContent } from '@/components/ui/card';
import { UserCheck, FileCheck, CheckCircle2 } from 'lucide-react';
import { useProductivityMetrics } from '@/hooks/useProductivityMetrics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductivityCard() {
  const { assumed, ocsEmitted, completed, periodStart, periodEnd, isLoading } = useProductivityMetrics();

  const total = assumed + ocsEmitted + completed;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="flex gap-6">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (total === 0) return null;

  const period = `${format(periodStart, "dd/MM", { locale: ptBR })} – ${format(periodEnd, "dd/MM", { locale: ptBR })}`;

  const metrics = [
    { label: 'Assumidas', value: assumed, icon: UserCheck, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Docs Emitidos', value: ocsEmitted, icon: FileCheck, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Finalizadas', value: completed, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Sua semana
          </h3>
          <span className="text-xs text-muted-foreground">{period}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${m.bg}`}>
                  <Icon className={`h-4 w-4 ${m.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
