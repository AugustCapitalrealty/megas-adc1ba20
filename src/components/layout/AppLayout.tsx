import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  LayoutDashboard, 
  Plus, 
  Users, 
  LogOut,
  Menu,
  BarChart3,
  UserCog,
  X,
  Timer,
  Shield,
  Settings,
  ChevronDown,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationBell } from '@/components/NotificationBell';
import { CommandPalette } from '@/components/CommandPalette';
import { AppBreadcrumbs } from '@/components/layout/AppBreadcrumbs';
import logoMega from '@/assets/logos/logo-mega.png';

export function AppLayout() {
  const { 
    user, 
    profile, 
    signOut, 
    isBackofficeOrAdmin, 
    isAdmin,
    isImpersonating,
    impersonatedProfile,
    stopImpersonation,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    navigate('/admin/usuarios');
  };

  const displayProfile = isImpersonating ? impersonatedProfile : profile;
  const displayEmail = isImpersonating ? impersonatedProfile?.email : user?.email;

  // Main nav items
  const mainNavItems = [
    { href: '/minhas-solicitacoes', label: 'Solicitações', icon: FileText, show: true },
    { href: '/backoffice', label: 'Backoffice', icon: LayoutDashboard, show: isBackofficeOrAdmin },
    { href: '/painel-fluig', label: 'Painel Fluig', icon: BarChart3, show: true },
    { href: '/garantias', label: 'Garantias', icon: Shield, show: true },
    { href: '/monitoramento-oc', label: 'Monitoramento', icon: FileCheck, show: true },
  ];

  const adminItems = [
    { href: '/admin/usuarios', label: 'Usuários', icon: Users },
    { href: '/admin/sla', label: 'Dashboard SLA', icon: Timer },
    { href: '/admin/eficiencia', label: 'Eficiência', icon: BarChart3 },
  ];

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return email.slice(0, 2).toUpperCase();
  };

  const isActive = (href: string) => location.pathname === href;
  const isAdminActive = adminItems.some(item => location.pathname === item.href);

  const prefetchRoute = useCallback((path: string) => {
    const routeMap: Record<string, () => Promise<any>> = {
      '/': () => import('@/pages/Dashboard'),
      '/nova-solicitacao': () => import('@/pages/NovaSolicitacao'),
      '/minhas-solicitacoes': () => import('@/pages/MinhasSolicitacoes'),
      '/backoffice': () => import('@/pages/Backoffice'),
      '/painel-fluig': () => import('@/pages/PainelFluig'),
      '/garantias': () => import('@/pages/GarantiasVigentes'),
      '/monitoramento-oc': () => import('@/pages/MonitoramentoOC'),
      '/admin/usuarios': () => import('@/pages/Admin'),
      '/admin/sla': () => import('@/pages/DashboardSLA'),
      '/admin/eficiencia': () => import('@/pages/DashboardEficiencia'),
    };
    routeMap[path]?.();
  }, []);

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {mainNavItems
        .filter((item) => item.show)
        .map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => mobile && setMobileMenuOpen(false)}
              onMouseEnter={() => !mobile && prefetchRoute(item.href)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/70 hover:text-primary hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Impersonation Banner */}
      {isImpersonating && impersonatedProfile && (
        <div className="bg-warning text-warning-foreground px-4 py-2 flex items-center justify-center gap-3">
          <UserCog className="h-4 w-4" />
          <span className="text-sm font-medium">
            Visualizando como: <strong>{impersonatedProfile.full_name || impersonatedProfile.email}</strong>
          </span>
          <Button variant="secondary" size="sm" onClick={handleStopImpersonation} className="h-6 px-2 text-xs gap-1">
            <X className="h-3 w-3" />
            Sair
          </Button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src={logoMega} alt="Mega Centro Logístico" width={86} height={40} className="h-10 w-auto object-contain" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/nova-solicitacao"
              onMouseEnter={() => prefetchRoute('/nova-solicitacao')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors mr-1',
                isActive('/nova-solicitacao')
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
            >
              <Plus className="h-4 w-4" />
              Nova
            </Link>

            <NavLinks />

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isAdminActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground/70 hover:text-primary hover:bg-accent'
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    Admin
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)} onMouseEnter={() => prefetchRoute(item.href)}>
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* Notifications & User Menu */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={displayProfile?.avatar_url || undefined} alt={displayProfile?.full_name || displayEmail || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(displayProfile?.full_name || null, displayEmail || '')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayProfile?.full_name || 'Usuário'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                    {isImpersonating && <p className="text-xs leading-none text-warning mt-1">(Impersonando)</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isImpersonating && (
                  <DropdownMenuItem onClick={handleStopImpersonation}>
                    <X className="mr-2 h-4 w-4" />
                    Voltar ao meu perfil
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex items-center gap-2 mb-8">
                  <img src={logoMega} alt="Mega Centro Logístico" width={69} height={32} className="h-8 w-auto object-contain" />
                </div>
                <nav className="flex flex-col gap-2">
                  <Link
                    to="/nova-solicitacao"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors',
                      isActive('/nova-solicitacao')
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    Nova Solicitação
                  </Link>
                  <div className="h-px bg-border my-1" />
                  <NavLinks mobile />
                  {isAdmin && (
                    <>
                      <div className="h-px bg-border my-1" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-1">Administração</span>
                      {adminItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                              isActive(item.href)
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground/70 hover:text-primary hover:bg-accent'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content — Outlet replaces {children} for App Shell */}
      <main className="container max-w-screen-2xl py-6">
        <AppBreadcrumbs />
        <Outlet />
      </main>
    </div>
  );
}
