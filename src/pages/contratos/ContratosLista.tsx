import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileSignature, FileWarning, CheckCircle2, Clock, Infinity as InfinityIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterToolbar, type ActiveFilterChip } from '@/components/ui/FilterToolbar';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusPill, type StatusIntent } from '@/components/ui/StatusPill';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoriaPanel } from '@/components/contratos/CategoriaPanel';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatBR } from '@/lib/date-utils';

const sel = (s: string): string => s;

const EMPREENDIMENTO_LABELS: Record<string, string> = {
  mega_curitiba: 'Mega Curitiba',
  mega_itajai: 'Mega Itajaí',
  mega_esteio: 'Mega Esteio',
  mega_canoas: 'Mega Canoas',
  todos: 'Todos',
};

interface ContratoRow {
  id: string;
  empreendimento: string;
  fornecedor_nome: string;
  numero_contrato: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  indeterminado: boolean;
  quantidade: number | null;
  unidade: string;
  valor_contrato: number | null;
  indice_reajuste: string | null;
  mes_reajuste: string | null;
  ativo: boolean;
  categoria_id: string;
  contrato_categorias: { id: string; nome: string } | null;
}

type Situacao = 'vigente' | 'a_vencer' | 'vencido' | 'indeterminado';

const SITUACAO_META: Record<Situacao, { label: string; intent: StatusIntent }> = {
  vigente: { label: 'Vigente', intent: 'success' },
  a_vencer: { label: 'A vencer', intent: 'warning' },
  vencido: { label: 'Vencido', intent: 'danger' },
  indeterminado: { label: 'Indeterminado', intent: 'info' },
};

