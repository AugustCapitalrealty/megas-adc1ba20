import { useState, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
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
  LayoutDashboard, 
  LogOut,
  Menu,
  UserCog,
  X,
  WifiOff,
  Moon,
  Sun,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationBell } from '@/components/NotificationBell';
import { CommandPalette } from '@/components/CommandPalette';
import { AppBreadcrumbs } from '@/components/layout/AppBreadcrumbs';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';
import logoMega from '@/assets/logos/logo-mega.png';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { resolveAppNav } from '@/lib/hub-nav';
import { getHubApps } from '@/lib/hub-apps';

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
  const isOnline = useOnlineStatus();
  const { theme, setTheme } = useTheme();
  const track = useTrackEvent();

  // Page view tracking — leve, debounced via useTrackEvent
  useEffect(() => {
    track('page_view', { path: location.pathname }, location.pathname);
  }, [location.pathname, track]);

  // Determine persona
  const isSolicitante = !isBackofficeOrAdmin && !isAdmin;

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

  // App ativo (null = Hub → header limpo)
  const appNav = resolveAppNav(location.pathname, { isBackofficeOrAdmin, isAdmin, isSolicitante });
  const mainNavItems = appNav?.items ?? [];
  const hubApps = getHubApps({ isBackofficeOrAdmin, isAdmin });

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return email.slice(0, 2).toUpperCase();
  };

  const isActive = (href: string) => location.pathname === href;

  const primaryCta = appNav?.primaryCta ?? null;
  const menuGroup = appNav?.menu && appNav.menu.items.length > 0 ? appNav.menu : null;
  const isMenuActive = !!menuGroup?.items.some((i) => isActive(i.href));

  const prefetchRoute = useCallback((path: string) => {
    const routeMap: Record<string, () => Promise<any>> = {
      '/': () => import('@/pages/Hub'),
      '/solicitacoes': () => import('@/pages/Dashboard'),
      '/nova-solicitacao': () => import('@/pages/NovaSolicitacao'),
      '/minhas-solicitacoes': () => import('@/pages/MinhasSolicitacoes'),
      '/backoffice': () => import('@/pages/Backoffice'),
      '/painel-fluig': () => import('@/pages/PainelFluig'),
      '/garantias': () => import('@/pages/GarantiasVigentes'),
      '/monitoramento-oc': () => import('@/pages/MonitoramentoOC'),
      '/calendario': () => import('@/pages/Calendario'),
      '/admin/usuarios': () => import('@/pages/Admin'),
      '/admin/sla': () => import('@/pages/DashboardSLA'),
      '/admin/eficiencia': () => import('@/pages/DashboardEficiencia'),
      '/admin/excelencia': () => import('@/pages/AdminExcelencia'),
      '/admin/rateio-energia': () => import('@/pages/AdminRateioEnergia'),
      '/notificacoes': () => import('@/pages/Notificacoes'),
    };
    routeMap[path]?.();
  }, []);

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {mainNavItems
        .filter((item) => item.show)
        .map((item) => {
          const Icon = item.icon;
          const link = (
              <Link
              key={item.href}
              to={item.href}
              aria-label={item.label}
              onClick={() => mobile && setMobileMenuOpen(false)}
              onMouseEnter={() => !mobile && prefetchRoute(item.href)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/70 hover:text-primary hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {mobile ? item.label : <span className="hidden lg:inline">{item.label}</span>}
            </Link>
          );
          if (mobile) return link;
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent className="lg:hidden">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
      >
        Pular para conteúdo
      </a>

      {/* Impersonation Banner */}
      {isImpersonating && impersonatedProfile && (
        <div role="alert" className="bg-warning text-warning-foreground px-4 py-2 flex items-center justify-center gap-3">
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

      {/* Offline Banner */}
      {!isOnline && (
        <div role="alert" className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Sem conexão com a internet. Verifique sua rede.</span>
        </div>
      )}

      {/* Header */}
      <header role="banner" className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 sm:h-16 items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <Link to="/" className="flex items-center gap-3 shrink-0" aria-label="Hub dos Megas">
              <img src={logoMega} alt="Mega Centro Logístico" width={86} height={40} className="h-10 w-auto object-contain" />
            </Link>
            {appNav && (
              <>
                <span className="text-border select-none" aria-hidden="true">|</span>
                <Link
                  to={appNav.home}
                  className="text-sm font-semibold text-foreground/80 hover:text-primary transition-colors truncate"
                >
                  {appNav.name}
                </Link>
              </>
            )}
          </div>

          {/* Desktop Navigation — contextual ao app ativo (oculta no Hub) */}
          {appNav && (
          <TooltipProvider delayDuration={300}>
          <nav aria-label="Navegação principal" className="hidden md:flex flex-nowrap items-center gap-1">
            {/* Primary CTA - persona-based */}
            {primaryCta && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={primaryCta.href}
                    onMouseEnter={() => prefetchRoute(primaryCta.href)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-colors mr-1 shadow-md',
                      isActive(primaryCta.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                  >
                    <primaryCta.icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{primaryCta.shortLabel}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="lg:hidden">{primaryCta.label}</TooltipContent>
              </Tooltip>
            )}

            <NavLinks />

            {menuGroup && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={menuGroup.label}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                      isMenuActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground/70 hover:text-primary hover:bg-accent'
                    )}
                  >
                    <MoreHorizontal className="h-4 w-4 shrink-0" />
                    <span className="hidden lg:inline">{menuGroup.label}</span>
                    <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {menuGroup.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link to={item.href} onMouseEnter={() => prefetchRoute(item.href)}>
                          <Icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
          </TooltipProvider>
          )}

          {/* Notifications & User Menu */}
          <div className="flex items-center gap-1 sm:gap-2">
            <CommandPalette />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="Menu do usuário">
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
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex items-center gap-2 mb-8">
                  <img src={logoMega} alt="Mega Centro Logístico" width={69} height={32} className="h-8 w-auto object-contain" />
                </div>
                <nav aria-label="Menu mobile" className="flex flex-col gap-2">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isActive('/')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground/70 hover:text-primary hover:bg-accent'
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Hub dos Megas
                  </Link>
                  {appNav && (
                    <>
                      <div className="h-px bg-border my-1" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-1">
                        {appNav.name}
                      </span>
                      <NavLinks mobile />
                    </>
                  )}
                  {menuGroup && (
                    <>
                      <div className="h-px bg-border my-1" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-1">
                        {menuGroup.label}
                      </span>
                      {menuGroup.items.map((item) => {
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

                  <div className="h-px bg-border my-1" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-1">Apps</span>
                  {hubApps
                    .filter((a) => a.key !== appNav?.key)
                    .map((a) => {
                      const Icon = a.icon;
                      return (
                        <Link
                          key={a.key}
                          to={a.href ?? '/'}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:text-primary hover:bg-accent transition-colors"
                        >
                          <Icon className="h-4 w-4" />
                          {a.name}
                        </Link>
                      );
                    })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Global Keyboard Shortcuts */}
      <GlobalShortcuts />

      {/* Main Content — Outlet replaces {children} for App Shell */}
      <main id="main-content" role="main" className="container max-w-screen-2xl py-6">
        <AppBreadcrumbs />
        <Outlet />
      </main>
    </div>
  );
}

function GlobalShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          navigate('/nova-solicitacao');
          break;
        case 's':
          e.preventDefault();
          navigate('/minhas-solicitacoes');
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  return null;
}
