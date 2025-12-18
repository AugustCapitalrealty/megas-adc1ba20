import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FluigImport } from '@/components/FluigImport';
import { FluigDashboard } from '@/components/FluigDashboard';
import { BarChart3, Upload } from 'lucide-react';

export default function PainelFluig() {
  const [activeTab, setActiveTab] = useState<'painel' | 'importar'>('painel');

  const handleImportComplete = () => {
    setActiveTab('painel');
  };

  const handleNavigateToSolicitacao = (id: string) => {
    // Could navigate to backoffice with selected solicitation
    console.log('Navigate to solicitation:', id);
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Painel Fluig</h1>
          <p className="text-muted-foreground">
            Acompanhe as solicitações registradas no Fluig
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="painel" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Painel
            </TabsTrigger>
            <TabsTrigger value="importar" className="gap-2">
              <Upload className="h-4 w-4" />
              Importar Planilha
            </TabsTrigger>
          </TabsList>

          <TabsContent value="painel">
            <FluigDashboard onNavigateToSolicitacao={handleNavigateToSolicitacao} />
          </TabsContent>

          <TabsContent value="importar">
            <div className="max-w-2xl">
              <FluigImport onImportComplete={handleImportComplete} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