function getSituacao(c: ContratoRow): Situacao {
  if (c.indeterminado || !c.data_fim) return 'indeterminado';
  const fim = new Date(`${c.data_fim}T12:00:00`);
  const hoje = new Date();
  const dias = Math.floor((fim.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return 'vencido';
  if (dias <= 90) return 'a_vencer';
  return 'vigente';
}

const moeda = (v: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ContratosLista() {
  useDocumentTitle('SLA de Contratos');

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const aba = searchParams.get('aba') === 'categoria' || searchParams.get('aba') === 'gerador' ? 'categoria' : 'todos';
  const catParam = searchParams.get('cat');
  const contratoParam = searchParams.get('contrato');

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => (v == null ? next.delete(k) : next.set(k, v)));
    setSearchParams(next, { replace: true });
  };

  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [mega, setMega] = useState('todos');
  const [situacao, setSituacao] = useState<'todas' | Situacao>('todas');

  const { data: categorias = [] } = useQuery({
    queryKey: ['contrato-categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contrato_categorias')
        .select(sel('id, nome, ordem'))
        .eq('ativo', true)
        .order('ordem')
        .returns<{ id: string; nome: string; ordem: number }[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: contratos = [], isLoading, error } = useQuery({
    queryKey: ['contratos-lista'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select(
          sel(
            'id, empreendimento, fornecedor_nome, numero_contrato, data_inicio, data_fim, indeterminado, quantidade, unidade, valor_contrato, indice_reajuste, mes_reajuste, ativo, categoria_id, contrato_categorias(id, nome)',
          ),
        )
        .order('fornecedor_nome')
        .returns<ContratoRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return contratos.filter((c) => {
      if (categoria !== 'todas' && c.categoria_id !== categoria) return false;
      if (mega !== 'todos' && c.empreendimento !== mega) return false;
      if (situacao !== 'todas' && getSituacao(c) !== situacao) return false;
      if (!termo) return true;
      return [
        c.fornecedor_nome,
        c.numero_contrato ?? '',
        c.contrato_categorias?.nome ?? '',
        EMPREENDIMENTO_LABELS[c.empreendimento] ?? c.empreendimento,
      ]
        .join(' ')
        .toLowerCase()
        .includes(termo);
    });
  }, [contratos, busca, categoria, mega, situacao]);

  const kpis = useMemo(() => {
    const acc = { vigente: 0, a_vencer: 0, vencido: 0, indeterminado: 0 };
    contratos.forEach((c) => {
      acc[getSituacao(c)] += 1;
    });
    return acc;
  }, [contratos]);

  const megasDisponiveis = useMemo(
    () => Array.from(new Set(contratos.map((c) => c.empreendimento))).sort(),
    [contratos],
  );

  const chips: ActiveFilterChip[] = [];
  if (categoria !== 'todas') {
    chips.push({
      id: 'cat',
      label: `Categoria: ${categorias.find((c) => c.id === categoria)?.nome ?? ''}`,
      onRemove: () => setCategoria('todas'),
    });
  }
  if (mega !== 'todos') {
    chips.push({
      id: 'mega',
      label: `Mega: ${EMPREENDIMENTO_LABELS[mega] ?? mega}`,
      onRemove: () => setMega('todos'),
    });
  }
  if (situacao !== 'todas') {
    chips.push({
      id: 'sit',
      label: `Situação: ${SITUACAO_META[situacao].label}`,
      onRemove: () => setSituacao('todas'),
    });
  }
  if (busca.trim()) {
    chips.push({ id: 'busca', label: `Busca: ${busca}`, onRemove: () => setBusca('') });
  }

  const columns: DataTableColumn<ContratoRow>[] = [
    {
      key: 'categoria',
      header: 'Categoria',
      cell: (c) => <span className="font-medium">{c.contrato_categorias?.nome ?? '—'}</span>,
    },
    {
      key: 'mega',
      header: 'Mega',
      cell: (c) => EMPREENDIMENTO_LABELS[c.empreendimento] ?? c.empreendimento,
    },
    { key: 'fornecedor', header: 'Fornecedor', cell: (c) => c.fornecedor_nome },
    {
      key: 'numero',
      header: 'Nº contrato',
      cell: (c) => c.numero_contrato || <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'vigencia',
      header: 'Vigência',
      cell: (c) => (
        <span className="whitespace-nowrap">
          {c.data_inicio ? formatBR(c.data_inicio, 'dd/MM/yyyy') : '—'}
          {' → '}
          {c.indeterminado || !c.data_fim ? 'indeterminado' : formatBR(c.data_fim, 'dd/MM/yyyy')}
        </span>
      ),
    },
    {
      key: 'quantidade',
      header: 'Qtd.',
      align: 'right',
      cell: (c) =>
        c.quantidade == null ? '—' : `${c.quantidade.toLocaleString('pt-BR')} ${c.unidade}`,
    },
    {
      key: 'valor',
      header: 'Valor',
      align: 'right',
      cell: (c) => <span className="tabular-nums">{moeda(c.valor_contrato)}</span>,
    },
    {
      key: 'reajuste',
      header: 'Reajuste',
      cell: (c) =>
        c.indice_reajuste ? (
          <span className="text-muted-foreground">
            {c.indice_reajuste}
            {c.mes_reajuste ? ` · ${c.mes_reajuste}` : ''}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'situacao',
      header: 'Situação',
      cell: (c) => {
        const meta = SITUACAO_META[getSituacao(c)];
        return <StatusPill intent={meta.intent} size="sm">{meta.label}</StatusPill>;
      },
    },
  ];

  return (
    <PageContainer width="wide">
      <PageHeader
        title="SLA de Contratos"
        description="Contratos de prestação de serviços dos Megas: vigência, escopo e obrigações."
        icon={FileSignature}
      />

      <Tabs
        value={aba}
        onValueChange={(v) => (v === 'categoria' ? updateParams({ aba: 'categoria' }) : setSearchParams({}, { replace: true }))}
      >
        <TabsList>
          <TabsTrigger value="todos">Visão geral</TabsTrigger>
          <TabsTrigger value="categoria">Por categoria</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-6 mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Vigentes" value={kpis.vigente} icon={CheckCircle2} intent="success" loading={isLoading} />
        <KpiCard
          label="A vencer (90 dias)"
          value={kpis.a_vencer}
          icon={Clock}
          intent="warning"
          loading={isLoading}
        />
        <KpiCard label="Vencidos" value={kpis.vencido} icon={FileWarning} intent="danger" loading={isLoading} />
        <KpiCard
          label="Prazo indeterminado"
          value={kpis.indeterminado}
          icon={InfinityIcon}
          intent="info"
          loading={isLoading}
        />
      </div>

      <FilterToolbar
        showSearch
        searchPlaceholder="Buscar por fornecedor, nº do contrato ou categoria..."
        searchValue={busca}
        onSearchChange={setBusca}
        filters={[
          {
            id: 'categoria',
            label: 'Categoria',
            type: 'select',
            value: categoria,
            onChange: setCategoria,
            options: [
              { value: 'todas', label: 'Todas as categorias' },
              ...categorias.map((c) => ({ value: c.id, label: c.nome })),
            ],
          },
          {
            id: 'mega',
            label: 'Mega',
            type: 'select',
            value: mega,
            onChange: setMega,
            options: [
              { value: 'todos', label: 'Todos os Megas' },
              ...megasDisponiveis.map((m) => ({
                value: m,
                label: EMPREENDIMENTO_LABELS[m] ?? m,
              })),
            ],
          },
          {
            id: 'situacao',
            label: 'Situação',
            type: 'select',
            value: situacao,
            onChange: (v) => setSituacao(v as 'todas' | Situacao),
            options: [
              { value: 'todas', label: 'Todas as situações' },
              { value: 'vigente', label: 'Vigente' },
              { value: 'a_vencer', label: 'A vencer' },
              { value: 'vencido', label: 'Vencido' },
              { value: 'indeterminado', label: 'Indeterminado' },
            ],
          },
        ]}
        activeChips={chips}
        onClearAll={
          chips.length > 0
            ? () => {
                setBusca('');
                setCategoria('todas');
                setMega('todos');
                setSituacao('todas');
              }
            : undefined
        }
        footer={
          <p className="ds-text-label">
            {isLoading ? 'Carregando...' : `${filtrados.length} de ${contratos.length} contratos`}
          </p>
        }
      />

      <DataTable
        columns={columns}
        rows={filtrados}
        loading={isLoading}
        rowKey={(c) => c.id}
        density="normal"
        stickyHeader
        onRowClick={(c) => navigate(`/contratos/${c.id}`)}
        error={error ? 'Não foi possível carregar os contratos.' : undefined}
        empty={
          <div className="py-10 text-center ds-text-body text-muted-foreground">
            Nenhum contrato encontrado com os filtros atuais.
          </div>
        }
      />
        </TabsContent>

        <TabsContent value="categoria" className="mt-6">
          <CategoriaPanel
            categoriaId={catParam}
            onCategoriaChange={(catId) => updateParams({ aba: 'categoria', cat: catId, contrato: null })}
            contratoId={contratoParam}
            onContratoChange={(cId) => updateParams({ aba: 'categoria', contrato: cId })}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
