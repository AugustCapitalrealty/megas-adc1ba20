import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  CheckCircle,
  Undo2,
  ArrowRight,
  LayoutDashboard,
  ClipboardList,
  FileCheck,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function saudacao(date: Date) {
  const h = date.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

interface EntryCard {
  label: string;
  description: string;
  count: number;
  href: string;
  icon: LucideIcon;
  tone: 'default' | 'success' | 'destructive';
}

const TONE: Record<EntryCard['tone'], string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
};

export default function FinanceiroHome() {
  useDocumentTitle('Financeiro');
  const { effectiveProfile, isBackofficeOrAdmin, isSolicitante } = useAuth();
  const metrics = useDashboardMetrics(isBackofficeOrAdmin ? 'geral' : 'minhas');

  const agora = new Date();
  const primeiroNome = (effectiveProfile?.full_name || '').split(' ')[0];

  const cards: EntryCard[] = [
    {
      label: 'Minhas Solicitações',
      description: 'Todas as solicitações que você acompanha',
      count: metrics.total,
      href: '/minhas-solicitacoes',
      icon: FileText,
      tone: 'default',
    },
    {
      label: 'Aprovações pendentes',
      description: 'OCs aguardando sua liberação',
      count: metrics.pendingAcceptance,
      href: '/minhas-solicitacoes?filter=oc_emitida',
      icon: CheckCircle,
      tone: 'success',
    },
    {
      label: 'Devoluções',
      description: 'Solicitações devolvidas para correção',
      count: metrics.pendingCorrections,
      href: '/minhas-solicitacoes?filter=correcoes',
      icon: Undo2,
      tone: 'destructive',
    },
  ];

  const atalhos = [
    { label: 'Dashboard', href: '/solicitacoes', icon: LayoutDashboard, show: true },
    { label: 'Backoffice', href: '/backoffice', icon: ClipboardList, show: isBackofficeOrAdmin },
    { label: 'OC × NF', href: '/monitoramento-oc', icon: FileCheck, show: true },
    { label: 'Calendário', href: '/calendario', icon: CalendarDays, show: true },
  ].filter((a) => a.show);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Financeiro {isSolicitante ? '· Solicitante' : ''}
        </p>
        <h1 className="ds-text-h1">
          {saudacao(agora)}{primeiroNome ? `, ${primeiroNome}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {format(agora, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </header>

      <section aria-label="Atalhos principais" className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.href} className="group">
              <Card className="h-full p-5 flex flex-col gap-3 transition-colors hover:border-primary/40 hover:bg-accent/40">
                <div className="flex items-start justify-between gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${TONE[c.tone]}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
                </div>
                <div className="space-y-1">
                  {metrics.isLoading ? (
                    <Skeleton className="h-8 w-14" />
                  ) : (
                    <p className="text-3xl font-bold leading-none text-foreground">{c.count}</p>
                  )}
                  <p className="text-sm font-medium text-foreground">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </section>

      <section aria-label="Outras áreas do Financeiro" className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Outras áreas
        </h2>
        <div className="flex flex-wrap gap-2">
          {atalhos.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                to={a.href}
                className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 hover:bg-accent/40"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {a.label}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
