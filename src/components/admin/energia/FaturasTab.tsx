import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Search, Download, FileText, Zap, Building2, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import {
  calcularMemoria,
  agruparPorCliente,
  redistribuirAreaComumPorArea,
  type EnergiaTarifas,
  type EnergiaLancamentoInput,
  type FaturaCliente,
  type MemoriaLinha,
  type ModoRateioPerdas,
} from '@/lib/energia-rateio';
import { useSharedCompetencia } from './CompetenciaContext';
import { resolverPeriodosPorModulo, type PeriodoModulo, type VigenciaRaw } from '@/lib/energia-vigencias';

interface Competencia { id: string; ano_mes: string; status: 'rascunho' | 'fechada'; }
interface Modulo { id: string; identificador: string; area_m2: number; ordem: number; cliente_id: string | null; demanda_contratada_kw: number; }
interface Cliente { id: string; nome: string; razao_social: string | null; }

const brl = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const num = (n: number, dec = 2) => (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const parseBRNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value ?? '').trim();
  if (!text) return 0;
  const cleaned = text.replace(/[^\d.,-]/g, '');
  if (cleaned.includes(',')) return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(cleaned.replace(/\./g, '')) || 0;
};

const BANDEIRA_TARIFA_OFICIAL: Record<string, number> = {
  verde: 0,
  amarela: 2.5464,
  vermelha_1: 4.463,
  vermelha_2: 7.877,
};

function detectarBandeiraVigente(itens: Record<string, any> = {}) {
  if (parseBRNumber(itens.bandeira_vermelha_2_ponta?.valor) > 0 || parseBRNumber(itens.bandeira_vermelha_2_fora?.valor) > 0) return 'vermelha_2';
  if (parseBRNumber(itens.bandeira_vermelha_1_ponta?.valor) > 0 || parseBRNumber(itens.bandeira_vermelha_1_fora?.valor) > 0) return 'vermelha_1';
  if (parseBRNumber(itens.bandeira_amarela_ponta?.valor) > 0 || parseBRNumber(itens.bandeira_amarela_fora?.valor) > 0) return 'amarela';
  return 'verde';
}

function resolveBandeiraValor(tarifas: any): number {
  const faturaItens = tarifas?.fatura_copel_itens || {};
  const modo = (faturaItens.bandeira_modo as string | undefined) || 'oficial';
  if (modo !== 'oficial') return Number(tarifas?.bandeira_valor) || 0;
  const vigente = (faturaItens.bandeira_vigente as string | undefined) || detectarBandeiraVigente(faturaItens.itens || {});
  return parseBRNumber(faturaItens.bandeira_tarifa_oficial) || BANDEIRA_TARIFA_OFICIAL[vigente] || Number(tarifas?.bandeira_valor) || 0;
}

