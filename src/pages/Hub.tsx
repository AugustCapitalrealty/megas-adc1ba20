import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { AppCard } from '@/components/hub/AppCard';
import { getHubApps, HUB_APPS_EM_BREVE } from '@/lib/hub-apps';
import { Card } from '@/components/ui/card';
import { ArrowRight, Plus, FileText, LayoutDashboard } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function saudacao(date: Date) {
  const h = date.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Hub() {
  useDocumentTitle('Hub dos Megas');
  const { effectiveProfile, isBackofficeOrAdmin, isAdmin } = useAuth();
  const metrics = useDashboardMetrics(isBackofficeOrAdmin ? 'geral' : 'minhas');

  const agora = new Date();
  const primeiroNome = (effectiveProfile?.full_name || '').split(' ')[0];
  const apps = getHubApps({ isBackofficeOrAdmin, isAdmin });

  const papel = isAdmin ? 'Administrador' : isBackofficeOrAdmin ? 'Backoffice' : 'Solicitante';

  const pendencias = isBackofficeOrAdmin ? metrics.newInQueue : metrics.pendingActions;

  const atalhos = isBackofficeOrAdmin
    ? [
        { label: 'Fila do Backoffice', hint: `${metrics.newInQueue} novas`, href: '/backoffice', icon: LayoutDashboard },
        { label: 'Aguardando solicitante', hint: `${metrics.waitingSolicitor} itens`, href: '/backoffice', icon: FileText },
        { label: 'Nova solicitação', hint: 'Criar agora', href: '/nova-solicitacao', icon: Plus },
      ]
    : [
        { label: 'Nova solicitação', hint: 'Criar agora', href: '/nova-solicitacao', icon: Plus },
        { label: 'Minhas pendências', hint: `${metrics.pendingActions} aguardando você`, href: '/minhas-solicitacoes', icon: FileText },
        { label: 'Minhas solicitações', hint: `${metrics.total} no total`, href: '/solicitacoes', icon: LayoutDashboard },
      ];

  return (
    <div className="space-y-8">
      {/* Saudação */}
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Hub dos Megas · {papel}
        </p>
        <h1 className="ds-text-h1">
          {saudacao(agora)}{primeiroNome ? `, ${primeiroNome}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {format(agora, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </header>

      {/* Continuidade */}
      <section aria-label="Atalhos" className="grid gap-3 sm:grid-cols-3">
        {atalhos.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.label + a.href} to={a.href}>
              <Card className="p-4 h-full flex items-center gap-3 transition-colors hover:border-primary/40 hover:bg-accent/40">
                <div className="shrink-0 h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.hint}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
              </Card>
            </Link>
          );
        })}
      </section>

      {/* Apps */}
      <section aria-label="Aplicativos" className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Seus aplicativos
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {apps.map((app) => (
            <AppCard
              key={app.key}
              app={app}
              badge={
                app.key === 'solicitacoes' && !metrics.isLoading && pendencias > 0
                  ? `${pendencias} ${isBackofficeOrAdmin ? 'na fila' : 'pendentes'}`
                  : null
              }
              badgeTone={app.key === 'solicitacoes' ? 'warning' : 'default'}
              className={app.span === 'full' ? 'lg:col-span-2' : undefined}
            />
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section aria-label="Em breve" className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Em breve no Hub
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HUB_APPS_EM_BREVE.map((app) => (
            <AppCard key={app.key} app={app} />
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Dica: pressione{' '}
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘K</kbd>{' '}
        para buscar protocolos e navegar entre os apps.
      </p>
    </div>
  );
}