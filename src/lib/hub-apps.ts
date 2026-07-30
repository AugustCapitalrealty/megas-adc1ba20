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
} from 'lucide-react';

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
}

/** Apps disponíveis hoje, filtrados por papel do usuário. */
export function getHubApps({ isBackofficeOrAdmin, isAdmin }: HubAccess): HubApp[] {
  const apps: HubApp[] = [
    {
      key: 'financeiro',
      name: 'Financeiro',
      description: 'Compras, contratos, OCs e acompanhamento financeiro de ponta a ponta.',
      icon: FileText,
      href: '/financeiro',
      span: 'full',
      links: [
        { label: 'Nova solicitação', href: '/nova-solicitacao', icon: Plus, primary: true },
        { label: 'Minhas solicitações', href: '/minhas-solicitacoes', icon: FileText },
        ...(isBackofficeOrAdmin
          ? [{ label: 'Backoffice', href: '/backoffice', icon: LayoutDashboard }]
          : []),
        { label: 'OC × NF', href: '/monitoramento-oc', icon: FileCheck },
        ...(isBackofficeOrAdmin
          ? [{ label: 'Garantias', href: '/garantias', icon: Shield }]
          : []),
        { label: 'Calendário', href: '/calendario', icon: CalendarDays },
      ],
    },
  ];

  if (isAdmin) {
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

    apps.push({
      key: 'administracao',
      name: 'Administração',
      description: 'Usuários, indicadores de SLA, eficiência e saúde da plataforma.',
      icon: Users,
      href: '/admin/usuarios',
      links: [
        { label: 'Usuários', href: '/admin/usuarios', icon: Users, primary: true },
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
