import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';
import logoMega from '@/assets/logos/logo-mega.png';

export default function AwaitingApproval() {
  const { user, loading, isApproved, signOut, isMasterUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
    // If approved or master user, redirect to home
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md animate-fade-in shadow-xl border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <img 
              src={logoMega} 
              alt="Mega Centro Logístico" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">Aguardando Aprovação</CardTitle>
          <CardDescription className="text-muted-foreground">
            Seu cadastro está sendo analisado pelo administrador do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Você receberá acesso ao sistema assim que seu cadastro for aprovado.</p>
            <p className="mt-2">Em caso de dúvidas, entre em contato com o administrador.</p>
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
