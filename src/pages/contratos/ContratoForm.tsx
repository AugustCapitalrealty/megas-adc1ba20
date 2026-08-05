import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSignature, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/hooks/useAuth';
import { EMPREENDIMENTO_LABELS, moeda } from '@/lib/contratos-utils';
import {
  MESES,
  FREQUENCIAS,
  INDICES_REAJUSTE,
  TIPOS_CONTRATACAO,
  calcularCriticidadeDD,
  criticidadeIntent,
  mesesEntre,
  calcularValorGlobal,
} from '@/lib/contratos-form';

const sel = (s: string): string => s;

const EMPREENDIMENTOS = ['mega_curitiba', 'mega_itajai', 'mega_esteio', 'mega_canoas'] as const;

interface EscopoPadraoRow {
  id: string;
  escopo: string;
  item: string | null;
  tipo: string | null;
  frequencia: string | null;
  ordem: number;
}

interface EscopoSel {
  selecionado: boolean;
  frequencia: string;
}

interface FormState {
  categoria_id: string;
  empreendimento: string;
  numero_contrato: string;
  fornecedor_nome: string;
  data_inicio: string;
  tipo_prazo: 'determinado' | 'indeterminado';
  data_fim: string;
  valor_mensal: string;
  data_dd: string;
  data_vencimento: string;
  renovacao_automatica: boolean;
  mes_reajuste: string;
  indice_reajuste: string;
  tipo_contratacao: string;
  tem_sla: boolean;
  area_atendida: string;
  detalhamento: string;
  observacao: string;
}

const VAZIO: FormState = {
  categoria_id: '',
  empreendimento: '',
  numero_contrato: '',
  fornecedor_nome: '',
  data_inicio: '',
  tipo_prazo: 'indeterminado',
  data_fim: '',
  valor_mensal: '',
  data_dd: '',
  data_vencimento: '',
  renovacao_automatica: false,
  mes_reajuste: '',
  indice_reajuste: '',
  tipo_contratacao: '',
  tem_sla: false,
  area_atendida: '',
  detalhamento: '',
  observacao: '',
};

const chaveEscopo = (escopo: string, item: string | null) => `${escopo}||${item ?? ''}`;

