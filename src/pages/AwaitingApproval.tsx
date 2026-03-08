import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoMega from '@/assets/logos/logo-mega.png';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AwaitingApproval() {
  const { user, loading, isApproved, signOut, isMasterUser, profile } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  // Poll for approval every 15 seconds
  useEffect(() => {
    if (!user || loading) return;

    const interval = setInterval(async () => {
      setChecking(true);
      const { data } = await supabase
        .from('profiles')
        .select('approved')
        .eq('id', user.id)
        .single();

      if (data?.approved) {
        // Force page reload to re-initialize auth state
        window.location.href = '/';
      }
      setChecking(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
    if (!loading && user && (isApproved || isMasterUser)) {
      navigate('/');
    }
  }, [user, loading, isApproved, isMasterUser, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return null;
  }

  const createdAt = profile?.created_at;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md animate-fade-in shadow-xl border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <img 
              src={logoMega} 
              alt="Mega Centro Logístico" 
              width={138}
              height={64}
              className="h-16 w-auto object-contain"
            />
          </div>
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 relative">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              {checking && (
                <RefreshCw className="h-3 w-3 text-amber-500 animate-spin absolute -top-0.5 -right-0.5" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">Aguardando Aprovação</CardTitle>
          <CardDescription className="text-muted-foreground">
            Seu cadastro está sendo analisado pelo administrador do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>Você receberá acesso ao sistema assim que seu cadastro for aprovado.</p>
            {createdAt && (
              <p className="text-xs">
                Cadastro realizado {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ptBR })}
              </p>
            )}
            <p className="text-xs text-muted-foreground/70">
              Esta página verifica automaticamente a cada 15 segundos.
            </p>
          </div>
          
          <Button 
            onClick={handleSignOut} 
            className="w-full h-12" 
            variant="outline"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
