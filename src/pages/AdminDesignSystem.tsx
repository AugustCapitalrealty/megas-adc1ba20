import { useState } from 'react';
import { Sparkles, FileText, AlertTriangle, CheckCircle, Clock, Users, BarChart3 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { FilterToolbar } from '@/components/ui/FilterToolbar';
import { StandardModal } from '@/components/ui/StandardModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

type DemoRow = { id: number; pedido: string; valor: string; status: string };

const demoRows: DemoRow[] = [
  { id: 1, pedido: 'AC-1042', valor: 'R$ 845,00', status: 'Em análise' },
  { id: 2, pedido: 'OC-2207', valor: 'R$ 12.300,00', status: 'Aprovado' },
  { id: 3, pedido: 'AC-1043', valor: 'R$ 230,00', status: 'Pendente' },
  { id: 4, pedido: 'OC-2208', valor: 'R$ 5.640,00', status: 'Rejeitado' },
];

const intents = ['neutral', 'primary', 'success', 'warning', 'danger', 'info', 'purple'] as const;

export default function AdminDesignSystem() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('todos');
  const [modalOpen, setModalOpen] = useState(false);

  const columns: DataTableColumn<DemoRow>[] = [
    { key: 'pedido', header: 'Pedido', cell: (r) => <span className="font-medium">{r.pedido}</span> },
    { key: 'valor', header: 'Valor', align: 'right', cell: (r) => r.valor },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => {
        const intent =
          r.status === 'Aprovado' ? 'success' :
          r.status === 'Rejeitado' ? 'danger' :
          r.status === 'Pendente' ? 'warning' : 'info';
        return <StatusPill intent={intent}>{r.status}</StatusPill>;
      },
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Design System"
        description="Componentes canônicos do sistema. Use estes como referência ao construir novas telas."
        icon={Sparkles}
        actions={
          <Button onClick={() => setModalOpen(true)} variant="outline">
            Abrir modal de exemplo
          </Button>
        }
      />

      <Tabs value={tab === 'todos' ? 'tokens' : tab} onValueChange={setTab} defaultValue="tokens">
        <TabsList>
          <TabsTrigger value="tokens">Tipografia</TabsTrigger>
          <TabsTrigger value="kpis">KPI Cards</TabsTrigger>
          <TabsTrigger value="pills">Status Pills</TabsTrigger>
          <TabsTrigger value="table">Tabela & Filtros</TabsTrigger>
          <TabsTrigger value="modals">Modais</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="mt-6 space-y-4">
          <Card>
            <CardHeader><CardTitle>Escala tipográfica</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="ds-text-display">ds-text-display — Hero / títulos de marketing</p>
              <p className="ds-text-h1">ds-text-h1 — Título de página</p>
              <p className="ds-text-h2">ds-text-h2 — Seção dentro da página</p>
              <p className="ds-text-h3">ds-text-h3 — Subseção / card title</p>
              <p className="ds-text-h4">ds-text-h4 — Mini título / row header</p>
              <p className="ds-text-body">ds-text-body — Corpo de texto padrão (14px)</p>
              <p className="ds-text-caption">ds-text-caption — Notas, hints, metadados</p>
              <p className="ds-text-label">ds-text-label — Labels de KPI / coluna</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Solicitações" value={128} icon={FileText} intent="primary" delta={12} deltaLabel="vs semana anterior" />
            <KpiCard label="Pendentes" value={14} icon={Clock} intent="warning" hint="aguardando ação" />
            <KpiCard label="Aprovadas" value={86} icon={CheckCircle} intent="success" delta={4} />
            <KpiCard label="Atrasadas" value={3} icon={AlertTriangle} intent="danger" delta={-2} deltaLabel="vs ontem" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Usuários ativos" value="1.2k" icon={Users} intent="info" />
            <KpiCard label="Eficiência" value="94%" icon={BarChart3} intent="success" />
            <KpiCard label="Loading state" value="—" icon={FileText} loading />
          </div>
        </TabsContent>

        <TabsContent value="pills" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle>Suaves (default)</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {intents.map((i) => <StatusPill key={i} intent={i}>{i}</StatusPill>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Sólidos (alta ênfase)</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {intents.map((i) => <StatusPill key={i} intent={i} solid>{i}</StatusPill>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Tamanhos</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <StatusPill intent="success" size="sm">small</StatusPill>
              <StatusPill intent="success" size="md">medium</StatusPill>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="mt-6 space-y-4">
          <FilterToolbar
            showSearch
            searchPlaceholder="Buscar pedido…"
            searchValue={search}
            onSearchChange={setSearch}
            tabs={[
              { id: 'todos', label: 'Todos', count: 4 },
              { id: 'analise', label: 'Em análise', count: 1, variant: 'warning' },
              { id: 'aprovado', label: 'Aprovado', count: 1, variant: 'success' },
              { id: 'rejeitado', label: 'Rejeitado', count: 1, variant: 'destructive' },
            ]}
            activeTab={tab === 'todos' ? 'todos' : tab}
            onTabChange={setTab}
            activeChips={search ? [{ id: 's', label: `Busca: ${search}`, onRemove: () => setSearch('') }] : []}
            onClearAll={() => setSearch('')}
          />
          <DataTable
            columns={columns}
            rows={demoRows.filter(r => !search || r.pedido.toLowerCase().includes(search.toLowerCase()))}
            rowKey={(r) => r.id}
            density="normal"
            onRowClick={(r) => console.log('row', r)}
          />
          <Separator />
          <h3 className="ds-text-h3">Estado de loading</h3>
          <DataTable columns={columns} rows={[]} rowKey={(r) => (r as DemoRow).id} loading />
          <h3 className="ds-text-h3">Estado vazio</h3>
          <DataTable columns={columns} rows={[]} rowKey={(r) => (r as DemoRow).id} empty="Nenhuma solicitação encontrada com os filtros atuais." />
        </TabsContent>

        <TabsContent value="modals" className="mt-6 space-y-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className="ds-text-body">
                Use <code className="px-1.5 py-0.5 bg-muted rounded">StandardModal</code> em todos os modais.
                Variantes: <code>confirm</code>, <code>form</code>, <code>destructive</code>, <code>info</code>.
              </p>
              <Button onClick={() => setModalOpen(true)}>Abrir StandardModal</Button>
            </CardContent>
          </Card>
          <StandardModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Confirmar ação"
            description="Esta é a aparência canônica de um modal no sistema."
            variant="confirm"
            confirmText="Confirmar"
            onConfirm={async () => { await new Promise(r => setTimeout(r, 600)); setModalOpen(false); }}
          >
            <p className="ds-text-body text-muted-foreground">
              O conteúdo do modal segue a tipografia padrão. Use <code>ds-text-body</code> aqui.
            </p>
          </StandardModal>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}