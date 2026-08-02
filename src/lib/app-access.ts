import type { LucideIcon } from 'lucide-react';
import { FileText, Zap, Users, FileSignature } from 'lucide-react';

export type AppKey = 'financeiro' | 'energia' | 'administracao' | 'contratos';
export type AppRoleLevel =
  | 'solicitante'
  | 'backoffice'
  | 'admin'
  | 'leitor'
  | 'editor'
  | 'fechador';

export type AppAccessMap = Partial<Record<AppKey, AppRoleLevel>>;

export interface AppDefinition {
  key: AppKey;
  name: string;
  description: string;
  icon: LucideIcon;
  home: string;
  papeis: { value: AppRoleLevel; label: string; description: string }[];
  papelPadrao: AppRoleLevel;
}

export const APP_DEFINITIONS: AppDefinition[] = [
  {
    key: 'financeiro',
    name: 'Financeiro',
    description: 'Solicitações, backoffice, OCs, garantias e indicadores.',
    icon: FileText,
    home: '/solicitacoes',
    papelPadrao: 'solicitante',
    papeis: [
      { value: 'solicitante', label: 'Solicitante', description: 'Cria e acompanha as próprias solicitações.' },
      { value: 'backoffice', label: 'Backoffice', description: 'Analisa, emite OCs e acessa indicadores.' },
      { value: 'admin', label: 'Admin do app', description: 'Backoffice + gestão de todas as solicitações.' },
    ],
  },
  {
    key: 'energia',
    name: 'Energia',
    description: 'Rateio mensal: faturas Copel, lançamentos e fechamento.',
    icon: Zap,
    home: '/admin/rateio-energia',
    papelPadrao: 'leitor',
    papeis: [
      { value: 'leitor', label: 'Leitor', description: 'Apenas visualiza competências e faturas.' },
      { value: 'editor', label: 'Editor', description: 'Lança faturas, cadastros e contratos.' },
      { value: 'fechador', label: 'Fechador', description: 'Editor + fecha e reabre a competência.' },
    ],
  },
  {
    key: 'administracao',
    name: 'Administração',
    description: 'Usuários, acessos, integrações e saúde da plataforma.',
    icon: Users,
    home: '/admin',
    papelPadrao: 'admin',
    papeis: [
      { value: 'admin', label: 'Gestor do Hub', description: 'Administra usuários e acessos dos apps.' },
    ],
  },
  {
    key: 'contratos',
    name: 'SLA de Contratos',
    description: 'Contratos de prestação de serviços, escopos, agenda e evidências.',
    icon: FileSignature,
    home: '/contratos',
    papelPadrao: 'leitor',
    papeis: [
      { value: 'leitor', label: 'Leitor', description: 'Visualiza contratos, escopos e agenda.' },
      { value: 'editor', label: 'Editor', description: 'Edita contratos, escopos e registra execuções.' },
      { value: 'admin', label: 'Gestor', description: 'Editor + importação e exclusão de contratos.' },
    ],
  },
];

export const APP_BY_KEY: Record<AppKey, AppDefinition> = APP_DEFINITIONS.reduce(
  (acc, app) => ({ ...acc, [app.key]: app }),
  {} as Record<AppKey, AppDefinition>,
);

export const APP_ROLE_LABELS: Record<AppRoleLevel, string> = {
  solicitante: 'Solicitante',
  backoffice: 'Backoffice',
  admin: 'Admin',
  leitor: 'Leitor',
  editor: 'Editor',
  fechador: 'Fechador',
};

const RANK: Record<AppRoleLevel, number> = {
  solicitante: 1,
  leitor: 1,
  backoffice: 2,
  editor: 2,
  admin: 3,
  fechador: 3,
};

export function appRoleRank(papel: AppRoleLevel | undefined): number {
  return papel ? RANK[papel] : 0;
}

export interface AccessPreset {
  key: string;
  label: string;
  description: string;
  access: AppAccessMap;
}

export const ACCESS_PRESETS: AccessPreset[] = [
  {
    key: 'facilities',
    label: 'Facilities',
    description: 'Cria solicitações no Financeiro.',
    access: { financeiro: 'solicitante' },
  },
  {
    key: 'backoffice',
    label: 'Backoffice Financeiro',
    description: 'Analisa e emite OCs no Financeiro.',
    access: { financeiro: 'backoffice' },
  },
  {
    key: 'energia',
    label: 'Energia',
    description: 'Financeiro (solicitante) + rateio de energia como editor.',
    access: { financeiro: 'solicitante', energia: 'editor' },
  },
  {
    key: 'admin',
    label: 'Administrador do Hub',
    description: 'Acesso completo a todos os apps.',
    access: { financeiro: 'admin', energia: 'fechador', administracao: 'admin', contratos: 'admin' },
  },
  {
    key: 'contratos',
    label: 'Contratos',
    description: 'Financeiro (solicitante) + SLA de Contratos como editor.',
    access: { financeiro: 'solicitante', contratos: 'editor' },
  },
];
