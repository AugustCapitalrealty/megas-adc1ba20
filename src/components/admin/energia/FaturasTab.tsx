import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Search, Download, FileText, Zap, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  calcularMemoria,
  agruparPorCliente,
  type EnergiaTarifas,
  type EnergiaLancamentoInput,
  type FaturaCliente,
  type MemoriaLinha,
} from '@/lib/energia-rateio';

interface Competencia { id: string; ano_mes: string; status: 'rascunho' | 'fechada'; }
interface Modulo { id: string; identificador: string; area_m2: number; ordem: number; cliente_id: string | null; demanda_contratada_kw: number; }
interface Cliente { id: string; nome: string; razao_social: string | null; }

const brl = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const num = (n: number, dec = 2) => (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export function FaturasTab() {
  const [loading, setLoading] = useState(true);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [currentCompId, setCurrentCompId] = useState<string | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tarifas, setTarifas] = useState<any>(null);
  const [lancamentos, setLancamentos] = useState<Record<string, any>>({});
  const [contratoPorModulo, setContratoPorModulo] = useState<Record<string, { demanda_contratada_kw: number }>>({});
  const [contratoIdPorModulo, setContratoIdPorModulo] = useState<Record<string, string>>({});
  const [contratoDemandaPorId, setContratoDemandaPorId] = useState<Record<string, number>>({});
  const [contratoNumeroPorId, setContratoNumeroPorId] = useState<Record<string, string>>({});
  const [contratoClientePorId, setContratoClientePorId] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);

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

    // Vigência sobrepõe o mês: vigencia_inicio <= último dia E (vigencia_fim IS NULL OR >= 1º dia)
    const [yy, mm] = anoMes.split('-').map(Number);
    const refInicio = `${anoMes}-01`;
    const refFim = `${anoMes}-${String(new Date(yy, mm, 0).getDate()).padStart(2, '0')}`;
    const { data: vinc } = await supabase
      .from('energia_contrato_modulos' as any)
      .select('modulo_id, vigencia_inicio, vigencia_fim, contrato_id, contrato:energia_contratos!inner(id, numero_contrato, demanda_contratada_kw, cliente_id, ativo)')
      .lte('vigencia_inicio', refFim);
    const cMap: Record<string, any> = {};
    const cIdMap: Record<string, string> = {};
    const cDemMap: Record<string, number> = {};
    const cNumMap: Record<string, string> = {};
    const cCliMap: Record<string, string> = {};
    if (vinc) {
      for (const v of vinc as any[]) {
        const fim = v.vigencia_fim ?? null;
        if (fim && fim < refInicio) continue;
        if (!v.contrato?.ativo) continue;
        const prev = cMap[v.modulo_id];
        if (!prev || v.vigencia_inicio > prev.__inicio) {
          cMap[v.modulo_id] = { demanda_contratada_kw: Number(v.contrato.demanda_contratada_kw) || 0, __inicio: v.vigencia_inicio };
          cIdMap[v.modulo_id] = v.contrato.id;
          cDemMap[v.contrato.id] = Number(v.contrato.demanda_contratada_kw) || 0;
          cNumMap[v.contrato.id] = v.contrato.numero_contrato || '';
          if (v.contrato.cliente_id) cCliMap[v.contrato.id] = v.contrato.cliente_id;
        }
      }
    }
    setContratoPorModulo(cMap);
    setContratoIdPorModulo(cIdMap);
    setContratoDemandaPorId(cDemMap);
    setContratoNumeroPorId(cNumMap);
    setContratoClientePorId(cCliMap);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await fetchBase(); setLoading(false); })(); }, [fetchBase]);
  useEffect(() => { if (competencias.length && !currentCompId) setCurrentCompId(competencias[0].id); }, [competencias, currentCompId]);
  useEffect(() => {
    if (currentCompId) {
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
    const memoria = calcularMemoria(tarifas as EnergiaTarifas, inputs);
    const fts = agruparPorCliente(
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
    return { faturas: fts, memoriaLinhas: memoria.linhas };
  }, [tarifas, modulos, lancamentos, clientes, contratoPorModulo, contratoIdPorModulo, contratoNumeroPorId, contratoClientePorId]);

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

  const totalGeral = faturas.reduce((s, f) => s + f.total_fatura_energy, 0);
  const totalCopel = Number(tarifas?.copel_valor_total) || 0;
  const diferenca = totalGeral - totalCopel;

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
      `TOTAL: ${brl(f.total_fatura_energy)}`,
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
      f.total_fatura_energy.toFixed(2),
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
            <div className="flex-1 min-w-[220px] max-w-sm">
              <Label>Competência</Label>
              <Select value={currentCompId ?? ''} onValueChange={(v) => { setCurrentCompId(v); setSelecionado(null); }}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {competencias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.ano_mes} {c.status === 'fechada' ? '🔒' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportCSV} disabled={faturas.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
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
                          {f.modulos.length} mód · {brl(f.total_fatura_energy)}
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
              onCopy={copiarResumo}
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
  onCopy,
}: {
  fatura: FaturaCliente;
  competencia: string;
  tarifas: EnergiaTarifas;
  demandaContrato: number;
  linhas: MemoriaLinha[];
  onCopy: () => void;
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
  const rsUltrapassagem = ultrapassagem * (tarifas.ultrapassagem || 0);

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
  const piscofDemandaSum = sum('piscof_demanda') + sum('piscof_demanda_isenta');
  const icmsDemandaSum = sum('icms_demanda');
  const piscofPct = tarifas.pis_pct + tarifas.cofins_pct;
  const piscofExibido = baseConsumoComPerdas * piscofPct + piscofDemandaSum;
  const icmsExibido = baseConsumoComPerdas * tarifas.icms_pct + icmsDemandaSum;
  const basePiscof = piscofPct > 0 ? piscofExibido / piscofPct : 0;
  const pctPiscof = piscofPct * 100;
  const baseIcms = tarifas.icms_pct > 0 ? icmsExibido / tarifas.icms_pct : 0;
  const pctIcms = tarifas.icms_pct * 100;

  const modulosFaixa = compactarModulos(f.modulos);

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
              <DataRow label="Ultrapassagem" faturado={ultrapassagem} tarifa={tarifas.ultrapassagem} valor={rsUltrapassagem} dec={2} />

              <SectionRow label="CONSUMO (kWh)" />
              <DataRow label="Ponta" medido={consumoPontaExibido} faturado={consumoPontaExibido} tarifa={tarifaPontaExibida} valor={rsPontaExibido} dec={2} />
              <DataRow label="Fora Ponta" medido={consumoForaExibido} faturado={consumoForaExibido} tarifa={tarifaForaExibida} valor={rsForaExibido} dec={2} />
              <DataRow label="Bandeira" valor={bandeira} dec={2} />
            </tbody>
          </table>
        </div>

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
              <TaxRow label="PIS/COFINS" base={basePiscof} pct={pctPiscof} valor={piscofExibido} />
              <TaxRow label="ICMS" base={baseIcms} pct={pctIcms} valor={icmsExibido} />
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

function TaxRow({ label, base, pct, valor }: { label: string; base?: number; pct?: number; valor: number }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-1.5">{label}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{base !== undefined ? brl(base) : ''}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{pct !== undefined ? `${pct.toFixed(2)}%` : ''}</td>
      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{brl(valor)}</td>
    </tr>
  );
}