import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import type { AppKey, AppRoleLevel } from '@/lib/app-access';

export function ProtectedShell() {
  const { user, loading, isApproved, isMasterUser } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isApproved && !isMasterUser) return <Navigate to="/aguardando-aprovacao" replace />;

  return <AppLayout />;
}

export function RequireRole({ role, children }: { role: 'backoffice' | 'admin'; children: React.ReactNode }) {
  const { isBackofficeOrAdmin, isAdmin } = useAuth();
  const allowed = role === 'admin' ? isAdmin : isBackofficeOrAdmin;
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function RequireApp({
  app,
  nivel,
  children,
}: {
  app: AppKey;
  nivel?: AppRoleLevel;
  children: React.ReactNode;
}) {
  const { hasApp, canApp } = useAuth();
  const allowed = nivel ? canApp(app, nivel) : hasApp(app);
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}
