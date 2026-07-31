import { Link } from 'react-router-dom';
import { Users, FileText, Building2, MessageSquare, Sparkles, Palette, Timer, BarChart3, Shield } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

const CARDS = [
  {
    title: 'Usuários & acessos',
    description: 'Aprove usuários e defina quais apps do Hub cada um enxerga e com qual papel.',
    href: '/admin/usuarios',
    icon: Users,
    destaque: true,
  },
  {
    title: 'Solicitações',
    description: 'Gestão transversal das solicitações do Financeiro.',
    href: '/admin/usuarios?tab=solicitacoes',
    icon: FileText,
  },
  {
    title: 'Rateio & configurações',
    description: 'Áreas por empreendimento e parâmetros de rateio.',
    href: '/admin/usuarios?tab=rateio',
    icon: Building2,
  },
  {
    title: 'Integrações',
    description: 'WhatsApp, Google Chat e notificações automáticas.',
    href: '/admin/usuarios?tab=whatsapp',
    icon: MessageSquare,
  },
  {
    title: 'SLA',
    description: 'Indicadores de prazo do Financeiro.',
    href: '/admin/sla',
    icon: Timer,
  },
  {
    title: 'Eficiência',
    description: 'Retrabalho, produtividade e gargalos.',
    href: '/admin/eficiencia',
    icon: BarChart3,
  },
  {
    title: 'Excelência',
    description: 'Saúde da plataforma, erros e analytics.',
    href: '/admin/excelencia',
    icon: Sparkles,
  },
  {
    title: 'Design System',
    description: 'Tokens e componentes canônicos do Hub.',
    href: '/admin/design-system',
    icon: Palette,
  },
];

export default function AdminHub() {
  useDocumentTitle('Administração — Hub dos Megas');
  const { effectiveProfile } = useAuth();
  const primeiroNome = (effectiveProfile?.full_name || '').split(' ')[0];

  return (
    <PageContainer width="wide">
      <PageHeader
        icon={Shield}
        title="Hub de Administração"
        description={`Governança do Hub dos Megas${primeiroNome ? `, ${primeiroNome}` : ''}: acessos, integrações e indicadores.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href + card.title} to={card.href} className="group">
              <Card
                className={`h-full transition-colors hover:border-primary/50 ${
                  card.destaque ? 'border-primary/40 bg-primary/5 sm:col-span-2' : ''
                }`}
              >
                <CardContent className="p-5 space-y-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="font-semibold group-hover:text-primary transition-colors">{card.title}</p>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
