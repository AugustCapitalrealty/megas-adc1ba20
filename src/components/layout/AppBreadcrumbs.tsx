import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Hub',
  '/solicitacoes': 'Solicitações',
  '/nova-solicitacao': 'Nova Solicitação',
  '/minhas-solicitacoes': 'Minhas Solicitações',
  '/backoffice': 'Backoffice',
  '/painel-fluig': 'Painel',
  '/garantias': 'Garantias',
  '/calendario': 'Calendário',
  '/admin/usuarios': 'Usuários',
  '/admin/sla': 'Dashboard SLA',
  '/admin/eficiencia': 'Eficiência',
  '/admin/rateio-energia': 'Rateio de Energia',
};

export function AppBreadcrumbs() {
  const { pathname } = useLocation();

  if (pathname === '/') return null;

  const label = ROUTE_LABELS[pathname];
  if (!label) return null;

  const isAdmin = pathname.startsWith('/admin');

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      <Link to="/" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Hub</span>
      </Link>
      {isAdmin && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Admin</span>
        </>
      )}
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="text-foreground font-medium">{label}</span>
    </nav>
  );
}
