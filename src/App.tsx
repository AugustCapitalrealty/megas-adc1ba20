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
import { ErrorBoundary } from "@/components/ErrorBoundary";
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

/** Unified shell: auth check + AppLayout rendered ONCE */
function ProtectedShell() {
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

/** Inline role guard — no loading state (auth already verified by shell) */
function RequireRole({ role, children }: { role: 'backoffice' | 'admin'; children: React.ReactNode }) {
  const { isBackofficeOrAdmin, isAdmin } = useAuth();
  const allowed = role === 'admin' ? isAdmin : isBackofficeOrAdmin;
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const SuspenseFallback = () => null;

function AppRoutes() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/aguardando-aprovacao" element={<AwaitingApproval />} />

        {/* Single shell — AppLayout mounts once, never remounts on navigation */}
        <Route element={<ProtectedShell />}>
          <Route index element={<Dashboard />} />
          <Route path="nova-solicitacao" element={<NovaSolicitacao />} />
          <Route path="minhas-solicitacoes" element={<MinhasSolicitacoes />} />
          <Route path="painel-fluig" element={<PainelFluig />} />
          <Route path="garantias" element={<GarantiasVigentes />} />
          <Route path="monitoramento-oc" element={<MonitoramentoOC />} />
          <Route path="backoffice" element={<RequireRole role="backoffice"><Backoffice /></RequireRole>} />
          <Route path="admin/sla" element={<RequireRole role="backoffice"><DashboardSLA /></RequireRole>} />
          <Route path="admin/eficiencia" element={<RequireRole role="backoffice"><DashboardEficiencia /></RequireRole>} />
          <Route path="admin/usuarios" element={<RequireRole role="admin"><Admin /></RequireRole>} />
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
