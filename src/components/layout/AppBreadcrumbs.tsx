import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { resolveAppNav } from '@/lib/hub-nav';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Hub',
  '/solicitacoes': 'Início',
  '/nova-solicitacao': 'Nova Solicitação',
  '/minhas-solicitacoes': 'Minhas Solicitações',
  '/backoffice': 'Backoffice',
  '/painel-fluig': 'Painel',
  '/garantias': 'Garantias',
  '/calendario': 'Calendário',
  '/monitoramento-oc': 'Monitoramento',
  '/admin/usuarios': 'Usuários',
  '/admin/sla': 'Dashboard SLA',
  '/admin/eficiencia': 'Eficiência',
  '/admin/rateio-energia': 'Rateio de Energia',
  '/contratos': 'Contratos',
};

export function AppBreadcrumbs() {
  const { pathname } = useLocation();

  if (pathname === '/') return null;

  const label = ROUTE_LABELS[pathname];
  if (!label) return null;

  const app = resolveAppNav(pathname, { isBackofficeOrAdmin: true, isAdmin: true, isSolicitante: false });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      <Link to="/" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Hub</span>
      </Link>
      {app && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={app.home} className="hover:text-foreground transition-colors">{app.name}</Link>
        </>
      )}
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="text-foreground font-medium">{label}</span>
    </nav>
  );
}
