import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  ClipboardList,
  BarChart3,
  CalendarDays,
  FileCheck,
  Bell,
  Shield,
  Timer,
  Users,
  Sparkles,
  Palette,
  Zap,
  Plus,
  Home,
} from 'lucide-react';

export interface AppNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  show?: boolean;
}

export interface AppNavContext {
  key: 'financeiro' | 'energia' | 'administracao' | 'contratos';
  name: string;
  /** Rota principal do app (link do "app switcher") */
  home: string;
  items: AppNavItem[];
  /** Itens secundários agrupados num menu suspenso */
  menu?: { label: string; items: AppNavItem[] };
  primaryCta?: { href: string; label: string; shortLabel: string; icon: LucideIcon };
}

interface NavAccess {
  isBackofficeOrAdmin: boolean;
  isAdmin: boolean;
  isSolicitante: boolean;
}

const FINANCEIRO_ROUTES = [
  '/financeiro',
  '/solicitacoes',
  '/nova-solicitacao',
  '/minhas-solicitacoes',
  '/backoffice',
  '/painel-fluig',
  '/calendario',
  '/monitoramento-oc',
  '/garantias',
  '/notificacoes',
  '/admin/sla',
  '/admin/eficiencia',
];

const ENERGIA_ROUTES = ['/admin/rateio-energia'];

const CONTRATOS_ROUTES = ['/contratos'];

const ADMIN_ROUTES = ['/admin', '/admin/usuarios', '/admin/excelencia', '/admin/design-system'];

const matches = (pathname: string, routes: string[]) =>
  routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));

/** Resolve o app ativo pela rota. Retorna null no Hub (`/`) — header em modo limpo. */
export function resolveAppNav(pathname: string, access: NavAccess): AppNavContext | null {
  const { isBackofficeOrAdmin, isAdmin, isSolicitante } = access;

  if (matches(pathname, FINANCEIRO_ROUTES)) {
    return {
      key: 'financeiro',
      name: 'Financeiro',
      home: '/solicitacoes',
      primaryCta: { href: '/nova-solicitacao', label: 'Nova Solicitação', shortLabel: 'Nova', icon: Plus },
      items: [
        { href: '/solicitacoes', label: 'Início', icon: Home, show: true },
        { href: '/minhas-solicitacoes', label: 'Solicitações', icon: FileText, show: true },
        { href: '/backoffice', label: 'Backoffice', icon: ClipboardList, show: isBackofficeOrAdmin },
        { href: '/painel-fluig', label: 'Painel', icon: BarChart3, show: true },
        { href: '/calendario', label: 'Calendário', icon: CalendarDays, show: true },
        { href: '/monitoramento-oc', label: 'Monitoramento', icon: FileCheck, show: true },
      ].filter((i) => i.show),
      menu: {
        label: 'Mais',
        items: [
          { href: '/garantias', label: 'Garantias', icon: Shield, show: isBackofficeOrAdmin },
          { href: '/admin/sla', label: 'SLA', icon: Timer, show: isBackofficeOrAdmin },
          { href: '/admin/eficiencia', label: 'Eficiência', icon: BarChart3, show: isBackofficeOrAdmin },
          { href: '/notificacoes', label: 'Notificações', icon: Bell, show: isSolicitante },
        ].filter((i) => i.show),
      },
    };
  }

  if (matches(pathname, ENERGIA_ROUTES)) {
    return {
      key: 'energia',
      name: 'Energia',
      home: '/admin/rateio-energia',
      items: [{ href: '/admin/rateio-energia', label: 'Rateio de Energia', icon: Zap, show: true }],
    };
  }

  if (matches(pathname, CONTRATOS_ROUTES)) {
    return {
      key: 'contratos',
      name: 'Performance de Contratos',
      home: '/contratos',
      items: [
        { href: '/contratos', label: 'Início', icon: Home, show: true },
      ].filter((i) => i.show),
    };
  }

  if (matches(pathname, ADMIN_ROUTES)) {
    return {
      key: 'administracao',
      name: 'Administração',
      home: '/admin',
      items: [
        { href: '/admin', label: 'Início', icon: Home, show: true },
        { href: '/admin/usuarios', label: 'Usuários & acessos', icon: Users, show: true },
        { href: '/admin/excelencia', label: 'Excelência', icon: Sparkles, show: isAdmin },
        { href: '/admin/design-system', label: 'Design System', icon: Palette, show: isAdmin },
      ].filter((i) => i.show),
    };
  }

  return null;
}
