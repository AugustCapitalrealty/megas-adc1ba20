import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale, Clock, GitBranch, ShieldAlert, Archive } from 'lucide-react';
import { ProjurisVisaoStatus } from './projuris/ProjurisVisaoStatus';
import { ProjurisParadosAssinatura } from './projuris/ProjurisParadosAssinatura';
import { ProjurisFluxoAprovacoes } from './projuris/ProjurisFluxoAprovacoes';
import { ProjurisCompliance } from './projuris/ProjurisCompliance';
import { ProjurisImport } from './projuris/ProjurisImport';
import { ProjurisFinalizadas } from './projuris/ProjurisFinalizadas';

export function TabProjuris() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleImported = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ProjurisImport onImported={handleImported} />
      </div>

      <Tabs defaultValue="visao_status" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="visao_status" className="gap-1.5 text-xs sm:text-sm">
            <Scale className="h-4 w-4 hidden sm:block" />
            Em Aberto
          </TabsTrigger>
          <TabsTrigger value="parados" className="gap-1.5 text-xs sm:text-sm">
            <Clock className="h-4 w-4 hidden sm:block" />
            Parados Aprovação
          </TabsTrigger>
          <TabsTrigger value="fluxo" className="gap-1.5 text-xs sm:text-sm">
            <GitBranch className="h-4 w-4 hidden sm:block" />
            Fluxo Aprovações
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1.5 text-xs sm:text-sm">
            <ShieldAlert className="h-4 w-4 hidden sm:block" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="finalizadas" className="gap-1.5 text-xs sm:text-sm">
            <Archive className="h-4 w-4 hidden sm:block" />
            Finalizadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao_status">
          <ProjurisVisaoStatus key={`vs-${refreshKey}`} />
        </TabsContent>
        <TabsContent value="parados">
          <ProjurisParadosAssinatura key={`pa-${refreshKey}`} />
        </TabsContent>
        <TabsContent value="fluxo">
          <ProjurisFluxoAprovacoes key={`fa-${refreshKey}`} />
        </TabsContent>
        <TabsContent value="compliance">
          <ProjurisCompliance />
        </TabsContent>
        <TabsContent value="finalizadas">
          <ProjurisFinalizadas key={`fin-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