export function FaturasTab() {
  const [loading, setLoading] = useState(true);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const { currentCompId, setCurrentCompId, version } = useSharedCompetencia();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tarifas, setTarifas] = useState<any>(null);
  const [lancamentos, setLancamentos] = useState<Record<string, any>>({});
  const [vinculos, setVinculos] = useState<VigenciaRaw[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [modoPerdas, setModoPerdas] = useState<ModoRateioPerdas>('combinado');
  const [ratearAreaComum, setRatearAreaComum] = useState<boolean>(true);

  const fetchBase = useCallback(async () => {
    const [c, m, cli] = await Promise.all([
      supabase.from('energia_competencias').select('id, ano_mes, status').order('ano_mes', { ascending: false }),
      supabase.from('energia_modulos').select('*').eq('ativo', true).order('ordem'),
      supabase.from('energia_clientes').select('id, nome, razao_social'),
    ]);
    if (c.data) setCompetencias(c.data as any);
    if (m.data) setModulos(m.data as any);
    if (cli.data) setClientes(cli.data as any);
  }, []);

  const fetchCompData = useCallback(async (compId: string, anoMes: string) => {
    const [t, l] = await Promise.all([
      supabase.from('energia_competencia_tarifas').select('*').eq('competencia_id', compId).maybeSingle(),
      supabase.from('energia_competencia_lancamentos').select('*').eq('competencia_id', compId),
    ]);
    setTarifas(t.data || null);
    const map: Record<string, any> = {};
    ((l.data as any[]) || []).forEach((r) => { map[r.modulo_id] = r; });
    setLancamentos(map);

    // Todas as vigências que tocam o mês (um módulo pode trocar de cliente no meio).
    const [yy, mm] = anoMes.split('-').map(Number);
    const refFim = `${anoMes}-${String(new Date(yy, mm, 0).getDate()).padStart(2, '0')}`;
    const { data: vinc } = await supabase
      .from('energia_contrato_modulos' as any)
      .select('modulo_id, vigencia_inicio, vigencia_fim, contrato_id, contrato:energia_contratos!inner(id, numero_contrato, demanda_contratada_kw, cliente_id, ativo)')
      .lte('vigencia_inicio', refFim);
    setVinculos(((vinc as any[]) || []) as VigenciaRaw[]);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await fetchBase(); setLoading(false); })(); }, [fetchBase, version]);
  useEffect(() => { if (competencias.length && !currentCompId) setCurrentCompId(competencias[0].id); }, [competencias, currentCompId]);
  useEffect(() => {
    if (currentCompId) {
      setSelecionado(null);
      const comp = competencias.find((c) => c.id === currentCompId);
      if (comp) fetchCompData(currentCompId, comp.ano_mes);
    }
  }, [currentCompId, competencias, fetchCompData]);

  const currentComp = competencias.find((c) => c.id === currentCompId) || null;

  const { faturas, memoriaLinhas } = useMemo<{ faturas: FaturaCliente[]; memoriaLinhas: MemoriaLinha[] }>(() => {
    if (!tarifas) return { faturas: [], memoriaLinhas: [] };
    // Fonte de verdade: módulos COM lançamento nesta competência. Para cada um,
    // o cliente é o do contrato vigente (não o cliente atual do módulo).
    const modulosComLanc = modulos.filter((m) => !!lancamentos[m.id]);
    const inputs: EnergiaLancamentoInput[] = modulosComLanc.map((m) => {
      const l = lancamentos[m.id];
      const cid = contratoIdPorModulo[m.id];
      const cliId = cid ? contratoClientePorId[cid] : null;
      const cli = clientes.find((c) => c.id === cliId);
      return {
        modulo_id: m.id,
        identificador: m.identificador,
        cliente_nome: cli?.razao_social || cli?.nome || (cliId ? '—' : 'VAGO'),
        area_m2: m.area_m2,
        demanda_contratada_kw: contratoPorModulo[m.id]?.demanda_contratada_kw ?? 0,
        demanda_usd_medida_kw: l?.demanda_usd_medida_kw ?? 0,
        consumo_ponta_kwh: l?.consumo_ponta_kwh ?? 0,
        consumo_fora_kwh: l?.consumo_fora_kwh ?? 0,
        ajuste_manual_reais: l?.ajuste_manual_reais ?? 0,
        is_area_comum: m.identificador.toUpperCase().includes('ÁREA COMUM') || m.identificador.toUpperCase().includes('AREA COMUM'),
      };
    });
    // Deriva perdas Copel em tempo de cálculo (consumo Copel − Σ lançamentos),
    // sem depender do valor persistido em energia_competencia_tarifas. Assim
    // diferenças negativas (Copel mediu menos que clientes) sempre entram no
    // rateio, mesmo que o usuário não tenha re-salvado a Fatura Copel.
    const somaPontaLanc = inputs.reduce((s, i) => s + (i.consumo_ponta_kwh || 0), 0);
    const somaForaLanc = inputs.reduce((s, i) => s + (i.consumo_fora_kwh || 0), 0);
    const copelPontaKwh = Number((tarifas as any).copel_consumo_ponta_kwh) || 0;
    const copelForaKwh = Number((tarifas as any).copel_consumo_fora_kwh) || 0;
    const tarifasComPerdas: EnergiaTarifas = {
      ...(tarifas as EnergiaTarifas),
      perdas_copel_ponta_kwh: copelPontaKwh - somaPontaLanc,
      perdas_copel_fora_kwh: copelForaKwh - somaForaLanc,
      bandeira_valor: resolveBandeiraValor(tarifas),
    };
    const memoria = calcularMemoria(tarifasComPerdas, inputs, modoPerdas);
    let fts = agruparPorCliente(
      memoria.linhas,
      modulosComLanc.map((m) => {
        const cid = contratoIdPorModulo[m.id] ?? null;
        const cliId = cid ? (contratoClientePorId[cid] ?? null) : null;
        return {
          id: m.id,
          cliente_id: cliId,
          identificador: m.identificador,
          contrato_id: cid,
          contrato_numero: cid ? (contratoNumeroPorId[cid] || null) : null,
        };
      }),
    );
    // Replica RESUMO da planilha: valor líquido da Área Comum vai para os
    // clientes proporcional à área locada (m²).
    if (ratearAreaComum) fts = redistribuirAreaComumPorArea(fts);
    return { faturas: fts, memoriaLinhas: memoria.linhas };
  }, [tarifas, modulos, lancamentos, clientes, contratoPorModulo, contratoIdPorModulo, contratoNumeroPorId, contratoClientePorId, modoPerdas, ratearAreaComum]);

  const faturasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return faturas;
    return faturas.filter((f) =>
      f.cliente_nome.toLowerCase().includes(q) ||
      (f.contrato_numero || '').toLowerCase().includes(q),
    );
  }, [faturas, busca]);

  useEffect(() => {
    if (!selecionado && faturas.length > 0) setSelecionado(faturas[0].cliente_key);
  }, [faturas, selecionado]);

  // Recalcula totais por cliente usando a MESMA lógica da Fatura Oficial,
  // para que os KPIs e o sidebar batam com o valor que cada cliente realmente paga.
  const linhasPorFatura = useCallback((f: FaturaCliente): MemoriaLinha[] => {
    return memoriaLinhas.filter((l) => {
      const m = modulos.find((mm) => mm.id === l.modulo_id);
      if (!m) return false;
      if (f.cliente_key === 'AREA_COMUM') {
        return (l.identificador || '').toUpperCase().includes('AREA COMUM')
          || (l.identificador || '').toUpperCase().includes('ÁREA COMUM');
      }
      if (f.cliente_key.startsWith('VAGO:')) {
        return l.modulo_id === f.cliente_key.slice(5);
      }
      const idx = f.cliente_key.indexOf('::');
      const cli = idx >= 0 ? f.cliente_key.slice(0, idx) : f.cliente_key;
      const contrato = idx >= 0 ? f.cliente_key.slice(idx + 2) : null;
      const mCid = contratoIdPorModulo[m.id] ?? 'SEM';
      const mCliId = mCid !== 'SEM' ? (contratoClientePorId[mCid] ?? null) : null;
      if (mCliId !== cli) return false;
      return mCid === contrato;
    });
  }, [memoriaLinhas, modulos, contratoIdPorModulo, contratoClientePorId]);

  const totaisPorFatura = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calcularTotalCliente>>();
    if (!tarifas) return map;
    for (const f of faturas) {
      const linhasF = linhasPorFatura(f);
      const demContrato = f.contrato_id ? (contratoDemandaPorId[f.contrato_id] || 0) : 0;
      map.set(f.cliente_key, calcularTotalCliente(linhasF, tarifas as EnergiaTarifas, demContrato));
    }
    return map;
  }, [faturas, tarifas, linhasPorFatura, contratoDemandaPorId]);

  const totalGeral = Array.from(totaisPorFatura.values()).reduce((s, t) => s + t.total, 0);
  const totalUltrapassagem = Array.from(totaisPorFatura.values()).reduce((s, t) => s + t.rsUltrapassagem, 0);
  const totalCredito = Array.from(totaisPorFatura.values()).reduce((s, t) => s + t.credito, 0);
  const totalCopel = Number(tarifas?.copel_valor_total) || 0;
  const diferenca = totalGeral - totalCopel;
  const diferencaResidual = diferenca - totalUltrapassagem - totalCredito;

  // Lista de clientes que pagaram multa (ultrapassagem) nesta competência.
  const faturasComMulta = useMemo(() => {
    return faturas
      .map((f) => {
        const t = totaisPorFatura.get(f.cliente_key);
        const multa = t?.rsUltrapassagem ?? 0;
        const demandaContratada = f.contrato_id ? (contratoDemandaPorId[f.contrato_id] || 0) : 0;
        const demandaMedida = f.demanda_usd;
        const ultrapassagemKw = Math.max(0, demandaMedida - demandaContratada);
        return { f, multa, demandaContratada, demandaMedida, ultrapassagemKw };
      })
      .filter((x) => x.multa > 0.005)
      .sort((a, b) => b.multa - a.multa);
  }, [faturas, totaisPorFatura, contratoDemandaPorId]);
  const totalUltrapassagemKw = faturasComMulta.reduce((s, x) => s + x.ultrapassagemKw, 0);

  const faturaSelecionada = faturas.find((f) => f.cliente_key === selecionado) || null;

  // Quantos contratos cada cliente tem (para decidir mostrar o nº do contrato no sidebar)
  const contratosPorCliente = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of faturas) {
      const idx = f.cliente_key.indexOf('::');
      if (idx < 0) continue;
      const cli = f.cliente_key.slice(0, idx);
      m.set(cli, (m.get(cli) || 0) + 1);
    }
    return m;
  }, [faturas]);

  const copiarResumo = () => {
    if (!faturaSelecionada || !currentComp) return;
    const f = faturaSelecionada;
    const tot = totaisPorFatura.get(f.cliente_key)?.total ?? f.total_fatura_energy;
    const txt = [
      `Fatura ${f.cliente_nome}${f.contrato_numero ? ` — Contrato ${f.contrato_numero}` : ''} — ${currentComp.ano_mes}`,
      `Módulos: ${f.modulos.join(', ')}`,
      `Demanda USD: ${num(f.demanda_usd)} kW`,
      `Consumo Ponta: ${num(f.consumo_ponta)} kWh`,
      `Consumo Fora: ${num(f.consumo_fora)} kWh`,
      `Demanda R$: ${brl(f.rs_demanda_total)}`,
      `Consumo R$: ${brl(f.rs_consumo_total + f.rs_perdas)}`,
      `Tributos R$: ${brl(f.icms_total + f.piscof_total + f.iluminacao_publica + f.bandeira_total)}`,
      `Fotovoltaico R$: ${brl(f.fotovoltaico)}`,
      `TOTAL: ${brl(tot)}`,
    ].join('\n');
    navigator.clipboard.writeText(txt);
    toast.success('Resumo copiado');
  };

  const exportCSV = () => {
    if (!currentComp || faturas.length === 0) return;
    const headers = ['Cliente', 'Contrato', 'Módulos', 'Área m²', 'Demanda kW', 'Cons. Ponta', 'Cons. Fora', 'Cons. Total', 'R$ Demanda', 'R$ Consumo', 'R$ Tributos', 'Fotovolt.', 'TOTAL'];
    const rows = faturas.map((f) => [
      f.cliente_nome,
      f.contrato_numero || '',
      f.modulos.join(' | '),
      f.area_m2.toFixed(2),
      f.demanda_usd.toFixed(2),
      f.consumo_ponta.toFixed(2),
      f.consumo_fora.toFixed(2),
      f.consumo_total.toFixed(2),
      f.rs_demanda_total.toFixed(2),
      (f.rs_consumo_total + f.rs_perdas).toFixed(2),
      (f.icms_total + f.piscof_total + f.iluminacao_publica + f.bandeira_total).toFixed(2),
      f.fotovoltaico.toFixed(2),
      (totaisPorFatura.get(f.cliente_key)?.total ?? f.total_fatura_energy).toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `faturas-${currentComp.ano_mes}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header com seletor + KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Faturas por Cliente
          </CardTitle>
          <CardDescription>
            Visualize quanto cada cliente vai pagar nesta competência, com base na Fatura Copel e nos lançamentos de consumo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Button variant="outline" onClick={exportCSV} disabled={faturas.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground">Modo de rateio de perdas</Label>
              <div className="inline-flex rounded-md border overflow-hidden text-xs h-10" role="group" aria-label="Modo de rateio de perdas">
                <button
                  type="button"
                  onClick={() => setModoPerdas('separado')}
                  className={`px-3 transition-colors ${modoPerdas === 'separado' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-background hover:bg-muted'}`}
                  title="Rateia perdas Ponta apenas pelo consumo Ponta e Fora apenas pelo Fora. Mais exato."
                >
                  Exato (por posto)
                </button>
                <button
                  type="button"
                  onClick={() => setModoPerdas('combinado')}
                  className={`px-3 border-l transition-colors ${modoPerdas === 'combinado' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-background hover:bg-muted'}`}
                  title="Replica a planilha: ratio único (consumo total / Σ total) aplicado às perdas dos dois postos."
                >
                  Planilha (combinado)
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground">Área Comum</Label>
              <div className="inline-flex rounded-md border overflow-hidden text-xs h-10" role="group" aria-label="Rateio da área comum">
                <button
                  type="button"
                  onClick={() => setRatearAreaComum(true)}
                  className={`px-3 transition-colors ${ratearAreaComum ? 'bg-primary text-primary-foreground font-semibold' : 'bg-background hover:bg-muted'}`}
                  title="Replica a planilha (RESUMO): valor líquido da Área Comum é rateado nos clientes por m²."
                >
                  Ratear por m²
                </button>
                <button
                  type="button"
                  onClick={() => setRatearAreaComum(false)}
                  className={`px-3 border-l transition-colors ${!ratearAreaComum ? 'bg-primary text-primary-foreground font-semibold' : 'bg-background hover:bg-muted'}`}
                  title="Mantém Área Comum como cliente separado."
                >
                  Separada
                </button>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid gap-3 md:grid-cols-4">
            <KpiCard label="Total faturado" value={brl(totalGeral)} icon={FileText} tone="primary" />
            <KpiCard label="Clientes" value={String(faturas.length)} icon={Users} />
            <KpiCard label="Fatura Copel" value={brl(totalCopel)} icon={Zap} />
            <KpiCard
              label="Diferença"
              value={brl(Math.abs(diferenca))}
              icon={Building2}
              tone={Math.abs(diferenca) < 1 ? 'green' : Math.abs(diferenca) < 50 ? 'amber' : 'red'}
              suffix={diferenca >= 0 ? 'a maior' : 'a menor'}
            />
          </div>

          {/* Diferenças — Copel × Faturado */}
          {faturas.length > 0 && (
            <details className="rounded-md border bg-muted/30 group" open={Math.abs(diferencaResidual) >= 1}>
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold hover:bg-muted/60 transition flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Diferenças Copel × Faturado
                <span className={`ml-auto text-xs font-normal ${Math.abs(diferencaResidual) < 1 ? 'text-green-600' : Math.abs(diferencaResidual) < 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  residual: {brl(diferencaResidual)}
                </span>
              </summary>
              <div className="p-4 space-y-4">
                {/* PASSO 1 — Diferença bruta = Faturado − Copel */}
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Passo 1 · Diferença bruta = Σ Faturas dos clientes − Total Fatura Copel
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <div className="text-[10px] uppercase text-muted-foreground">Σ Faturas clientes</div>
                      <div className="text-base font-bold tabular-nums">{brl(totalGeral)}</div>
                    </div>
                    <div className="text-xl font-bold text-muted-foreground text-center">−</div>
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <div className="text-[10px] uppercase text-muted-foreground">Total Fatura Copel</div>
                      <div className="text-base font-bold tabular-nums">{brl(totalCopel)}</div>
                    </div>
                    <div className="text-xl font-bold text-muted-foreground text-center">=</div>
                    <div className="rounded-md bg-primary/10 border border-primary/30 px-3 py-2">
                      <div className="text-[10px] uppercase text-primary">Diferença bruta</div>
                      <div className="text-base font-bold tabular-nums text-primary">{brl(diferenca)}</div>
                    </div>
                  </div>
                </div>

                {/* PASSO 2 — Residual = Bruta − Multa − Crédito */}
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Passo 2 · Residual = Bruta − Ultrapassagem esperada − Crédito/Débito esperado
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-2">
                    <div className="rounded-md bg-primary/10 border border-primary/30 px-3 py-2">
                      <div className="text-[10px] uppercase text-primary">Bruta</div>
                      <div className="text-sm font-bold tabular-nums text-primary">{brl(diferenca)}</div>
                    </div>
                    <div className="text-xl font-bold text-muted-foreground text-center">−</div>
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <div className="text-[10px] uppercase text-muted-foreground">Multa ultrapassagem</div>
                      <div className="text-sm font-bold tabular-nums">{brl(totalUltrapassagem)}</div>
                    </div>
                    <div className="text-xl font-bold text-muted-foreground text-center">−</div>
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                      <div className="text-[10px] uppercase text-muted-foreground">Crédito/Débito</div>
                      <div className="text-sm font-bold tabular-nums">{brl(totalCredito)}</div>
                    </div>
                    <div className="text-xl font-bold text-muted-foreground text-center">=</div>
                    <div className={`rounded-md px-3 py-2 border ${Math.abs(diferencaResidual) < 1 ? 'bg-green-500/10 border-green-500/40' : Math.abs(diferencaResidual) < 50 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-red-500/10 border-red-500/40'}`}>
                      <div className={`text-[10px] uppercase ${Math.abs(diferencaResidual) < 1 ? 'text-green-700 dark:text-green-400' : Math.abs(diferencaResidual) < 50 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}`}>Residual</div>
                      <div className={`text-sm font-bold tabular-nums ${Math.abs(diferencaResidual) < 1 ? 'text-green-700 dark:text-green-400' : Math.abs(diferencaResidual) < 50 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}`}>
                        {brl(diferencaResidual)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground italic">
                    Observação: subtrair um crédito negativo ({brl(totalCredito)}) tem o mesmo efeito de somá-lo em módulo. Por isso o residual pode ficar maior que a bruta quando o crédito é negativo.
                  </div>
                </div>

                {/* Conta inline com os números reais */}
                <div className="rounded-md border-l-4 border-primary bg-muted/30 px-4 py-3 font-mono text-sm tabular-nums overflow-x-auto">
                  <div className="text-[11px] font-sans font-semibold uppercase text-muted-foreground mb-1">Conta final</div>
                  <div>
                    {brl(totalGeral)} <span className="text-muted-foreground">(faturado)</span>
                    {' − '}{brl(totalCopel)} <span className="text-muted-foreground">(Copel)</span>
                    {' − '}{brl(totalUltrapassagem)} <span className="text-muted-foreground">(multa)</span>
                    {' − ('}{brl(totalCredito)}<span className="text-muted-foreground">)</span> <span className="text-muted-foreground">(créd/déb)</span>
                    {' = '}<span className="font-bold text-primary">{brl(diferencaResidual)}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground italic">
                  A diferença saudável vem apenas de <strong>ultrapassagem</strong> (multa por demanda acima do contratado) e do <strong>crédito/débito</strong> da Copel repassado aos clientes. Se o residual for relevante, revisar a Fatura Copel, os lançamentos ou a demanda contratada dos contratos.
                </p>

                {/* Clientes que pagaram multa de ultrapassagem */}
                {faturasComMulta.length > 0 ? (
                  <details className="rounded-md border bg-background">
                    <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold hover:bg-muted/60 transition flex items-center gap-2">
                      Ver clientes com multa de ultrapassagem
                      <span className="ml-auto font-normal text-muted-foreground">
                        {faturasComMulta.length} cliente(s) · {brl(totalUltrapassagem)}
                      </span>
                    </summary>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 text-[10px] uppercase tracking-wide">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                            <th className="px-3 py-2 text-right font-semibold">Dem. contratada (kW)</th>
                            <th className="px-3 py-2 text-right font-semibold">Dem. medida (kW)</th>
                            <th className="px-3 py-2 text-right font-semibold">Ultrapassagem (kW)</th>
                            <th className="px-3 py-2 text-right font-semibold">Multa (R$)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {faturasComMulta.map((x) => (
                            <tr key={x.f.cliente_key} className="border-t">
                              <td className="px-3 py-1.5">
                                {x.f.cliente_nome}
                                {x.f.contrato_numero && (
                                  <span className="text-muted-foreground"> — Contrato {x.f.contrato_numero}</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums">{num(x.demandaContratada, 2)}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums">{num(x.demandaMedida, 2)}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-amber-600 font-medium">{num(x.ultrapassagemKw, 2)}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{brl(x.multa)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-primary bg-primary/5 font-bold">
                            <td className="px-3 py-2" colSpan={3}>TOTAL</td>
                            <td className="px-3 py-2 text-right tabular-nums">{num(totalUltrapassagemKw, 2)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-primary">{brl(totalUltrapassagem)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </details>
                ) : (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
                    Nenhum cliente com ultrapassagem nesta competência.
                  </div>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {faturas.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Sem dados para esta competência. Preencha a <strong>Fatura Copel</strong> e os <strong>Lançamentos</strong>.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
          {/* Sidebar de clientes */}
          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  className="pl-8 h-9"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 max-h-[70vh] overflow-y-auto">
              <ul className="space-y-1">
                {faturasFiltradas.map((f) => {
                  const active = f.cliente_key === selecionado;
                  const idx = f.cliente_key.indexOf('::');
                  const cli = idx >= 0 ? f.cliente_key.slice(0, idx) : '';
                  const showContrato = !!cli && (contratosPorCliente.get(cli) || 0) > 1 && f.contrato_numero;
                  return (
                    <li key={f.cliente_key}>
                      <button
                        onClick={() => setSelecionado(f.cliente_key)}
                        className={`w-full text-left rounded-md px-3 py-2 transition-colors ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{f.cliente_nome}</span>
                          {f.cliente_key === 'AREA_COMUM' && (
                            <Badge variant={active ? 'secondary' : 'outline'} className="text-[10px]">comum</Badge>
                          )}
                        </div>
                        {showContrato && (
                          <div className={`text-[11px] mt-0.5 ${active ? 'text-primary-foreground/90' : 'text-foreground/70'}`}>
                            Contrato {f.contrato_numero}
                          </div>
                        )}
                        <div className={`text-xs mt-0.5 ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {f.modulos.length} mód · {brl(totaisPorFatura.get(f.cliente_key)?.total ?? 0)}
                        </div>
                      </button>
                    </li>
                  );
                })}
                {faturasFiltradas.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum cliente</li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Detalhe */}
          {faturaSelecionada && (
            <FaturaOficial
              fatura={faturaSelecionada}
              competencia={currentComp?.ano_mes ?? ''}
              tarifas={tarifas as EnergiaTarifas}
              demandaContrato={(() => {
                // Demanda contratada = demanda do contrato desta fatura (uma por fatura).
                const cid = faturaSelecionada.contrato_id;
                if (!cid) return 0;
                return contratoDemandaPorId[cid] || 0;
              })()}
              linhas={memoriaLinhas.filter((l) => {
                const m = modulos.find((mm) => mm.id === l.modulo_id);
                if (!m) return false;
                if (faturaSelecionada.cliente_key === 'AREA_COMUM') {
                  return (l.identificador || '').toUpperCase().includes('AREA COMUM') || (l.identificador || '').toUpperCase().includes('ÁREA COMUM');
                }
                if (faturaSelecionada.cliente_key.startsWith('VAGO:')) {
                  return l.modulo_id === faturaSelecionada.cliente_key.slice(5);
                }
                const idx = faturaSelecionada.cliente_key.indexOf('::');
                const cli = idx >= 0 ? faturaSelecionada.cliente_key.slice(0, idx) : faturaSelecionada.cliente_key;
                const contrato = idx >= 0 ? faturaSelecionada.cliente_key.slice(idx + 2) : null;
                const mCid = contratoIdPorModulo[m.id] ?? 'SEM';
                const mCliId = mCid !== 'SEM' ? (contratoClientePorId[mCid] ?? null) : null;
                if (mCliId !== cli) return false;
                return mCid === contrato;
              })}
              todasLinhas={memoriaLinhas}
              onCopy={copiarResumo}
              modoPerdas={modoPerdas}
              onChangeModoPerdas={setModoPerdas}
            />
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tone, suffix }: { label: string; value: string; icon: any; tone?: 'primary' | 'green' | 'amber' | 'red'; suffix?: string }) {
  const toneCls =
    tone === 'primary' ? 'border-primary/30 bg-primary/5'
    : tone === 'green' ? 'border-green-300/50 bg-green-50 dark:bg-green-950/20'
    : tone === 'amber' ? 'border-amber-300/50 bg-amber-50 dark:bg-amber-950/20'
    : tone === 'red' ? 'border-red-300/50 bg-red-50 dark:bg-red-950/20'
    : '';
  return (
    <div className={`rounded-md border p-3 ${toneCls}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
      {suffix && <div className="text-[11px] text-muted-foreground">{suffix}</div>}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Fatura Oficial — replica o layout da planilha "FATURA DE ENERGIA"
// que o cliente já recebe hoje (PDF Mega Centro Logístico).
// ───────────────────────────────────────────────────────────

// Recalcula o total da fatura POR CLIENTE com a mesma lógica de FaturaOficial:
// usa a demanda CONTRATADA do contrato (não a soma por módulo), reaplica
// ultrapassagem 2× e demanda isenta, embute perdas no consumo e ignora
// PIS/COFINS e ICMS no total (são informativos). Retorna também as parcelas
// "esperadas" da diferença Copel × Faturado: ultrapassagem e crédito/débito.
export function calcularTotalCliente(
  linhas: MemoriaLinha[],
  tarifas: EnergiaTarifas,
  demandaContrato: number,
) {
  const sum = (k: keyof MemoriaLinha) =>
    linhas.reduce((s, l) => s + (Number(l[k] as any) || 0), 0);

  const demandaMedida = sum('demanda_usd');
  const demandaIsenta = demandaMedida >= demandaContrato ? 0 : demandaContrato - demandaMedida;
  const ultrapassagem = demandaMedida > demandaContrato ? demandaMedida - demandaContrato : 0;
  const faturadoUsd = demandaMedida >= demandaContrato ? demandaContrato : demandaMedida;
  const rsDemandaUsd = faturadoUsd * (tarifas.demanda_usd || 0);
  const rsDemandaIsenta = demandaIsenta * (tarifas.demanda_isenta || 0);
  const tarifaUltrapassagem = (tarifas.demanda_usd || 0) * 2;
  const rsUltrapassagem = ultrapassagem * tarifaUltrapassagem;

  const rsPonta = sum('rs_ponta') + sum('rs_perdas_te_ponta') + sum('rs_perdas_tusd_ponta');
  const rsFora = sum('rs_fora') + sum('rs_perdas_te_fora') + sum('rs_perdas_tusd_fora');
  const ilum = sum('iluminacao_publica');
  const bandeira = sum('bandeira_total');
  const credito = sum('cred_deb_rateado') + sum('fotovoltaico') + sum('ajuste_manual');

  const totalFornecimento = rsDemandaUsd + rsDemandaIsenta + rsUltrapassagem + rsPonta + rsFora;
  const total = totalFornecimento + ilum + credito + bandeira;

  return { total, rsUltrapassagem, credito, rsDemandaUsd, rsDemandaIsenta };
}

function compactarModulos(ids: string[]): string {
  // Extrai número do identificador (ex. "MÓDULO 48" → 48). Se contíguo, exibe faixa.
  const nums = ids
    .map((id) => {
      const m = id.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : NaN;
    })
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  if (nums.length === 0) return ids.join(', ');
  if (nums.length === 1) return String(nums[0]);
  const contiguo = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  if (contiguo) return `${nums[0]} ao ${nums[nums.length - 1]}`;
  return nums.join(', ');
}

function periodoCompetencia(anoMes: string): string {
  // anoMes = "YYYY-MM" → "01/MM/YYYY → último dia/MM/YYYY"
  const [y, m] = anoMes.split('-').map(Number);
  if (!y || !m) return anoMes;
  const ult = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return `01/${mm}/${y} — ${String(ult).padStart(2, '0')}/${mm}/${y}`;
}

function tarifa(n: number) {
  return `R$ ${(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`;
}

function FaturaOficial({
  fatura: f,
  competencia,
  tarifas,
  demandaContrato,
  linhas,
  todasLinhas,
  onCopy,
  modoPerdas,
  onChangeModoPerdas,
}: {
  fatura: FaturaCliente;
  competencia: string;
  tarifas: EnergiaTarifas;
  demandaContrato: number;
  linhas: MemoriaLinha[];
  todasLinhas: MemoriaLinha[];
  onCopy: () => void;
  modoPerdas: ModoRateioPerdas;
  onChangeModoPerdas: (m: ModoRateioPerdas) => void;
}) {
  // Agregados a partir das linhas da memória (mesmas células que geraram o cálculo)
  const sum = (k: keyof MemoriaLinha) => linhas.reduce((s, l) => s + (Number(l[k] as any) || 0), 0);

  const demandaMedida = sum('demanda_usd');           // G
  // Demanda contratada é por CLIENTE (contrato único), não soma por módulo.
  const demandaContratada = demandaContrato;
  // Demanda Isenta de ICMS: por decisão judicial, a sobra entre contratada e
  // medida fica isenta. Aplicada uma única vez por cliente, nunca negativa.
  const demandaIsenta = demandaMedida >= demandaContratada ? 0 : demandaContratada - demandaMedida;
  const ultrapassagem = demandaMedida > demandaContratada ? demandaMedida - demandaContratada : 0;
  // Recalcula valores R$ com a tarifa Mercado Livre e a demanda do cliente
  const faturadoUsd = demandaMedida >= demandaContratada ? demandaContratada : demandaMedida;
  const rsDemandaUsd = faturadoUsd * (tarifas.demanda_usd || 0);
  const rsDemandaIsenta = demandaIsenta * (tarifas.demanda_isenta || 0);
  // Ultrapassagem = 2 × tarifa de demanda (regra fixa do mercado livre).
  const tarifaUltrapassagem = (tarifas.demanda_usd || 0) * 2;
  const rsUltrapassagem = ultrapassagem * tarifaUltrapassagem;

  const consumoPonta = sum('consumo_ponta');
  const consumoFora = sum('consumo_fora');
  const consumoTotal = sum('consumo_total');
  const rsConsumoTotal = sum('rs_consumo_total');

  const rsPonta = sum('rs_ponta');
  const rsFora = sum('rs_fora');

  // Rateio de perdas — embutido nas linhas de consumo (sem linha visível na fatura).
  // O detalhamento técnico continua disponível na aba Memória de Cálculo.
  const rsPerdasPonta = sum('rs_perdas_te_ponta') + sum('rs_perdas_tusd_ponta');
  const rsPerdasFora = sum('rs_perdas_te_fora') + sum('rs_perdas_tusd_fora');
  const rsPontaExibido = rsPonta + rsPerdasPonta;
  const rsForaExibido = rsFora + rsPerdasFora;
  // kWh com perdas embutido (mantém coerência: kWh × tarifa = R$ exibido).
  const perdasPontaKwh = sum('perdas_ponta_kwh');
  const perdasForaKwh = sum('perdas_fora_kwh');
  const consumoPontaExibido = consumoPonta + perdasPontaKwh;
  const consumoForaExibido = consumoFora + perdasForaKwh;
  const consumoTotalExibido = consumoPontaExibido + consumoForaExibido;
  const tarifaPontaExibida = consumoPontaExibido > 0 ? rsPontaExibido / consumoPontaExibido : (tarifas.te_ponta + tarifas.tusd_ponta);
  const tarifaForaExibida = consumoForaExibido > 0 ? rsForaExibido / consumoForaExibido : (tarifas.te_fora + tarifas.tusd_fora);

  // Denominadores globais para auditoria do rateio de perdas por posto tarifário.
  const sumAll = (k: keyof MemoriaLinha) => todasLinhas.reduce((s, l) => s + (Number(l[k] as any) || 0), 0);
  const consumoPontaTotalGeral = sumAll('consumo_ponta');
  const consumoForaTotalGeral = sumAll('consumo_fora');
  const perdasPontaTotalGeral = sumAll('perdas_ponta_kwh');
  const perdasForaTotalGeral = sumAll('perdas_fora_kwh');
  const consumoTotalGeralCombinado = consumoPontaTotalGeral + consumoForaTotalGeral;
  const consumoTotalCliente = consumoPonta + consumoFora;

  const piscof = sum('piscof_total');
  const icms = sum('icms_total');
  const ilum = sum('iluminacao_publica');
  const credito = sum('cred_deb_rateado') + sum('fotovoltaico') + sum('ajuste_manual');
  const bandeira = sum('bandeira_total');

  // Total Fornecimento = Demanda + Consumo (sem perdas, sem tributos —
  // tributos já estão embutidos nas tarifas brutas da Copel).
  const totalFornecimento =
    rsDemandaUsd + rsDemandaIsenta + rsUltrapassagem + rsPontaExibido + rsForaExibido;
  // TOTAL DA FATURA = Fornecimento + Iluminação + Crédito/Débito + Bandeira.
  // PIS/COFINS e ICMS NÃO entram (são informativos, já embutidos no preço).
  const total = totalFornecimento + ilum + credito + bandeira;

  // Base dos impostos com perdas embutidas (mantém coerência com o consumo exibido).
  // PIS/COFINS e ICMS continuam informativos (já embutidos nas tarifas brutas).
  const baseConsumoComPerdas = rsPontaExibido + rsForaExibido;
  const piscofPct = tarifas.pis_pct + tarifas.cofins_pct;
  // PIS/COFINS e ICMS da DEMANDA precisam ser recalculados a partir dos
  // valores POR CLIENTE (rsDemandaUsd / rsDemandaIsenta) — não dá para somar
  // piscof_demanda das linhas porque essas usaram a demanda por MÓDULO, e o
  // contrato é por cliente. Isso causava PIS/COFINS errado quando a demanda
  // do contrato ≠ Σ módulos.
  const piscofConsumo = baseConsumoComPerdas * (1 - tarifas.icms_pct) * piscofPct;
  const piscofDemandaUsd = rsDemandaUsd * (1 - tarifas.icms_pct) * piscofPct;
  const piscofUltrapassagem = rsUltrapassagem * (1 - tarifas.icms_pct) * piscofPct;
  const piscofDemandaIsenta = rsDemandaIsenta * piscofPct; // sem ICMS para deduzir
  const piscofExibido = piscofConsumo + piscofDemandaUsd + piscofUltrapassagem + piscofDemandaIsenta;

  const icmsConsumo = baseConsumoComPerdas * tarifas.icms_pct;
  const icmsDemandaCalc = rsDemandaUsd * tarifas.icms_pct; // isenta NÃO entra
  const icmsUltrapassagem = rsUltrapassagem * tarifas.icms_pct;
  const icmsExibido = icmsConsumo + icmsDemandaCalc + icmsUltrapassagem;

  const basePiscof = piscofPct > 0 ? piscofExibido / piscofPct : 0;
  const pctPiscof = piscofPct * 100;
  const baseIcms = tarifas.icms_pct > 0 ? icmsExibido / tarifas.icms_pct : 0;
  const pctIcms = tarifas.icms_pct * 100;

  const modulosFaixa = compactarModulos(f.modulos);
  const bandeiraTarifa = resolveBandeiraValor(tarifas);
  const bandeiraPonta = (consumoPontaExibido / 100) * bandeiraTarifa;
  const bandeiraFora = (consumoForaExibido / 100) * bandeiraTarifa;

  return (
    <Card className="print:shadow-none print:border-0">
      <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-primary uppercase">
              Mega Centro Logístico
            </div>
            <CardTitle className="text-xl mt-0.5">Fatura de Energia — {f.cliente_nome}</CardTitle>
            <CardDescription className="mt-1">
              {f.contrato_numero ? `Contrato Nº ${f.contrato_numero} · ` : ''}Documento auditável que reproduz o cálculo entregue ao cliente.
            </CardDescription>
          </div>
          <div className="flex gap-2 print:hidden">
            <span className="self-center text-[11px] text-muted-foreground rounded border px-2 py-1">
              Modo: <strong className="text-foreground">{modoPerdas === 'separado' ? 'Exato (por posto)' : 'Planilha (combinado)'}</strong>
            </span>
            <Button variant="outline" size="sm" onClick={onCopy}>Copiar resumo</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              Imprimir / PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Bloco 1 — Identificação */}
        <div className="rounded-md border overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 text-sm">
            <InfoCell label="Cliente" value={f.cliente_nome} />
            <InfoCell label="Contrato" value={f.contrato_numero || '—'} />
            <InfoCell label="Módulos" value={modulosFaixa} />
            <InfoCell label="Concessionária" value="COPEL-DIS" />
            <InfoCell label="Modalidade Tarifária" value="A4 Verde" />
            <InfoCell label="Período" value={periodoCompetencia(competencia)} className="md:col-span-2" />
          </div>
        </div>

        {/* Bloco 2 — Demanda + Consumo */}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left font-semibold w-[28%]"></th>
                <th className="px-3 py-2 text-right font-semibold">Medido</th>
                <th className="px-3 py-2 text-right font-semibold">Contratado</th>
                <th className="px-3 py-2 text-right font-semibold">Faturado</th>
                <th className="px-3 py-2 text-right font-semibold">Tarifa</th>
                <th className="px-3 py-2 text-right font-semibold">Valores (R$)</th>
              </tr>
            </thead>
            <tbody>
              <SectionRow label="DEMANDA (kW)" />
              <DataRow label="Demanda USD" medido={demandaMedida} contratado={demandaContratada} faturado={faturadoUsd} tarifa={tarifas.demanda_usd} valor={rsDemandaUsd} dec={2} />
              <DataRow label="Demanda USD Isenta ICMS" medido={demandaIsenta} faturado={demandaIsenta} tarifa={tarifas.demanda_isenta} valor={rsDemandaIsenta} dec={2} />
              <DataRow label="Ultrapassagem" faturado={ultrapassagem} tarifa={tarifaUltrapassagem} valor={rsUltrapassagem} dec={2} />

              <SectionRow label="CONSUMO (kWh)" />
              <DataRow label="Ponta" medido={consumoPontaExibido} faturado={consumoPontaExibido} tarifa={tarifaPontaExibida} valor={rsPontaExibido} dec={2} />
              <DataRow label="Fora Ponta" medido={consumoForaExibido} faturado={consumoForaExibido} tarifa={tarifaForaExibida} valor={rsForaExibido} dec={2} />
              <DataRow label="Bandeira" valor={bandeira} dec={2} />
            </tbody>
          </table>
        </div>

        {/* Memória de auditoria — admin only, não imprime na fatura do cliente */}
        <details className="print:hidden rounded-md border bg-muted/30 group">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-primary hover:bg-muted/60 transition">
            🔍 Memória do cálculo de consumo (visível só no admin)
          </summary>
          <div className="p-4 space-y-4 text-xs">
            <ConsumoAuditBlock
              titulo="Ponta"
              consumoBase={consumoPonta}
              perdasKwh={perdasPontaKwh}
              consumoExibido={consumoPontaExibido}
              tarifaTE={tarifas.te_ponta}
              tarifaTUSD={tarifas.tusd_ponta}
              rsBase={rsPonta}
              rsPerdas={rsPerdasPonta}
              rsExibido={rsPontaExibido}
              tarifaExibida={tarifaPontaExibida}
              modo={modoPerdas}
              numeradorSeparado={consumoPonta}
              denomSeparado={consumoPontaTotalGeral}
              numeradorCombinado={consumoTotalCliente}
              denomCombinado={consumoTotalGeralCombinado}
              perdasTotalGeral={perdasPontaTotalGeral}
            />
            <ConsumoAuditBlock
              titulo="Fora Ponta"
              consumoBase={consumoFora}
              perdasKwh={perdasForaKwh}
              consumoExibido={consumoForaExibido}
              tarifaTE={tarifas.te_fora}
              tarifaTUSD={tarifas.tusd_fora}
              rsBase={rsFora}
              rsPerdas={rsPerdasFora}
              rsExibido={rsForaExibido}
              tarifaExibida={tarifaForaExibida}
              modo={modoPerdas}
              numeradorSeparado={consumoFora}
              denomSeparado={consumoForaTotalGeral}
              numeradorCombinado={consumoTotalCliente}
              denomCombinado={consumoTotalGeralCombinado}
              perdasTotalGeral={perdasForaTotalGeral}
            />
            <div className="rounded border bg-background p-3">
              <div className="font-semibold mb-1">Bandeira</div>
              <AuditRow label="Tarifa oficial usada" valor={`R$ ${num(bandeiraTarifa, 4)} / 100 kWh`} />
              <AuditRow label="Ponta: (consumo + perdas) ÷ 100 × tarifa" valor={`${num(consumoPontaExibido, 2)} ÷ 100 × ${num(bandeiraTarifa, 4)} = ${brl(bandeiraPonta)}`} />
              <AuditRow label="Fora Ponta: (consumo + perdas) ÷ 100 × tarifa" valor={`${num(consumoForaExibido, 2)} ÷ 100 × ${num(bandeiraTarifa, 4)} = ${brl(bandeiraFora)}`} />
              <AuditRow label="(=) Bandeira tarifária" valor={brl(bandeira)} strong />
              <div className="text-muted-foreground mt-1">
                Segue a planilha: consumo do cliente com perdas rateadas dividido por 100, multiplicado pela tarifa oficial da bandeira do mês.
              </div>
            </div>
            <div className="text-muted-foreground italic border-l-2 border-primary/50 pl-3">
              A tarifa exibida na fatura do cliente é <strong>derivada</strong> (R$ exibido ÷ kWh exibido, com perdas técnicas embutidas).
              Pequenas diferenças vs. a tarifa Copel pura são esperadas — vêm do rateio de perdas.
            </div>
          </div>
        </details>

        {/* Bloco 3 — Resumo */}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left font-semibold w-[28%]">Resumo da Conta</th>
                <th className="px-3 py-2 text-right font-semibold">Medido</th>
                <th className="px-3 py-2 text-right font-semibold">Contratado</th>
                <th className="px-3 py-2 text-right font-semibold">Faturado</th>
                <th className="px-3 py-2 text-right font-semibold">Tarifa</th>
                <th className="px-3 py-2 text-right font-semibold">Valores (R$)</th>
              </tr>
            </thead>
            <tbody>
              <DataRow label="Consumo Total (kWh)" medido={consumoTotalExibido} dec={2} />
              <DataRow label="Total Fornecimento (R$)" valor={totalFornecimento} dec={2} />
            </tbody>
          </table>
        </div>

        {/* Bloco 4 — Impostos / Tributos */}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left font-semibold w-[40%]">Impostos / Tributos</th>
                <th className="px-3 py-2 text-right font-semibold">Base</th>
                <th className="px-3 py-2 text-right font-semibold">%</th>
                <th className="px-3 py-2 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              <TaxRow
                label="PIS/COFINS"
                base={basePiscof}
                pct={pctPiscof}
                valor={piscofExibido}
                rationale={(
                  <RationaleContent
                    titulo="Como o PIS/COFINS foi calculado"
                    intro={`Alíquota total ${pctPiscof.toFixed(2)}% (PIS ${(tarifas.pis_pct*100).toFixed(2)}% + COFINS ${(tarifas.cofins_pct*100).toFixed(2)}%). Incide sobre cada parcela do fornecimento, com a base LÍQUIDA de ICMS quando a parcela é tributada.`}
                    linhas={[
                      { label: 'Consumo (c/ perdas)', formula: `${brl(baseConsumoComPerdas)} × (1 − ${(tarifas.icms_pct*100).toFixed(0)}%) × ${pctPiscof.toFixed(2)}%`, valor: baseConsumoComPerdas * (1 - tarifas.icms_pct) * piscofPct },
                      { label: 'Demanda USD', formula: `${brl(rsDemandaUsd)} × (1 − ${(tarifas.icms_pct*100).toFixed(0)}%) × ${pctPiscof.toFixed(2)}%`, valor: piscofDemandaUsd },
                      { label: 'Ultrapassagem', formula: `${brl(rsUltrapassagem)} × (1 − ${(tarifas.icms_pct*100).toFixed(0)}%) × ${pctPiscof.toFixed(2)}%`, valor: piscofUltrapassagem },
                      { label: 'Demanda Isenta ICMS', formula: `${brl(rsDemandaIsenta)} × ${pctPiscof.toFixed(2)}% (sem ICMS para deduzir)`, valor: piscofDemandaIsenta },
                    ]}
                    totalLabel="Total PIS/COFINS"
                    total={piscofExibido}
                    baseEquivalente={{ valor: basePiscof, formula: `${brl(piscofExibido)} ÷ ${pctPiscof.toFixed(2)}%` }}
                    rodape="Valor informativo — já está embutido nas tarifas brutas da Copel e NÃO soma no Total da Fatura."
                  />
                )}
              />
              <TaxRow
                label="ICMS"
                base={baseIcms}
                pct={pctIcms}
                valor={icmsExibido}
                rationale={(
                  <RationaleContent
                    titulo="Como o ICMS foi calculado"
                    intro={`Alíquota ${pctIcms.toFixed(2)}%. Incide sobre as parcelas tributadas do fornecimento. A Demanda Isenta de ICMS é, por definição, excluída da base.`}
                    linhas={[
                      { label: 'Consumo (c/ perdas)', formula: `${brl(baseConsumoComPerdas)} × ${pctIcms.toFixed(2)}%`, valor: baseConsumoComPerdas * tarifas.icms_pct },
                      { label: 'Demanda USD', formula: `${brl(rsDemandaUsd)} × ${pctIcms.toFixed(2)}%`, valor: icmsDemandaCalc },
                      { label: 'Ultrapassagem', formula: `${brl(rsUltrapassagem)} × ${pctIcms.toFixed(2)}%`, valor: icmsUltrapassagem },
                      { label: 'Demanda Isenta ICMS', formula: `${brl(rsDemandaIsenta)} — isenta, não tributa`, valor: 0 },
                    ]}
                    totalLabel="Total ICMS"
                    total={icmsExibido}
                    baseEquivalente={{ valor: baseIcms, formula: `${brl(icmsExibido)} ÷ ${pctIcms.toFixed(2)}%` }}
                    rodape="Valor informativo — já está embutido nas tarifas brutas da Copel e NÃO soma no Total da Fatura."
                  />
                )}
              />
              {/* Sublinhas: racional de como o PIS/COFINS + ICMS foram compostos */}
              <tr className="bg-muted/20 text-xs">
                <td className="px-3 py-1 pl-8 text-muted-foreground" colSpan={3}>
                  ↳ Imposto de consumo
                  <span className="ml-2 text-[10px]">
                    PIS/COFINS {brl(piscofConsumo)} + ICMS {brl(icmsConsumo)}
                  </span>
                </td>
                <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{brl(piscofConsumo + icmsConsumo)}</td>
              </tr>
              <tr className="bg-muted/20 text-xs">
                <td className="px-3 py-1 pl-8 text-muted-foreground" colSpan={3}>
                  ↳ Imposto da demanda usada
                  <span className="ml-2 text-[10px]">
                    PIS/COFINS {brl(piscofDemandaUsd)} + ICMS {brl(icmsDemandaCalc)}
                  </span>
                </td>
                <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{brl(piscofDemandaUsd + icmsDemandaCalc)}</td>
              </tr>
              <tr className="bg-muted/20 text-xs">
                <td className="px-3 py-1 pl-8 text-muted-foreground" colSpan={3}>
                  ↳ Imposto da ultrapassagem
                  <span className="ml-2 text-[10px]">
                    PIS/COFINS {brl(piscofUltrapassagem)} + ICMS {brl(icmsUltrapassagem)}
                  </span>
                </td>
                <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{brl(piscofUltrapassagem + icmsUltrapassagem)}</td>
              </tr>
              <tr className="bg-muted/20 text-xs border-b">
                <td className="px-3 py-1 pl-8 text-muted-foreground" colSpan={3}>
                  ↳ Demanda isenta de ICMS
                  <span className="ml-2 text-[10px]">
                    Apenas PIS/COFINS — ICMS não foi deduzido (parcela isenta por decisão judicial)
                  </span>
                </td>
                <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{brl(piscofDemandaIsenta)}</td>
              </tr>
              <TaxRow label="Iluminação Pública" valor={ilum} />
              <TaxRow label="Crédito" valor={credito} />
              <TaxRow label="Bandeira Tarifária" valor={bandeira} />
              <tr className="border-t-2 border-primary bg-primary/10">
                <td className="px-3 py-3 font-bold uppercase tracking-wide" colSpan={3}>TOTAL DA FATURA</td>
                <td className="px-3 py-3 text-right tabular-nums text-primary font-extrabold text-lg">{brl(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] italic text-muted-foreground -mt-2">
          PIS/COFINS e ICMS são informativos — já estão embutidos nas tarifas brutas da Copel. Clique no <span className="inline-flex items-center"><Info className="h-3 w-3" /></span> ao lado do tributo para ver o detalhamento.
        </p>

        <div className="flex flex-wrap gap-1.5 print:hidden">
          <span className="text-xs text-muted-foreground mr-2 self-center">Módulos:</span>
          {f.modulos.map((mod) => (
            <Badge key={mod} variant="secondary" className="font-normal">{mod}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoCell({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex border-b md:[&:nth-last-child(-n+2)]:border-b-0 ${className}`}>
      <div className="bg-muted/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide w-44 shrink-0 flex items-center">
        {label}
      </div>
      <div className="px-3 py-2 flex-1 font-medium">{value || '—'}</div>
    </div>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <tr className="bg-primary/5">
      <td className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary" colSpan={6}>{label}</td>
    </tr>
  );
}

function DataRow({
  label, medido, contratado, faturado, tarifa: t, valor, dec = 2,
}: { label: string; medido?: number; contratado?: number; faturado?: number; tarifa?: number; valor?: number; dec?: number }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-3 py-1.5">{label}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{medido !== undefined ? num(medido, dec) : ''}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{contratado !== undefined ? num(contratado, dec) : ''}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{faturado !== undefined ? num(faturado, dec) : ''}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{t !== undefined ? tarifa(t) : ''}</td>
      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{valor !== undefined ? brl(valor) : ''}</td>
    </tr>
  );
}

function TaxRow({ label, base, pct, valor, rationale }: { label: string; base?: number; pct?: number; valor: number; rationale?: React.ReactNode }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5">
          {label}
          {rationale && (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-primary transition-colors" aria-label={`Como ${label} foi calculado`}>
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" className="w-[420px] max-w-[90vw] text-xs">
                {rationale}
              </PopoverContent>
            </Popover>
          )}
        </span>
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{base !== undefined ? brl(base) : ''}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{pct !== undefined ? `${pct.toFixed(2)}%` : ''}</td>
      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{brl(valor)}</td>
    </tr>
  );
}

function RationaleContent({
  titulo, intro, linhas, totalLabel, total, baseEquivalente, rodape,
}: {
  titulo: string;
  intro: string;
  linhas: Array<{ label: string; formula: string; valor: number }>;
  totalLabel: string;
  total: number;
  baseEquivalente: { valor: number; formula: string };
  rodape: string;
}) {
  return (
    <div className="space-y-2">
      <div className="font-semibold text-sm">{titulo}</div>
      <p className="text-muted-foreground leading-relaxed">{intro}</p>
      <div className="rounded border bg-muted/30 divide-y">
        {linhas.map((l) => (
          <div key={l.label} className="px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{l.label}</span>
              <span className="tabular-nums font-medium">{brl(l.valor)}</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">{l.formula}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t pt-1.5 font-semibold">
        <span>{totalLabel}</span>
        <span className="tabular-nums">{brl(total)}</span>
      </div>
      <div className="text-[10px] text-muted-foreground">
        Base equivalente exibida: <span className="font-mono">{baseEquivalente.formula}</span> = <strong>{brl(baseEquivalente.valor)}</strong>
      </div>
      <div className="text-[11px] italic text-muted-foreground border-l-2 border-primary/50 pl-2">
        {rodape}
      </div>
    </div>
  );
}

function AuditRow({ label, valor, strong = false }: { label: string; valor: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-0.5 ${strong ? 'font-semibold border-t mt-1 pt-1' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

function ConsumoAuditBlock({
  titulo, consumoBase, perdasKwh, consumoExibido,
  tarifaTE, tarifaTUSD, rsBase, rsPerdas, rsExibido, tarifaExibida,
  modo, numeradorSeparado, denomSeparado, numeradorCombinado, denomCombinado, perdasTotalGeral,
}: {
  titulo: string;
  consumoBase: number; perdasKwh: number; consumoExibido: number;
  tarifaTE: number; tarifaTUSD: number;
  rsBase: number; rsPerdas: number; rsExibido: number;
  tarifaExibida: number;
  modo: ModoRateioPerdas;
  numeradorSeparado: number; denomSeparado: number;
  numeradorCombinado: number; denomCombinado: number;
  perdasTotalGeral: number;
}) {
  const tarifaBase = (tarifaTE || 0) + (tarifaTUSD || 0);
  const fmtTar = (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`;
  const num1 = modo === 'combinado' ? numeradorCombinado : numeradorSeparado;
  const den1 = modo === 'combinado' ? denomCombinado : denomSeparado;
  const ratio = den1 > 0 ? num1 / den1 : 0;
  const modoLabel = modo === 'combinado' ? 'combinado (planilha)' : 'separado por posto (exato)';
  return (
    <div className="rounded border bg-background p-3">
      <div className="font-semibold text-sm mb-2 text-primary">{titulo}</div>
      <div className="text-[11px] text-muted-foreground mb-2 italic">
        Modo: <strong>{modoLabel}</strong><br />
        Rateio de perdas {titulo}: {num(num1, 2)} ÷ {num(den1, 2)} = {(ratio * 100).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}% × {num(perdasTotalGeral, 2)} kWh = <strong>{num(ratio * perdasTotalGeral, 2)} kWh</strong>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">kWh</div>
          <AuditRow label="Consumo medido (Σ módulos)" valor={`${num(consumoBase, 2)} kWh`} />
          <AuditRow label="(+) Perdas rateadas" valor={`${num(perdasKwh, 2)} kWh`} />
          <AuditRow label="(=) Consumo exibido" valor={`${num(consumoExibido, 2)} kWh`} strong />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Tarifa base (Copel)</div>
          <AuditRow label="TE" valor={fmtTar(tarifaTE)} />
          <AuditRow label="(+) TUSD" valor={fmtTar(tarifaTUSD)} />
          <AuditRow label="(=) Tarifa base" valor={fmtTar(tarifaBase)} strong />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">R$</div>
          <AuditRow label="Σ R$ consumo (base)" valor={brl(rsBase)} />
          <AuditRow label="(+) R$ perdas (te+tusd)" valor={brl(rsPerdas)} />
          <AuditRow label="(=) R$ exibido" valor={brl(rsExibido)} strong />
          <AuditRow label="Tarifa efetiva = R$ ÷ kWh" valor={fmtTar(tarifaExibida)} />
        </div>
      </div>
    </div>
  );
}