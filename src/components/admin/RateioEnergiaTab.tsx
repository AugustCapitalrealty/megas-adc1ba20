import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnergiaCadastrosTab } from './energia/EnergiaCadastrosTab';
import { MemoriaCalculoTab } from './energia/MemoriaCalculoTab';
import { ContratosTab } from './energia/ContratosTab';
import { GrandezasContratadasTab } from './energia/GrandezasContratadasTab';
import { FaturaCopelTab } from './energia/FaturaCopelTab';
import { FaturasTab } from './energia/FaturasTab';
import { EnergiaPainelTab } from './energia/EnergiaPainelTab';
import { CompetenciaProvider } from './energia/CompetenciaContext';
import {
  Settings, ClipboardList, FileText, FileSignature, Receipt, Users,
  LayoutDashboard, Workflow, Database,
} from 'lucide-react';

type MainTab = 'painel' | 'operacao' | 'cadastros';
type OperacaoSub = 'fatura' | 'lancamentos' | 'faturas';
type CadastroSub = 'contratos' | 'grandezas' | 'base';

export function RateioEnergiaTab() {
  const [tab, setTab] = useState<MainTab>('painel');
  const [opSub, setOpSub] = useState<OperacaoSub>('fatura');
  const [cadSub, setCadSub] = useState<CadastroSub>('contratos');
  const [focusContratoId, setFocusContratoId] = useState<string | null>(null);

  const openContrato = (id: string) => {
    setFocusContratoId(id);
    setTab('cadastros');
    setCadSub('contratos');
  };

  const goToOperacao = (target: OperacaoSub) => {
    setOpSub(target);
    setTab('operacao');
  };

  return (
    <CompetenciaProvider>
      <Tabs value={tab} onValueChange={(v) => setTab(v as MainTab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="painel" className="gap-2">
            <LayoutDashboard className="h-4 w-4" /> Painel
          </TabsTrigger>
          <TabsTrigger value="operacao" className="gap-2">
            <Workflow className="h-4 w-4" /> Operação Mensal
          </TabsTrigger>
          <TabsTrigger value="cadastros" className="gap-2">
            <Database className="h-4 w-4" /> Cadastros Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="painel">
          <EnergiaPainelTab onGoTo={goToOperacao} />
        </TabsContent>

        <TabsContent value="operacao" className="space-y-4">
          <Tabs value={opSub} onValueChange={(v) => setOpSub(v as OperacaoSub)}>
            <TabsList>
              <TabsTrigger value="fatura" className="gap-2">
                <Receipt className="h-4 w-4" /> 1. Fatura Copel
              </TabsTrigger>
              <TabsTrigger value="lancamentos" className="gap-2">
                <ClipboardList className="h-4 w-4" /> 2. Lançamentos
              </TabsTrigger>
              <TabsTrigger value="faturas" className="gap-2">
                <Users className="h-4 w-4" /> 3. Faturas por Cliente
              </TabsTrigger>
            </TabsList>
            <div className="mt-4">
              <TabsContent value="fatura"><FaturaCopelTab /></TabsContent>
              <TabsContent value="lancamentos"><MemoriaCalculoTab /></TabsContent>
              <TabsContent value="faturas"><FaturasTab /></TabsContent>
            </div>
          </Tabs>
        </TabsContent>

        <TabsContent value="cadastros" className="space-y-4">
          <Tabs value={cadSub} onValueChange={(v) => setCadSub(v as CadastroSub)}>
            <TabsList>
              <TabsTrigger value="contratos" className="gap-2">
                <FileText className="h-4 w-4" /> Contratos
              </TabsTrigger>
              <TabsTrigger value="grandezas" className="gap-2">
                <FileSignature className="h-4 w-4" /> Grandezas Contratadas
              </TabsTrigger>
              <TabsTrigger value="base" className="gap-2">
                <Settings className="h-4 w-4" /> Clientes, Módulos e Tarifas
              </TabsTrigger>
            </TabsList>
            <div className="mt-4">
              <TabsContent value="contratos">
                <ContratosTab
                  initialFocusContratoId={focusContratoId}
                  onFocusHandled={() => setFocusContratoId(null)}
                />
              </TabsContent>
              <TabsContent value="grandezas"><GrandezasContratadasTab /></TabsContent>
              <TabsContent value="base"><EnergiaCadastrosTab onOpenContrato={openContrato} /></TabsContent>
            </div>
          </Tabs>
        </TabsContent>
      </Tabs>
    </CompetenciaProvider>
  );
}