import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoadingFallback } from "@/components/ui/PageLoadingFallback";
import { ThemeProvider } from "next-themes";
import { ProtectedShell, RequireRole } from "@/routes/guards";

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
const Calendario = lazy(() => import("./pages/Calendario"));
const Notificacoes = lazy(() => import("./pages/Notificacoes"));
const AdminExcelencia = lazy(() => import("./pages/AdminExcelencia"));
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

const SuspenseFallback = () => <PageLoadingFallback />;

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
          <Route path="calendario" element={<Calendario />} />
          <Route path="notificacoes" element={<Notificacoes />} />
          <Route path="backoffice" element={<RequireRole role="backoffice"><Backoffice /></RequireRole>} />
          <Route path="admin/sla" element={<RequireRole role="backoffice"><DashboardSLA /></RequireRole>} />
          <Route path="admin/eficiencia" element={<RequireRole role="backoffice"><DashboardEficiencia /></RequireRole>} />
          <Route path="admin/usuarios" element={<RequireRole role="admin"><Admin /></RequireRole>} />
          <Route path="admin/excelencia" element={<RequireRole role="admin"><AdminExcelencia /></RequireRole>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ScrollToTop />
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </ThemeProvider>
);

export default App;
