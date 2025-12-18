import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useFluigSnapshots } from '@/hooks/useFluigDashboard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Loader2,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FluigImport } from '@/components/FluigImport';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function PainelFluig() {
  const [activeTab, setActiveTab] = useState<'abertos' | 'fechados' | 'cancelados'>('abertos');
  const [importOpen, setImportOpen] = useState(false);
  
  const { snapshots: allSnapshots, loading, refetch } = useFluigSnapshots({});

  // Business rule: valor < 2500 doesn't need Diretoria approval
  // Closes when Financeiro approves. valor >= 2500 needs Diretoria.
  const isFechado = (s: typeof allSnapshots[0]) => {
    if (!s.valor) return false;
    if (s.valor < 2500) {
      return !!s.gerencia_financeiro_conclusao;
    }
    return !!s.diretoria_conclusao;
  };

  const isCancelado = (s: typeof allSnapshots[0]) => {
    return s.situacao?.toLowerCase() === 'cancelado' || 
           s.situacao?.toLowerCase() === 'cancelada';
  };

  // Separate by status
  const { abertos, fechados, cancelados } = useMemo(() => {
    const cancelados = allSnapshots.filter(isCancelado);
    const fechados = allSnapshots.filter(s => !isCancelado(s) && isFechado(s));
    const abertos = allSnapshots.filter(s => !isCancelado(s) && !isFechado(s));
    return { abertos, fechados, cancelados };
  }, [allSnapshots]);

  const currentSnapshots = activeTab === 'abertos' ? abertos : activeTab === 'fechados' ? fechados : cancelados;

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const formatDateShort = (date: string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), "dd/MM/yy", { locale: ptBR });
    } catch {
      return date;
    }
  };

  const ApprovalCell = ({ responsavel, conclusao }: { responsavel: string | null; conclusao: string | null }) => {
    if (!conclusao) {
      return <span className="text-muted-foreground/40">-</span>;
    }
    const firstName = responsavel?.split(' ')[0] || 'OK';
    return (
      <div className="flex items-center gap-1 text-success">
        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
        <span className="text-xs font-medium" title={responsavel || undefined}>
          {firstName}
        </span>
      </div>
    );
  };

  const handleImportComplete = () => {
    setImportOpen(false);
    refetch();
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Painel Fluig</h1>
            <p className="text-muted-foreground">
              Acompanhe as solicitações do Fluig
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
              Atualizar
            </Button>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="h-4 w-4 mr-1" />
                  Importar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Importar Planilha Fluig</DialogTitle>
                </DialogHeader>
                <FluigImport onImportComplete={handleImportComplete} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4 grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="abertos" className="gap-2">
              <Clock className="h-4 w-4" />
              Abertos ({abertos.length})
            </TabsTrigger>
            <TabsTrigger value="fechados" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Fechados ({fechados.length})
            </TabsTrigger>
            <TabsTrigger value="cancelados" className="gap-2">
              <XCircle className="h-4 w-4" />
              Cancelados ({cancelados.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <Card className="overflow-hidden border">
              {loading ? (
                <div className="py-12 text-center">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : currentSnapshots.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Nenhum registro</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-primary text-primary-foreground">
                        <th className="px-3 py-2.5 text-left font-semibold">Nº</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Data</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Valor</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Responsável</th>
                        <th className="px-3 py-2.5 text-center font-semibold">Facilities</th>
                        <th className="px-3 py-2.5 text-center font-semibold">Financeiro</th>
                        <th className="px-3 py-2.5 text-center font-semibold">Diretoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {currentSnapshots.map((snapshot, idx) => (
                        <tr 
                          key={snapshot.id} 
                          className={cn(
                            "hover:bg-muted/50 transition-colors",
                            idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                          )}
                        >
                          <td className="px-3 py-2">
                            <span className="font-semibold text-primary">{snapshot.solicitacao_fluig}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatDateShort(snapshot.data_lancamento)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                            {formatCurrency(snapshot.valor)}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium" title={snapshot.responsavel_atual || undefined}>
                              {snapshot.responsavel_atual || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <ApprovalCell 
                              responsavel={snapshot.gerencia_facilities_responsavel} 
                              conclusao={snapshot.gerencia_facilities_conclusao} 
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <ApprovalCell 
                              responsavel={snapshot.gerencia_financeiro_responsavel} 
                              conclusao={snapshot.gerencia_financeiro_conclusao} 
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <ApprovalCell 
                              responsavel={snapshot.diretoria_responsavel} 
                              conclusao={snapshot.diretoria_conclusao} 
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
