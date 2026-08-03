import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, Layers, ListChecks } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { FilterToolbar } from '@/components/ui/FilterToolbar';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
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

interface ContratoGerador {
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
  valor_por_unidade: number | null;
  indice_reajuste: string | null;
  mes_reajuste: string | null;
}

export function GeradorPanel() {
  const [contratoId, setContratoId] = useState<string | null>(null);
  const [modo, setModo] = useState<'contrato' | 'comparar'>('contrato');
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [freq, setFreq] = useState('todas');

  const { data, isLoading, error } = useQuery({
    queryKey: ['contratos-gerador'],
    queryFn: async () => {
      const { data: cat, error: catErr } = await supabase
        .from('contrato_categorias')
        .select(sel('id, nome'))
        .eq('nome', 'GERADOR')
        .maybeSingle<{ id: string; nome: string }>();
      if (catErr) throw catErr;
      if (!cat) return { contratos: [] as ContratoGerador[], escopos: [] as Escopo[] };

      const { data: contratos, error: cErr } = await supabase
        .from('contratos')
        .select(
          sel(
            'id, empreendimento, fornecedor_nome, numero_contrato, data_inicio, data_fim, indeterminado, quantidade, unidade, valor_contrato, valor_por_unidade, indice_reajuste, mes_reajuste',
          ),
        )
        .eq('categoria_id', cat.id)
        .order('empreendimento')
        .returns<ContratoGerador[]>();
      if (cErr) throw cErr;

      const ids = (contratos ?? []).map((c) => c.id);
      if (ids.length === 0) return { contratos: contratos ?? [], escopos: [] as Escopo[] };

      const { data: escopos, error: eErr } = await supabase
        .from('contrato_escopos')
        .select(sel('id, contrato_id, escopo, item, tipo, frequencia, observacao, sla_horas, ordem'))
        .in('contrato_id', ids)
        .eq('ativo', true)
        .order('ordem')
        .returns<Escopo[]>();
      if (eErr) throw eErr;

      return { contratos: contratos ?? [], escopos: escopos ?? [] };
    },
  });

  const contratos = data?.contratos ?? [];
  const escopos = data?.escopos ?? [];

  useEffect(() => {
    if (!contratoId && contratos.length > 0) setContratoId(contratos[0].id);
  }, [contratos, contratoId]);

  const kpis = useMemo(() => {
    const acc = { vigente: 0, a_vencer: 0, vencido: 0, indeterminado: 0 };
    contratos.forEach((c) => {
      acc[getSituacao(c)] += 1;
    });
    return {
      ...acc,
      equipamentos: contratos.reduce((s, c) => s + (c.quantidade ?? 0), 0),
      itens: escopos.length,
    };
  }, [contratos, escopos]);

  const tipos = useMemo(
    () => Array.from(new Set(escopos.map((e) => e.tipo).filter(Boolean) as string[])).sort(),
    [escopos],
  );
  const frequencias = useMemo(
    () => Array.from(new Set(escopos.map((e) => e.frequencia).filter(Boolean) as string[])).sort(),
    [escopos],
  );

  const aplicaFiltros = (e: { escopo: string; item: string | null; tipo: string | null; frequencia: string | null }) => {
    if (tipo !== 'todos' && e.tipo !== tipo) return false;
    if (freq !== 'todas' && e.frequencia !== freq) return false;
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return [e.escopo, e.item ?? '', e.tipo ?? '', e.frequencia ?? ''].join(' ').toLowerCase().includes(termo);
  };

  const escoposDoContrato = useMemo(
    () => escopos.filter((e) => e.contrato_id === contratoId).filter(aplicaFiltros),
    [escopos, contratoId, busca, tipo, freq],
  );

  // Comparativo: linha única por escopo+item, coluna por contrato
  const comparativo = useMemo(() => {
    const map = new Map<
      string,
      { key: string; escopo: string; item: string | null; tipo: string | null; frequencia: string | null; megas: Set<string> }
    >();
    escopos.forEach((e) => {
      const contrato = contratos.find((c) => c.id === e.contrato_id);
      if (!contrato) return;
      const key = `${e.escopo}|${e.item ?? ''}`;
      const atual = map.get(key);
      if (atual) atual.megas.add(contrato.id);
      else
        map.set(key, {
          key,
          escopo: e.escopo,
          item: e.item,
          tipo: e.tipo,
          frequencia: e.frequencia,
          megas: new Set([contrato.id]),
        });
    });
    return Array.from(map.values()).filter(aplicaFiltros);
  }, [escopos, contratos, busca, tipo, freq]);

  const colunasEscopo: DataTableColumn<Escopo>[] = [
    { key: 'escopo', header: 'Escopo', cell: (e) => <span className="font-medium">{e.escopo}</span> },
    { key: 'item', header: 'Item', cell: (e) => e.item || '—' },
    { key: 'tipo', header: 'Tipo', cell: (e) => e.tipo || '—' },
    { key: 'freq', header: 'Frequência', cell: (e) => e.frequencia || '—' },
    {
      key: 'sla',
      header: 'SLA',
      align: 'right',
      cell: (e) => (e.sla_horas == null ? '—' : `${e.sla_horas}h`),
    },
    {
      key: 'obs',
      header: 'Observação',
      cell: (e) => <span className="text-muted-foreground">{e.observacao || '—'}</span>,
    },
  ];

  const colunasComparativo: DataTableColumn<(typeof comparativo)[number]>[] = [
    { key: 'escopo', header: 'Escopo', cell: (r) => <span className="font-medium">{r.escopo}</span> },
    { key: 'item', header: 'Item', cell: (r) => r.item || '—' },
    { key: 'tipo', header: 'Tipo', cell: (r) => r.tipo || '—' },
    { key: 'freq', header: 'Frequência', cell: (r) => r.frequencia || '—' },
    ...contratos.map((c) => ({
      key: c.id,
      header: EMPREENDIMENTO_LABELS[c.empreendimento] ?? c.empreendimento,
      align: 'center' as const,
      cell: (r: (typeof comparativo)[number]) =>
        r.megas.has(c.id) ? (
          <StatusPill intent="success" size="sm">
            Contempla
          </StatusPill>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Contratos" value={contratos.length} icon={Layers} loading={isLoading} />
        <KpiCard label="Vigentes" value={kpis.vigente} icon={Zap} intent="success" loading={isLoading} />
        <KpiCard label="Geradores cobertos" value={kpis.equipamentos} icon={Zap} intent="info" loading={isLoading} />
        <KpiCard label="Itens de escopo" value={kpis.itens} icon={ListChecks} loading={isLoading} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {contratos.map((c) => {
          const meta = SITUACAO_META[getSituacao(c)];
          const ativo = c.id === contratoId && modo === 'contrato';
          const total = escopos.filter((e) => e.contrato_id === c.id).length;
          return (
            <Card
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setContratoId(c.id);
                setModo('contrato');
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  setContratoId(c.id);
                  setModo('contrato');
                }
              }}
              className={cn(
                'cursor-pointer transition-colors',
                ativo ? 'border-primary ring-1 ring-primary/40' : 'hover:border-primary/40',
              )}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="ds-text-label text-muted-foreground">
                      {EMPREENDIMENTO_LABELS[c.empreendimento] ?? c.empreendimento}
                    </p>
                    <p className="font-semibold truncate">{c.fornecedor_nome}</p>
                  </div>
                  <StatusPill intent={meta.intent} size="sm">
                    {meta.label}
                  </StatusPill>
                </div>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Nº contrato</dt>
                    <dd>{c.numero_contrato || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Vigência</dt>
                    <dd className="text-right">
                      {c.data_inicio ? formatBR(c.data_inicio, 'dd/MM/yyyy') : '—'} →{' '}
                      {c.indeterminado || !c.data_fim ? 'indeterminado' : formatBR(c.data_fim, 'dd/MM/yyyy')}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Quantidade</dt>
                    <dd>{c.quantidade == null ? '—' : `${c.quantidade.toLocaleString('pt-BR')} ${c.unidade}`}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Valor</dt>
                    <dd className="tabular-nums">{moeda(c.valor_contrato)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Por equipamento</dt>
                    <dd className="tabular-nums">{moeda(c.valor_por_unidade)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Reajuste</dt>
                    <dd>
                      {c.indice_reajuste ? `${c.indice_reajuste}${c.mes_reajuste ? ` · ${c.mes_reajuste}` : ''}` : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Itens de escopo</dt>
                    <dd>{total}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          );
        })}
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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={modo === 'contrato' ? 'default' : 'outline'}
              onClick={() => setModo('contrato')}
            >
              Por contrato
            </Button>
            <Button
              size="sm"
              variant={modo === 'comparar' ? 'default' : 'outline'}
              onClick={() => setModo('comparar')}
            >
              Comparar Megas
            </Button>
          </div>
        }
      />

      {modo === 'contrato' ? (
        <DataTable
          columns={colunasEscopo}
          rows={escoposDoContrato}
          loading={isLoading}
          rowKey={(e) => e.id}
          density="compact"
          stickyHeader
          error={error ? 'Não foi possível carregar o escopo.' : undefined}
          empty={
            <div className="py-10 text-center ds-text-body text-muted-foreground">
              Nenhum item de escopo para este contrato.
            </div>
          }
        />
      ) : (
        <DataTable
          columns={colunasComparativo}
          rows={comparativo}
          loading={isLoading}
          rowKey={(r) => r.key}
          density="compact"
          stickyHeader
          error={error ? 'Não foi possível carregar o escopo.' : undefined}
          empty={
            <div className="py-10 text-center ds-text-body text-muted-foreground">
              Nenhum item de escopo encontrado.
            </div>
          }
        />
      )}
    </div>
  );
}
