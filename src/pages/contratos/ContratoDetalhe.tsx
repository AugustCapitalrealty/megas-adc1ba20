import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileSignature, ListChecks, Timer, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { FilterToolbar } from '@/components/ui/FilterToolbar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatBR } from '@/lib/date-utils';
import { EMPREENDIMENTO_LABELS, SITUACAO_META, getSituacao, moeda } from '@/lib/contratos-utils';

const sel = (s: string): string => s;

interface Escopo {
  id: string;
  contrato_id: string;
  escopo: string;
  item: string | null;
  tipo: string | null;
  frequencia: string | null;
  observacao: string | null;
  sla_horas: number | null;
  ordem: number;
}

interface Contrato {
  id: string;
  categoria_id: string;
  empreendimento: string;
  fornecedor_nome: string;
  numero_contrato: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  prazo_meses: number | null;
  indeterminado: boolean;
  quantidade: number | null;
  unidade: string;
  valor_contrato: number | null;
  valor_por_unidade: number | null;
  indice_reajuste: string | null;
  mes_reajuste: string | null;
  observacao: string | null;
  contrato_categorias: { id: string; nome: string } | null;
}

function Linha({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function SlaCell({
  escopo,
  editavel,
  onSaved,
}: {
  escopo: Escopo;
  editavel: boolean;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [valor, setValor] = useState(escopo.sla_horas == null ? '' : String(escopo.sla_horas));
  const [salvando, setSalvando] = useState(false);

  if (!editavel) {
    return escopo.sla_horas == null ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      <span className="tabular-nums">{escopo.sla_horas}h</span>
    );
  }

  const salvar = async () => {
    const atual = escopo.sla_horas == null ? '' : String(escopo.sla_horas);
    if (valor.trim() === atual) return;
    const parsed = valor.trim() === '' ? null : Number(valor.replace(',', '.'));
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast({ title: 'SLA inválido', description: 'Informe as horas em número.', variant: 'destructive' });
      setValor(atual);
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from('contrato_escopos').update({ sla_horas: parsed }).eq('id', escopo.id);
    setSalvando(false);
    if (error) {
      toast({ title: 'Erro ao salvar SLA', description: error.message, variant: 'destructive' });
      setValor(atual);
      return;
    }
    toast({ title: 'SLA atualizado' });
    onSaved();
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        value={valor}
        disabled={salvando}
        onChange={(e) => setValor(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="—"
        inputMode="decimal"
        aria-label={`SLA em horas para ${escopo.escopo}`}
        className="h-7 w-20 text-right tabular-nums"
      />
      <span className="text-xs text-muted-foreground">h</span>
    </div>
  );
}

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { canApp } = useAuth();
  const editavel = canApp('contratos', 'editor');

  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [freq, setFreq] = useState('todas');

  const { data, isLoading, error } = useQuery({
    queryKey: ['contrato-detalhe', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: contrato, error: cErr } = await supabase
        .from('contratos')
        .select(
          sel(
            'id, categoria_id, empreendimento, fornecedor_nome, numero_contrato, data_inicio, data_fim, prazo_meses, indeterminado, quantidade, unidade, valor_contrato, valor_por_unidade, indice_reajuste, mes_reajuste, observacao, contrato_categorias(id, nome)',
          ),
        )
        .eq('id', id as string)
        .maybeSingle<Contrato>();
      if (cErr) throw cErr;
      if (!contrato) return null;

      const { data: irmaos, error: iErr } = await supabase
        .from('contratos')
        .select(sel('id, empreendimento, fornecedor_nome'))
        .eq('categoria_id', contrato.categoria_id)
        .returns<{ id: string; empreendimento: string; fornecedor_nome: string }[]>();
      if (iErr) throw iErr;

      const { data: escopos, error: eErr } = await supabase
        .from('contrato_escopos')
        .select(sel('id, contrato_id, escopo, item, tipo, frequencia, observacao, sla_horas, ordem'))
        .in('contrato_id', (irmaos ?? []).map((c) => c.id))
        .eq('ativo', true)
        .order('ordem')
        .returns<Escopo[]>();
      if (eErr) throw eErr;

      return { contrato, irmaos: irmaos ?? [], escopos: escopos ?? [] };
    },
  });

  const contrato = data?.contrato ?? null;
  useDocumentTitle(contrato ? `${contrato.fornecedor_nome} · Contrato` : 'Contrato');

  const escoposContrato = useMemo(
    () => (data?.escopos ?? []).filter((e) => e.contrato_id === id),
    [data, id],
  );

  const tipos = useMemo(
    () => Array.from(new Set(escoposContrato.map((e) => e.tipo).filter(Boolean) as string[])).sort(),
    [escoposContrato],
  );
  const frequencias = useMemo(
    () => Array.from(new Set(escoposContrato.map((e) => e.frequencia).filter(Boolean) as string[])).sort(),
    [escoposContrato],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return escoposContrato.filter((e) => {
      if (tipo !== 'todos' && e.tipo !== tipo) return false;
      if (freq !== 'todas' && e.frequencia !== freq) return false;
      if (!termo) return true;
      return [e.escopo, e.item ?? '', e.tipo ?? '', e.frequencia ?? '', e.observacao ?? '']
        .join(' ')
        .toLowerCase()
        .includes(termo);
    });
  }, [escoposContrato, busca, tipo, freq]);

  // Itens que os outros Megas contemplam e este contrato não
  const lacunas = useMemo(() => {
    if (!data || !contrato) return [];
    const meus = new Set(escoposContrato.map((e) => `${e.escopo}|${e.item ?? ''}`));
    const map = new Map<string, { key: string; escopo: string; item: string | null; megas: string[] }>();
    data.escopos.forEach((e) => {
      if (e.contrato_id === contrato.id) return;
      const key = `${e.escopo}|${e.item ?? ''}`;
      if (meus.has(key)) return;
      const irmao = data.irmaos.find((c) => c.id === e.contrato_id);
      if (!irmao) return;
      const label = EMPREENDIMENTO_LABELS[irmao.empreendimento] ?? irmao.empreendimento;
      const atual = map.get(key);
      if (atual) {
        if (!atual.megas.includes(label)) atual.megas.push(label);
      } else {
        map.set(key, { key, escopo: e.escopo, item: e.item, megas: [label] });
      }
    });
    return Array.from(map.values());
  }, [data, contrato, escoposContrato]);

  const comSla = escoposContrato.filter((e) => e.sla_horas != null).length;
  const situacao = contrato ? SITUACAO_META[getSituacao(contrato)] : null;
  const diasParaVencer =
    contrato && !contrato.indeterminado && contrato.data_fim
      ? Math.floor((new Date(`${contrato.data_fim}T12:00:00`).getTime() - Date.now()) / 86400000)
      : null;

  const colunas: DataTableColumn<Escopo>[] = [
    { key: 'escopo', header: 'Escopo', cell: (e) => <span className="font-medium">{e.escopo}</span> },
    { key: 'item', header: 'Item', cell: (e) => e.item || '—' },
    { key: 'tipo', header: 'Tipo', cell: (e) => e.tipo || '—' },
    { key: 'freq', header: 'Frequência', cell: (e) => e.frequencia || '—' },
    {
      key: 'sla',
      header: 'SLA (h)',
      align: 'right',
      cell: (e) => (
        <SlaCell
          key={`${e.id}-${e.sla_horas ?? 'null'}`}
          escopo={e}
          editavel={editavel}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['contrato-detalhe', id] })}
        />
      ),
    },
    {
      key: 'obs',
      header: 'Observação',
      cell: (e) => <span className="text-muted-foreground">{e.observacao || '—'}</span>,
    },
  ];

  if (!isLoading && !contrato) {
    return (
      <PageContainer width="wide">
        <div className="rounded-lg border bg-card p-10 text-center space-y-3">
          <p className="ds-text-body text-muted-foreground">Contrato não encontrado.</p>
          <Button asChild variant="outline">
            <Link to="/contratos">Voltar para contratos</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/contratos">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Contratos
        </Link>
      </Button>

      <PageHeader
        title={contrato?.fornecedor_nome ?? 'Contrato'}
        description={
          contrato
            ? `${contrato.contrato_categorias?.nome ?? 'Categoria'} · ${
                EMPREENDIMENTO_LABELS[contrato.empreendimento] ?? contrato.empreendimento
              }${contrato.numero_contrato ? ` · Nº ${contrato.numero_contrato}` : ''}`
            : 'Carregando...'
        }
        icon={FileSignature}
        actions={
          situacao ? (
            <StatusPill intent={situacao.intent}>
              {situacao.label}
              {diasParaVencer != null && diasParaVencer >= 0 ? ` · ${diasParaVencer} dias` : ''}
            </StatusPill>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard label="Itens de escopo" value={escoposContrato.length} icon={ListChecks} loading={isLoading} />
        <KpiCard
          label="Com SLA definido"
          value={comSla}
          hint={escoposContrato.length ? `${Math.round((comSla / escoposContrato.length) * 100)}% preenchido` : undefined}
          icon={Timer}
          intent={comSla === escoposContrato.length && escoposContrato.length > 0 ? 'success' : 'warning'}
          loading={isLoading}
        />
        <KpiCard
          label="Lacunas x outros Megas"
          value={lacunas.length}
          icon={AlertTriangle}
          intent={lacunas.length > 0 ? 'warning' : 'success'}
          loading={isLoading}
        />
        <KpiCard
          label="Valor do contrato"
          value={moeda(contrato?.valor_contrato)}
          icon={FileSignature}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vigência</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Linha
                label="Início"
                value={contrato?.data_inicio ? formatBR(contrato.data_inicio, 'dd/MM/yyyy') : '—'}
              />
              <Linha label="Prazo" value={contrato?.prazo_meses ? `${contrato.prazo_meses} meses` : '—'} />
              <Linha
                label="Fim"
                value={
                  contrato?.indeterminado || !contrato?.data_fim
                    ? 'Indeterminado'
                    : formatBR(contrato.data_fim, 'dd/MM/yyyy')
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comercial</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Linha
                label="Quantidade"
                value={
                  contrato?.quantidade == null
                    ? '—'
                    : `${contrato.quantidade.toLocaleString('pt-BR')} ${contrato.unidade}`
                }
              />
              <Linha label="Valor do contrato" value={moeda(contrato?.valor_contrato)} />
              <Linha label="Valor por unidade" value={moeda(contrato?.valor_por_unidade)} />
              <Linha
                label="Reajuste"
                value={
                  contrato?.indice_reajuste
                    ? `${contrato.indice_reajuste}${contrato.mes_reajuste ? ` · ${contrato.mes_reajuste}` : ''}`
                    : '—'
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="ds-text-body text-muted-foreground whitespace-pre-wrap">
              {contrato?.observacao || 'Sem observações registradas.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <FilterToolbar
        showSearch
        searchPlaceholder="Buscar item de escopo..."
        searchValue={busca}
        onSearchChange={setBusca}
        filters={[
          {
            id: 'tipo',
            label: 'Tipo',
            type: 'select',
            value: tipo,
            onChange: setTipo,
            options: [{ value: 'todos', label: 'Todos os tipos' }, ...tipos.map((t) => ({ value: t, label: t }))],
          },
          {
            id: 'freq',
            label: 'Frequência',
            type: 'select',
            value: freq,
            onChange: setFreq,
            options: [
              { value: 'todas', label: 'Todas as frequências' },
              ...frequencias.map((f) => ({ value: f, label: f })),
            ],
          },
        ]}
        footer={
          <p className="ds-text-label">
            {editavel
              ? 'Você pode preencher o SLA (em horas) direto na tabela.'
              : 'Somente leitura — peça acesso de Editor para preencher o SLA.'}
          </p>
        }
        containerClassName="mb-4"
      />

      <DataTable
        columns={colunas}
        rows={filtrados}
        loading={isLoading}
        rowKey={(e) => e.id}
        density="compact"
        stickyHeader
        error={error ? 'Não foi possível carregar o escopo do contrato.' : undefined}
        empty={
          <div className="py-10 text-center ds-text-body text-muted-foreground">
            Nenhum item de escopo cadastrado para este contrato.
          </div>
        }
      />

      {lacunas.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cobertura entre Megas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="ds-text-body text-muted-foreground">
              Itens que outros Megas contemplam nesta categoria e este contrato não:
            </p>
            <ul className="space-y-1 text-sm">
              {lacunas.map((l) => (
                <li key={l.key} className="flex justify-between gap-3 border-b py-1 last:border-0">
                  <span>
                    <span className="font-medium">{l.escopo}</span>
                    {l.item ? ` · ${l.item}` : ''}
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap">{l.megas.join(', ')}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
