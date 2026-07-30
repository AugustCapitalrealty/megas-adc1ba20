import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  LayoutDashboard,
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
  key: 'financeiro' | 'energia' | 'administracao';
  name: string;
  /** Rota principal do app (link do "app switcher") */
  home: string;
  items: AppNavItem[];
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

const ADMIN_ROUTES = ['/admin/usuarios', '/admin/excelencia', '/admin/design-system'];

const matches = (pathname: string, routes: string[]) =>
  routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));

/** Resolve o app ativo pela rota. Retorna null no Hub (`/`) — header em modo limpo. */
export function resolveAppNav(pathname: string, access: NavAccess): AppNavContext | null {
  const { isBackofficeOrAdmin, isAdmin, isSolicitante } = access;

  if (matches(pathname, FINANCEIRO_ROUTES)) {
    return {
      key: 'financeiro',
      name: 'Financeiro',
      home: '/financeiro',
      primaryCta: { href: '/nova-solicitacao', label: 'Nova Solicitação', shortLabel: 'Nova', icon: Plus },
      items: [
        { href: '/financeiro', label: 'Início', icon: Home, show: true },
        { href: '/solicitacoes', label: 'Dashboard', icon: LayoutDashboard, show: true },
        { href: '/minhas-solicitacoes', label: 'Solicitações', icon: FileText, show: true },
        { href: '/backoffice', label: 'Backoffice', icon: ClipboardList, show: isBackofficeOrAdmin },
        { href: '/painel-fluig', label: 'Painel', icon: BarChart3, show: true },
        { href: '/calendario', label: 'Calendário', icon: CalendarDays, show: true },
        { href: '/monitoramento-oc', label: 'OC × NF', icon: FileCheck, show: true },
        { href: '/garantias', label: 'Garantias', icon: Shield, show: isBackofficeOrAdmin },
        { href: '/admin/sla', label: 'SLA', icon: Timer, show: isBackofficeOrAdmin },
        { href: '/admin/eficiencia', label: 'Eficiência', icon: BarChart3, show: isBackofficeOrAdmin },
        { href: '/notificacoes', label: 'Notificações', icon: Bell, show: isSolicitante },
      ].filter((i) => i.show),
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

  if (matches(pathname, ADMIN_ROUTES)) {
    return {
      key: 'administracao',
      name: 'Administração',
      home: '/admin/usuarios',
      items: [
        { href: '/admin/usuarios', label: 'Usuários', icon: Users, show: true },
        { href: '/admin/excelencia', label: 'Excelência', icon: Sparkles, show: isAdmin },
        { href: '/admin/design-system', label: 'Design System', icon: Palette, show: isAdmin },
      ].filter((i) => i.show),
    };
  }

  return null;
}
