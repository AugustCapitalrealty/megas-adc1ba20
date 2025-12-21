import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import AwaitingApproval from "./pages/AwaitingApproval";
import Dashboard from "./pages/Dashboard";
import NovaSolicitacao from "./pages/NovaSolicitacao";
import MinhasSolicitacoes from "./pages/MinhasSolicitacoes";
import Backoffice from "./pages/Backoffice";
import PainelFluig from "./pages/PainelFluig";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/aguardando-aprovacao" element={<AwaitingApproval />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/nova-solicitacao" element={<ProtectedRoute><NovaSolicitacao /></ProtectedRoute>} />
      <Route path="/minhas-solicitacoes" element={<ProtectedRoute><MinhasSolicitacoes /></ProtectedRoute>} />
      <Route path="/backoffice" element={<ProtectedRoute requireBackoffice><Backoffice /></ProtectedRoute>} />
      <Route path="/painel-fluig" element={<ProtectedRoute><PainelFluig /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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