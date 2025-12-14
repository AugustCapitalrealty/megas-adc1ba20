import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, LayoutDashboard, Users } from 'lucide-react';

export default function Dashboard() {
  const { profile, isBackofficeOrAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Nova Solicitação',
      description: 'Criar uma nova solicitação de AC ou OC',
      icon: Plus,
      href: '/nova-solicitacao',
      show: true,
      variant: 'default' as const,
    },
    {
      title: 'Minhas Solicitações',
      description: 'Acompanhar suas solicitações',
      icon: FileText,
      href: '/minhas-solicitacoes',
      show: true,
      variant: 'outline' as const,
    },
    {
      title: 'Backoffice',
      description: 'Analisar e aprovar solicitações',
      icon: LayoutDashboard,
      href: '/backoffice',
      show: isBackofficeOrAdmin,
      variant: 'outline' as const,
    },
    {
      title: 'Gerenciar Usuários',
      description: 'Administrar usuários e permissões',
      icon: Users,
      href: '/admin/usuarios',
      show: isAdmin,
      variant: 'outline' as const,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo à plataforma de solicitações AC/OC dos Megas
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {actions
            .filter((action) => action.show)
            .map((action) => {
              const Icon = action.icon;
              return (
                <Card
                  key={action.href}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => navigate(action.href)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {action.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </AppLayout>
  );
}