export default function ContratoForm() {
  const { id } = useParams<{ id: string }>();
  const edicao = Boolean(id);
  useDocumentTitle(edicao ? 'Editar contrato' : 'Novo contrato');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canApp } = useAuth();
  const podeEditar = canApp('contratos', 'editor');

  const [form, setForm] = useState<FormState>(VAZIO);
  const [escopoSel, setEscopoSel] = useState<Record<string, EscopoSel>>({});
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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

  const { data: escopoPadrao = [], isLoading: carregandoEscopo } = useQuery({
    queryKey: ['contrato-escopo-padrao', form.categoria_id],
    enabled: Boolean(form.categoria_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contrato_escopo_padrao')
        .select(sel('id, escopo, item, tipo, frequencia, ordem'))
        .eq('categoria_id', form.categoria_id)
        .eq('ativo', true)
        .order('ordem')
        .returns<EscopoPadraoRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  // Carrega o contrato em modo edição
  const { data: contratoExistente } = useQuery({
    queryKey: ['contrato-form', id],
    enabled: edicao,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select(sel('*, contrato_escopos(escopo, item, frequencia, ativo)'))
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
  });

  useEffect(() => {
    if (!contratoExistente) return;
    const c = contratoExistente as Record<string, any>;
    setForm({
      categoria_id: c.categoria_id ?? '',
      empreendimento: c.empreendimento ?? '',
      numero_contrato: c.numero_contrato ?? '',
      fornecedor_nome: c.fornecedor_nome ?? '',
      data_inicio: c.data_inicio ?? '',
      tipo_prazo: c.indeterminado ? 'indeterminado' : 'determinado',
      data_fim: c.data_fim ?? '',
      valor_mensal: c.valor_mensal != null ? String(c.valor_mensal) : '',
      data_dd: c.data_dd ?? '',
      data_vencimento: c.data_vencimento ?? '',
      renovacao_automatica: Boolean(c.renovacao_automatica),
      mes_reajuste: c.mes_reajuste ?? '',
      indice_reajuste: c.indice_reajuste ?? '',
      tipo_contratacao: c.tipo_contratacao ?? '',
      tem_sla: Boolean(c.tem_sla),
      area_atendida: c.area_atendida ?? '',
      detalhamento: c.detalhamento ?? '',
      observacao: c.observacao ?? '',
    });
    const mapa: Record<string, EscopoSel> = {};
    (c.contrato_escopos ?? [])
      .filter((e: any) => e.ativo !== false)
      .forEach((e: any) => {
        mapa[chaveEscopo(e.escopo, e.item)] = { selecionado: true, frequencia: e.frequencia ?? '' };
      });
    setEscopoSel(mapa);
  }, [contratoExistente]);

  const valorGlobal = useMemo(
    () =>
      calcularValorGlobal(
        Number(form.valor_mensal.replace(',', '.')) || 0,
        form.tipo_prazo,
        form.data_inicio,
        form.data_fim,
      ),
    [form.valor_mensal, form.tipo_prazo, form.data_inicio, form.data_fim],
  );

  const prazoMeses = useMemo(
    () =>
      form.tipo_prazo === 'determinado' ? mesesEntre(form.data_inicio, form.data_fim) : null,
    [form.tipo_prazo, form.data_inicio, form.data_fim],
  );

  const criticidade = useMemo(
    () => calcularCriticidadeDD(form.data_vencimento || null),
    [form.data_vencimento],
  );

  const totalSelecionado = Object.values(escopoSel).filter((v) => v.selecionado).length;

  const toggleItem = (row: EscopoPadraoRow) => {
    const k = chaveEscopo(row.escopo, row.item);
    setEscopoSel((prev) => ({
      ...prev,
      [k]: {
        selecionado: !prev[k]?.selecionado,
        frequencia: prev[k]?.frequencia || row.frequencia || '',
      },
    }));
  };

  const setFrequencia = (row: EscopoPadraoRow, frequencia: string) => {
    const k = chaveEscopo(row.escopo, row.item);
    setEscopoSel((prev) => ({ ...prev, [k]: { selecionado: true, frequencia } }));
  };

  const validar = () => {
    const e: Record<string, string> = {};
    if (!form.categoria_id) e.categoria_id = 'Selecione a categoria.';
    if (!form.empreendimento) e.empreendimento = 'Selecione o Mega.';
    if (!form.fornecedor_nome.trim()) e.fornecedor_nome = 'Informe a contratada.';
    if (!form.data_inicio) e.data_inicio = 'Informe a data de início.';
    if (form.tipo_prazo === 'determinado' && !form.data_fim) e.data_fim = 'Informe a data final.';
    if (form.tipo_prazo === 'determinado' && form.data_fim && form.data_fim < form.data_inicio) {
      e.data_fim = 'A data final deve ser posterior ao início.';
    }
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!podeEditar) {
      toast.error('Você não tem permissão para cadastrar contratos.');
      return;
    }
    if (!validar()) {
      toast.error('Revise os campos destacados.');
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        categoria_id: form.categoria_id,
        empreendimento: form.empreendimento,
        numero_contrato: form.numero_contrato.trim() || null,
        fornecedor_nome: form.fornecedor_nome.trim(),
        data_inicio: form.data_inicio,
        indeterminado: form.tipo_prazo === 'indeterminado',
        data_fim: form.tipo_prazo === 'determinado' ? form.data_fim : null,
        prazo_meses: prazoMeses,
        valor_mensal: form.valor_mensal ? Number(form.valor_mensal.replace(',', '.')) : null,
        valor_contrato: valorGlobal || null,
        data_dd: form.data_dd || null,
        data_vencimento: form.data_vencimento || null,
        criticidade_dd: criticidade,
        renovacao_automatica: form.renovacao_automatica,
        mes_reajuste: form.mes_reajuste || null,
        indice_reajuste: form.indice_reajuste || null,
        tipo_contratacao: form.tipo_contratacao || null,
        tem_sla: form.tem_sla,
        area_atendida: form.area_atendida.trim() || null,
        detalhamento: form.detalhamento.trim() || null,
        observacao: form.observacao.trim() || null,
      };

      let contratoId = id;
      if (edicao) {
        const { error } = await supabase.from('contratos').update(payload as never).eq('id', id!);
        if (error) throw error;
        const { error: delErr } = await supabase.from('contrato_escopos').delete().eq('contrato_id', id!);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await supabase
          .from('contratos')
          .insert(payload as never)
          .select('id')
          .single();
        if (error) throw error;
        contratoId = (data as { id: string }).id;
      }

      const linhas = escopoPadrao
        .filter((row) => escopoSel[chaveEscopo(row.escopo, row.item)]?.selecionado)
        .map((row, index) => ({
          contrato_id: contratoId!,
          escopo: row.escopo,
          item: row.item,
          tipo: row.tipo,
          frequencia: escopoSel[chaveEscopo(row.escopo, row.item)]?.frequencia || row.frequencia,
          ordem: index,
        }));

      if (linhas.length > 0) {
        const { error } = await supabase.from('contrato_escopos').insert(linhas as never);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['contratos-lista'] });
      queryClient.invalidateQueries({ queryKey: ['contrato-detalhe'] });
      toast.success(edicao ? 'Contrato atualizado.' : 'Contrato cadastrado.');
      navigate(`/contratos/${contratoId}`);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível salvar o contrato.');
    } finally {
      setSalvando(false);
    }
  };

  const campo = (key: string) =>
    erros[key] ? <p className="text-xs text-destructive mt-1">{erros[key]}</p> : null;

  return (
    <PageContainer width="wide">
      <PageHeader
        title={edicao ? 'Editar contrato' : 'Novo contrato'}
        description="Cadastro completo do contrato de prestação de serviços: vigência, comercial, due diligence e escopo."
        icon={FileSignature}
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Disciplina / categoria *</Label>
              <Select value={form.categoria_id} onValueChange={(v) => set('categoria_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {campo('categoria_id')}
            </div>
            <div>
              <Label>Empreendimento *</Label>
              <Select value={form.empreendimento} onValueChange={(v) => set('empreendimento', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {EMPREENDIMENTOS.map((e) => (
                    <SelectItem key={e} value={e}>{EMPREENDIMENTO_LABELS[e] ?? e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {campo('empreendimento')}
            </div>
            <div>
              <Label>Nº do contrato</Label>
              <Input
                className="mt-1"
                value={form.numero_contrato}
                onChange={(e) => set('numero_contrato', e.target.value)}
                placeholder="0009.2018"
              />
            </div>
            <div>
              <Label>Contratada *</Label>
              <Input
                className="mt-1"
                value={form.fornecedor_nome}
                onChange={(e) => set('fornecedor_nome', e.target.value)}
                placeholder="Razão social do fornecedor"
              />
              {campo('fornecedor_nome')}
            </div>
            <div className="sm:col-span-2">
              <Label>Área atendida</Label>
              <Input
                className="mt-1"
                value={form.area_atendida}
                onChange={(e) => set('area_atendida', e.target.value)}
                placeholder="Ex.: armazém, área comum, prédios de apoio"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vigência e valores</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Data de início *</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.data_inicio}
                onChange={(e) => set('data_inicio', e.target.value)}
              />
              {campo('data_inicio')}
            </div>
            <div>
              <Label>Prazo</Label>
              <Select
                value={form.tipo_prazo}
                onValueChange={(v) => set('tipo_prazo', v as FormState['tipo_prazo'])}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indeterminado">Indeterminado</SelectItem>
                  <SelectItem value="determinado">Determinado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.tipo_prazo === 'determinado' && (
              <div>
                <Label>Data final *</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.data_fim}
                  onChange={(e) => set('data_fim', e.target.value)}
                />
                {campo('data_fim')}
                {prazoMeses ? (
                  <p className="text-xs text-muted-foreground mt-1">{prazoMeses} meses de vigência</p>
                ) : null}
              </div>
            )}
            <div>
              <Label>Valor mensal (R$)</Label>
              <Input
                className="mt-1"
                inputMode="decimal"
                value={form.valor_mensal}
                onChange={(e) => set('valor_mensal', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Valor global (calculado)</Label>
              <Input className="mt-1 bg-muted" readOnly value={moeda(valorGlobal || null)} />
              <p className="text-xs text-muted-foreground mt-1">
                {form.tipo_prazo === 'indeterminado'
                  ? 'Indeterminado: valor mensal × 12.'
                  : 'Determinado: valor mensal × meses de vigência.'}
              </p>
            </div>
            <div>
              <Label>Índice de reajuste</Label>
              <Select value={form.indice_reajuste} onValueChange={(v) => set('indice_reajuste', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {INDICES_REAJUSTE.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mês de reajuste</Label>
              <Select value={form.mes_reajuste} onValueChange={(v) => set('mes_reajuste', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de contratação</Label>
              <Select value={form.tipo_contratacao} onValueChange={(v) => set('tipo_contratacao', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_CONTRATACAO.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="cursor-pointer">Renovação automática</Label>
                <p className="text-xs text-muted-foreground">Renova sem novo processo.</p>
              </div>
              <Switch
                checked={form.renovacao_automatica}
                onCheckedChange={(v) => set('renovacao_automatica', v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="cursor-pointer">Possui nível de serviço (SLA)</Label>
                <p className="text-xs text-muted-foreground">Contrato com SLA formalizado.</p>
              </div>
              <Switch checked={form.tem_sla} onCheckedChange={(v) => set('tem_sla', v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Due diligence</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Data DD</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.data_dd}
                onChange={(e) => set('data_dd', e.target.value)}
              />
            </div>
            <div>
              <Label>Data de vencimento</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.data_vencimento}
                onChange={(e) => set('data_vencimento', e.target.value)}
              />
            </div>
            <div>
              <Label>Criticidade DD (calculada)</Label>
              <div className="mt-2">
                <Badge variant={criticidadeIntent(criticidade)}>{criticidade}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Vencida = Pendente · até 30 dias = Alta · até 90 dias = Média.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Escopo do contrato</CardTitle>
            <Badge variant="secondary">{totalSelecionado} selecionados</Badge>
          </CardHeader>
          <CardContent>
            {!form.categoria_id ? (
              <p className="text-sm text-muted-foreground">
                Selecione a disciplina para carregar os itens de escopo padrão.
              </p>
            ) : carregandoEscopo ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando escopo...
              </div>
            ) : escopoPadrao.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Esta disciplina ainda não tem escopo padrão cadastrado. Os itens podem ser levantados
                com o fornecedor e incluídos depois.
              </p>
            ) : (
              <div className="max-h-[28rem] overflow-y-auto rounded-md border divide-y">
                {escopoPadrao.map((row) => {
                  const k = chaveEscopo(row.escopo, row.item);
                  const s = escopoSel[k];
                  return (
                    <div key={row.id} className="flex items-start gap-3 p-3">
                      <Checkbox
                        checked={s?.selecionado ?? false}
                        onCheckedChange={() => toggleItem(row)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{row.escopo}</p>
                        <p className="text-xs text-muted-foreground">
                          {[row.item, row.tipo].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      <Select
                        value={s?.frequencia || row.frequencia || ''}
                        onValueChange={(v) => setFrequencia(row, v)}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue placeholder="Frequência" />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCIAS.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Detalhamento do contrato</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={form.detalhamento}
                onChange={(e) => set('detalhamento', e.target.value)}
              />
            </div>
            <div>
              <Label>Observações internas</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={form.observacao}
                onChange={(e) => set('observacao', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-2 pb-10">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || !podeEditar}>
            {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {edicao ? 'Salvar alterações' : 'Cadastrar contrato'}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
