import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Plus,
  LayoutDashboard,
  FileCheck,
  Shield,
  CalendarDays,
  Zap,
  Users,
  Timer,
  BarChart3,
  Sparkles,
  Scale,
  Wrench,
  PieChart,
  FileSignature,
  ListChecks,

} from 'lucide-react';
import type { AppKey } from './app-access';

export interface HubAppLink {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Destaque visual (CTA primário do card) */
  primary?: boolean;
}

export interface HubApp {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Rota principal ao clicar no card */
  href?: string;
  links: HubAppLink[];
  /** Card de roadmap: sem navegação */
  soon?: boolean;
  /** Tamanho no grid bento */
  span?: 'full' | 'half';
}

interface HubAccess {
  isBackofficeOrAdmin: boolean;
  isAdmin: boolean;
  hasApp?: (app: AppKey) => boolean;
  canApp?: (app: AppKey, minimo: string) => boolean;
}

/** Apps disponíveis hoje, filtrados por papel do usuário. */
export function getHubApps({ isBackofficeOrAdmin, isAdmin, hasApp }: HubAccess): HubApp[] {
  const liberado = (app: AppKey) =>
    hasApp ? hasApp(app) : app === 'financeiro' || isAdmin;

  const apps: HubApp[] = [];

  if (liberado('financeiro')) {
    apps.push({
      key: 'financeiro',
      name: 'Financeiro',
      description: 'Compras, contratos, OCs e acompanhamento financeiro de ponta a ponta.',
      icon: FileText,
      href: '/solicitacoes',
      span: 'full',
      links: [
        { label: 'Nova solicitação', href: '/nova-solicitacao', icon: Plus, primary: true },
        { label: 'Minhas solicitações', href: '/minhas-solicitacoes', icon: FileText },
        ...(isBackofficeOrAdmin
          ? [{ label: 'Backoffice', href: '/backoffice', icon: LayoutDashboard }]
          : []),
        { label: 'Monitoramento', href: '/monitoramento-oc', icon: FileCheck },
        ...(isBackofficeOrAdmin
          ? [{ label: 'Garantias', href: '/garantias', icon: Shield }]
          : []),
        { label: 'Calendário', href: '/calendario', icon: CalendarDays },
      ],
    });
  }

  if (liberado('energia')) {
    apps.push({
      key: 'energia',
      name: 'Energia',
      description: 'Rateio mensal de energia elétrica: faturas Copel, lançamentos e cobrança.',
      icon: Zap,
      href: '/admin/rateio-energia',
      links: [
        { label: 'Abrir rateio', href: '/admin/rateio-energia', icon: Zap, primary: true },
      ],
    });
  }

  if (liberado('contratos')) {
    apps.push({
      key: 'contratos',
      name: 'SLA de Contratos',
      description: 'Contratos de prestação de serviços: escopos, agenda de obrigações e evidências.',
      icon: FileSignature,
      href: '/contratos',
      links: [
        { label: 'Ver contratos', href: '/contratos', icon: ListChecks, primary: true },
      ],
    });
  }

  if (liberado('administracao')) {
    apps.push({
      key: 'administracao',
      name: 'Administração',
      description: 'Usuários, acessos aos apps, integrações e saúde da plataforma.',
      icon: Users,
      href: '/admin',
      links: [
        { label: 'Usuários & acessos', href: '/admin/usuarios', icon: Users, primary: true },
        { label: 'SLA', href: '/admin/sla', icon: Timer },
        { label: 'Eficiência', href: '/admin/eficiencia', icon: BarChart3 },
        { label: 'Excelência', href: '/admin/excelencia', icon: Sparkles },
      ],
    });
  }

  return apps;
}

/** Roadmap — sinaliza a evolução do Hub sem prometer data. */
export const HUB_APPS_EM_BREVE: HubApp[] = [
  {
    key: 'juridico',
    name: 'Jurídico',
    description: 'Contratos e acompanhamento de minutas em um módulo próprio.',
    icon: Scale,
    links: [],
    soon: true,
  },
  {
    key: 'facilities',
    name: 'Manutenção',
    description: 'Chamados de facilities e manutenção predial dos condomínios.',
    icon: Wrench,
    links: [],
    soon: true,
  },
  {
    key: 'indicadores',
    name: 'Indicadores',
    description: 'Painel executivo consolidado de todos os apps do Hub.',
    icon: PieChart,
    links: [],
    soon: true,
  },
];
