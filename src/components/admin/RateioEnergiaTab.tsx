import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnergiaCadastrosTab } from './energia/EnergiaCadastrosTab';
import { MemoriaCalculoTab } from './energia/MemoriaCalculoTab';
import { ContratosTab } from './energia/ContratosTab';
import { GrandezasContratadasTab } from './energia/GrandezasContratadasTab';
import { FaturaCopelTab } from './energia/FaturaCopelTab';
import { FaturasTab } from './energia/FaturasTab';
import { CompetenciaProvider } from './energia/CompetenciaContext';
import { Settings, ClipboardList, FileText, FileSignature, Receipt, Users } from 'lucide-react';

export function RateioEnergiaTab() {
  const [tab, setTab] = useState('lancamentos');
  const [focusContratoId, setFocusContratoId] = useState<string | null>(null);
  const openContrato = (id: string) => {
    setFocusContratoId(id);
    setTab('contratos');
  };
  return (
    <CompetenciaProvider>
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="fatura" className="gap-2">
          <Receipt className="h-4 w-4" /> Fatura Copel
        </TabsTrigger>
        <TabsTrigger value="lancamentos" className="gap-2">
          <ClipboardList className="h-4 w-4" /> Lançamentos
        </TabsTrigger>
        <TabsTrigger value="faturas" className="gap-2">
          <Users className="h-4 w-4" /> Faturas por Cliente
        </TabsTrigger>
        <TabsTrigger value="contratos" className="gap-2">
          <FileText className="h-4 w-4" /> Contratos
        </TabsTrigger>
        <TabsTrigger value="grandezas" className="gap-2">
          <FileSignature className="h-4 w-4" /> Grandezas Contratadas
        </TabsTrigger>
        <TabsTrigger value="cadastros" className="gap-2">
          <Settings className="h-4 w-4" /> Cadastros
        </TabsTrigger>
      </TabsList>
      <TabsContent value="fatura"><FaturaCopelTab /></TabsContent>
      <TabsContent value="lancamentos"><MemoriaCalculoTab /></TabsContent>
      <TabsContent value="faturas"><FaturasTab /></TabsContent>
      <TabsContent value="contratos">
        <ContratosTab
          initialFocusContratoId={focusContratoId}
          onFocusHandled={() => setFocusContratoId(null)}
        />
      </TabsContent>
      <TabsContent value="grandezas"><GrandezasContratadasTab /></TabsContent>
      <TabsContent value="cadastros"><EnergiaCadastrosTab onOpenContrato={openContrato} /></TabsContent>
    </Tabs>
    </CompetenciaProvider>
  );
}