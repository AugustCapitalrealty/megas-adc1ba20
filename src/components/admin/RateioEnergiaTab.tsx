import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnergiaCadastrosTab } from './energia/EnergiaCadastrosTab';
import { MemoriaCalculoTab } from './energia/MemoriaCalculoTab';
import { ContratosTab } from './energia/ContratosTab';
import { Settings, Calculator, FileText } from 'lucide-react';

export function RateioEnergiaTab() {
  return (
    <Tabs defaultValue="memoria" className="space-y-4">
      <TabsList>
        <TabsTrigger value="memoria" className="gap-2">
          <Calculator className="h-4 w-4" /> Memória de Cálculo
        </TabsTrigger>
        <TabsTrigger value="contratos" className="gap-2">
          <FileText className="h-4 w-4" /> Contratos
        </TabsTrigger>
        <TabsTrigger value="cadastros" className="gap-2">
          <Settings className="h-4 w-4" /> Cadastros
        </TabsTrigger>
      </TabsList>
      <TabsContent value="memoria"><MemoriaCalculoTab /></TabsContent>
      <TabsContent value="contratos"><ContratosTab /></TabsContent>
      <TabsContent value="cadastros"><EnergiaCadastrosTab /></TabsContent>
    </Tabs>
  );
}