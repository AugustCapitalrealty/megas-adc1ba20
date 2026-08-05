import { lazy, Suspense, type ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoadingFallback } from "@/components/ui/PageLoadingFallback";
import { ThemeProvider } from "next-themes";
import { ProtectedShell, RequireRole, RequireApp } from "@/routes/guards";

// Retry dynamic imports once before failing — covers transient network blips
// and stale chunks right after a deploy. ErrorBoundary handles the rest.
function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isChunkErr = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);
      if (!isChunkErr) throw err;
      await new Promise(r => setTimeout(r, 400));
      return importFn();
    }
  });
}

const Login = lazyWithRetry(() => import("./pages/Login"));
const AwaitingApproval = lazyWithRetry(() => import("./pages/AwaitingApproval"));
const Hub = lazyWithRetry(() => import("./pages/Hub"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const NovaSolicitacao = lazyWithRetry(() => import("./pages/NovaSolicitacao"));
const MinhasSolicitacoes = lazyWithRetry(() => import("./pages/MinhasSolicitacoes"));
const Backoffice = lazyWithRetry(() => import("./pages/Backoffice"));
const PainelFluig = lazyWithRetry(() => import("./pages/PainelFluig"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const AdminHub = lazyWithRetry(() => import("./pages/AdminHub"));
const DashboardSLA = lazyWithRetry(() => import("./pages/DashboardSLA"));
const GarantiasVigentes = lazyWithRetry(() => import("./pages/GarantiasVigentes"));
const DashboardEficiencia = lazyWithRetry(() => import("./pages/DashboardEficiencia"));
const MonitoramentoOC = lazyWithRetry(() => import("./pages/MonitoramentoOC"));
const Calendario = lazyWithRetry(() => import("./pages/Calendario"));
const Notificacoes = lazyWithRetry(() => import("./pages/Notificacoes"));
const AdminExcelencia = lazyWithRetry(() => import("./pages/AdminExcelencia"));
const AdminDesignSystem = lazyWithRetry(() => import("./pages/AdminDesignSystem"));
const AdminRateioEnergia = lazyWithRetry(() => import("./pages/AdminRateioEnergia"));
const ContratosLista = lazyWithRetry(() => import("./pages/contratos/ContratosLista"));
const ContratoDetalhe = lazyWithRetry(() => import("./pages/contratos/ContratoDetalhe"));
const ContratoForm = lazyWithRetry(() => import("./pages/contratos/ContratoForm"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

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
          <Route index element={<Hub />} />
          <Route path="financeiro" element={<Navigate to="/solicitacoes" replace />} />
          <Route path="solicitacoes" element={<Dashboard />} />
          <Route path="dashboard" element={<Navigate to="/solicitacoes" replace />} />
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
          <Route path="admin" element={<RequireApp app="administracao"><AdminHub /></RequireApp>} />
          <Route path="admin/usuarios" element={<RequireApp app="administracao"><Admin /></RequireApp>} />
          <Route path="admin/excelencia" element={<RequireApp app="administracao"><AdminExcelencia /></RequireApp>} />
          <Route path="admin/design-system" element={<RequireApp app="administracao"><AdminDesignSystem /></RequireApp>} />
          <Route path="admin/rateio-energia" element={<RequireApp app="energia"><AdminRateioEnergia /></RequireApp>} />
          <Route path="contratos" element={<RequireApp app="contratos"><ContratosLista /></RequireApp>} />
          <Route path="contratos/novo" element={<RequireApp app="contratos"><ContratoForm /></RequireApp>} />
          <Route path="contratos/:id/editar" element={<RequireApp app="contratos"><ContratoForm /></RequireApp>} />
          <Route path="contratos/:id" element={<RequireApp app="contratos"><ContratoDetalhe /></RequireApp>} />
          <Route path="contratos/lista" element={<Navigate to="/contratos" replace />} />
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
