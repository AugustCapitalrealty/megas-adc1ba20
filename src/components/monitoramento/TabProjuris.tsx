import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale, Clock, GitBranch, ShieldAlert } from 'lucide-react';
import { ProjurisVisaoStatus } from './projuris/ProjurisVisaoStatus';
import { ProjurisParadosAssinatura } from './projuris/ProjurisParadosAssinatura';
import { ProjurisFluxoAprovacoes } from './projuris/ProjurisFluxoAprovacoes';
import { ProjurisCompliance } from './projuris/ProjurisCompliance';

export function TabProjuris() {
  return (
    <Tabs defaultValue="visao_status" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="visao_status" className="gap-1.5 text-xs sm:text-sm">
          <Scale className="h-4 w-4 hidden sm:block" />
          Visão por Status
        </TabsTrigger>
        <TabsTrigger value="parados" className="gap-1.5 text-xs sm:text-sm">
          <Clock className="h-4 w-4 hidden sm:block" />
          Parados Assinatura
        </TabsTrigger>
        <TabsTrigger value="fluxo" className="gap-1.5 text-xs sm:text-sm">
          <GitBranch className="h-4 w-4 hidden sm:block" />
          Fluxo Aprovações
        </TabsTrigger>
        <TabsTrigger value="compliance" className="gap-1.5 text-xs sm:text-sm">
          <ShieldAlert className="h-4 w-4 hidden sm:block" />
          Compliance
        </TabsTrigger>
      </TabsList>

      <TabsContent value="visao_status">
        <ProjurisVisaoStatus />
      </TabsContent>
      <TabsContent value="parados">
        <ProjurisParadosAssinatura />
      </TabsContent>
      <TabsContent value="fluxo">
        <ProjurisFluxoAprovacoes />
      </TabsContent>
      <TabsContent value="compliance">
        <ProjurisCompliance />
      </TabsContent>
    </Tabs>
  );
}
