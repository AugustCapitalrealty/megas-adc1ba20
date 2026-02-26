import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function ProtectedRoute({ 
  children, 
  requireBackoffice = false,
  requireAdmin = false 
}: { 
  children: React.ReactNode; 
  requireBackoffice?: boolean;
  requireAdmin?: boolean;
}) {
  const { user, loading, isBackofficeOrAdmin, isAdmin, isApproved, isMasterUser } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is approved (master user is always approved)
  if (!isApproved && !isMasterUser) {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireBackoffice && !isBackofficeOrAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const SuspenseFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function AppRoutes() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/aguardando-aprovacao" element={<AwaitingApproval />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/nova-solicitacao" element={<ProtectedRoute><NovaSolicitacao /></ProtectedRoute>} />
        <Route path="/minhas-solicitacoes" element={<ProtectedRoute><MinhasSolicitacoes /></ProtectedRoute>} />
        <Route path="/backoffice" element={<ProtectedRoute requireBackoffice><Backoffice /></ProtectedRoute>} />
        <Route path="/painel-fluig" element={<ProtectedRoute><PainelFluig /></ProtectedRoute>} />
        <Route path="/admin/usuarios" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
        <Route path="/admin/sla" element={<ProtectedRoute requireBackoffice><DashboardSLA /></ProtectedRoute>} />
        <Route path="/admin/eficiencia" element={<ProtectedRoute requireBackoffice><DashboardEficiencia /></ProtectedRoute>} />
        <Route path="/garantias" element={<ProtectedRoute><GarantiasVigentes /></ProtectedRoute>} />
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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;