import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AppLayout } from "@/components/layout/AppLayout";
import logoMega from "@/assets/logos/logo-mega.png";

const Login = lazy(() => import("./pages/Login"));
const AwaitingApproval = lazy(() => import("./pages/AwaitingApproval"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NovaSolicitacao = lazy(() => import("./pages/NovaSolicitacao"));
const MinhasSolicitacoes = lazy(() => import("./pages/MinhasSolicitacoes"));
const Backoffice = lazy(() => import("./pages/Backoffice"));
const PainelFluig = lazy(() => import("./pages/PainelFluig"));
const Admin = lazy(() => import("./pages/Admin"));
const DashboardSLA = lazy(() => import("./pages/DashboardSLA"));
const GarantiasVigentes = lazy(() => import("./pages/GarantiasVigentes"));
const DashboardEficiencia = lazy(() => import("./pages/DashboardEficiencia"));
const MonitoramentoOC = lazy(() => import("./pages/MonitoramentoOC"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ 
  requireBackoffice = false,
  requireAdmin = false 
}: { 
  requireBackoffice?: boolean;
  requireAdmin?: boolean;
}) {
  const { user, loading, isBackofficeOrAdmin, isAdmin, isApproved, isMasterUser } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src={logoMega} alt="Mega" className="h-10 w-auto opacity-50" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isApproved && !isMasterUser) {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireBackoffice && !isBackofficeOrAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/** Shell layout: ProtectedRoute + AppLayout, rendered once for all protected routes */
function ProtectedShell({ requireBackoffice = false, requireAdmin = false }: { requireBackoffice?: boolean; requireAdmin?: boolean }) {
  const { user, loading, isBackofficeOrAdmin, isAdmin, isApproved, isMasterUser } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src={logoMega} alt="Mega" className="h-10 w-auto opacity-50" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isApproved && !isMasterUser) return <Navigate to="/aguardando-aprovacao" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  if (requireBackoffice && !isBackofficeOrAdmin) return <Navigate to="/" replace />;

  return <AppLayout />;
}

const SuspenseFallback = () => null;

function AppRoutes() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/aguardando-aprovacao" element={<AwaitingApproval />} />
        
        {/* All standard protected routes share a single AppLayout shell */}
        <Route element={<ProtectedShell />}>
          <Route index element={<Dashboard />} />
          <Route path="nova-solicitacao" element={<NovaSolicitacao />} />
          <Route path="minhas-solicitacoes" element={<MinhasSolicitacoes />} />
          <Route path="painel-fluig" element={<PainelFluig />} />
          <Route path="garantias" element={<GarantiasVigentes />} />
          <Route path="monitoramento-oc" element={<MonitoramentoOC />} />
        </Route>

        {/* Backoffice-level routes */}
        <Route element={<ProtectedShell requireBackoffice />}>
          <Route path="backoffice" element={<Backoffice />} />
          <Route path="admin/sla" element={<DashboardSLA />} />
          <Route path="admin/eficiencia" element={<DashboardEficiencia />} />
        </Route>

        {/* Admin-level routes */}
        <Route element={<ProtectedShell requireAdmin />}>
          <Route path="admin/usuarios" element={<Admin />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
