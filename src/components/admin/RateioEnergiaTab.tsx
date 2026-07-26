import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EnergiaCadastrosTab } from './energia/EnergiaCadastrosTab';
import { MemoriaCalculoTab } from './energia/MemoriaCalculoTab';
import { ContratosTab } from './energia/ContratosTab';
import { GrandezasContratadasTab } from './energia/GrandezasContratadasTab';
import { FaturaCopelTab } from './energia/FaturaCopelTab';
import { FaturasTab } from './energia/FaturasTab';
import { EnergiaPainelTab } from './energia/EnergiaPainelTab';
import { CompetenciaProvider } from './energia/CompetenciaContext';
import { EnergiaCompetenciaBar } from './energia/EnergiaCompetenciaBar';
import {
  Settings, ClipboardList, FileText, FileSignature, Receipt, Users,
  LayoutDashboard, Database, ChevronLeft,
} from 'lucide-react';

type MainTab = 'painel' | 'fatura' | 'lancamentos' | 'faturas';
type OperacaoSub = 'fatura' | 'lancamentos' | 'faturas';
type CadastroSub = 'contratos' | 'grandezas' | 'base';

const STEPS: { value: MainTab; step?: number; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'painel', label: 'Painel', icon: LayoutDashboard },
  { value: 'fatura', step: 1, label: 'Fatura Copel', icon: Receipt },
  { value: 'lancamentos', step: 2, label: 'Lançamentos', icon: ClipboardList },
  { value: 'faturas', step: 3, label: 'Faturas por Cliente', icon: Users },
];

export function RateioEnergiaTab() {
  const [tab, setTab] = useState<MainTab>('painel');
  const [showCadastros, setShowCadastros] = useState(false);
  const [cadSub, setCadSub] = useState<CadastroSub>('contratos');
  const [focusContratoId, setFocusContratoId] = useState<string | null>(null);

  const openContrato = (id: string) => {
    setFocusContratoId(id);
    setShowCadastros(true);
    setCadSub('contratos');
  };

  const goToOperacao = (target: OperacaoSub) => {
    setShowCadastros(false);
    setTab(target);
  };

  if (showCadastros) {
    return (
      <CompetenciaProvider>
        <div className="space-y-4">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setShowCadastros(false)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar ao fechamento mensal
          </Button>
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
        </div>
      </CompetenciaProvider>
    );
  }

  return (
    <CompetenciaProvider>
      <div className="space-y-4">
        <EnergiaCompetenciaBar />

        <Tabs value={tab} onValueChange={(v) => setTab(v as MainTab)} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <TabsList className="h-auto flex-wrap">
              {STEPS.map(({ value, step, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="gap-2">
                  {step ? (
                    <span className="h-5 w-5 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold flex items-center justify-center">
                      {step}
                    </span>
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button variant="outline" size="sm" onClick={() => setShowCadastros(true)}>
              <Database className="h-4 w-4 mr-2" /> Cadastros Base
            </Button>
          </div>

          <TabsContent value="painel"><EnergiaPainelTab onGoTo={goToOperacao} /></TabsContent>
          <TabsContent value="fatura"><FaturaCopelTab /></TabsContent>
          <TabsContent value="lancamentos"><MemoriaCalculoTab /></TabsContent>
          <TabsContent value="faturas"><FaturasTab /></TabsContent>
        </Tabs>
      </div>
    </CompetenciaProvider>
  );
}