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

    const ref = `${anoMes}-01`;
    const { data: vinc } = await supabase
      .from('energia_contrato_modulos' as any)
      .select('modulo_id, vigencia_inicio, vigencia_fim, contrato:energia_contratos!inner(demanda_contratada_kw, ativo)')
      .lte('vigencia_inicio', ref);
    const cMap: Record<string, any> = {};
    if (vinc) {
      for (const v of vinc as any[]) {
        const fim = v.vigencia_fim ?? null;
        if (fim && fim < ref) continue;
        if (!v.contrato?.ativo) continue;
        const prev = cMap[v.modulo_id];
        if (!prev || v.vigencia_inicio > prev.__inicio) {
          cMap[v.modulo_id] = { demanda_contratada_kw: Number(v.contrato.demanda_contratada_kw) || 0, __inicio: v.vigencia_inicio };
        }
      }
    }
    setContratoPorModulo(cMap);
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

  const faturas: FaturaCliente[] = useMemo(() => {
    if (!tarifas) return [];
    const inputs: EnergiaLancamentoInput[] = modulos.map((m) => {
      const l = lancamentos[m.id];
      const cli = clientes.find((c) => c.id === m.cliente_id);
      return {
        modulo_id: m.id,
        identificador: m.identificador,
        cliente_nome: cli?.razao_social || cli?.nome || (m.cliente_id ? '—' : 'VAGO'),
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
    return agruparPorCliente(
      memoria.linhas,
      modulos.map((m) => ({ id: m.id, cliente_id: m.cliente_id, identificador: m.identificador })),
    );
  }, [tarifas, modulos, lancamentos, clientes, contratoPorModulo]);

  const faturasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return faturas;
    return faturas.filter((f) => f.cliente_nome.toLowerCase().includes(q));
  }, [faturas, busca]);

  useEffect(() => {
    if (!selecionado && faturas.length > 0) setSelecionado(faturas[0].cliente_key);
  }, [faturas, selecionado]);

  const totalGeral = faturas.reduce((s, f) => s + f.total_fatura_energy, 0);
  const totalCopel = Number(tarifas?.copel_valor_total) || 0;
  const diferenca = totalGeral - totalCopel;

  const faturaSelecionada = faturas.find((f) => f.cliente_key === selecionado) || null;

  const copiarResumo = () => {
    if (!faturaSelecionada || !currentComp) return;
    const f = faturaSelecionada;
    const txt = [
      `Fatura ${f.cliente_nome} — ${currentComp.ano_mes}`,
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
    const headers = ['Cliente', 'Módulos', 'Área m²', 'Demanda kW', 'Cons. Ponta', 'Cons. Fora', 'Cons. Total', 'R$ Demanda', 'R$ Consumo', 'R$ Tributos', 'Fotovolt.', 'TOTAL'];
    const rows = faturas.map((f) => [
      f.cliente_nome,
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
            <FaturaDetalhe fatura={faturaSelecionada} competencia={currentComp?.ano_mes ?? ''} onCopy={copiarResumo} />
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

function FaturaDetalhe({ fatura: f, competencia, onCopy }: { fatura: FaturaCliente; competencia: string; onCopy: () => void }) {
  const tributos = f.icms_total + f.piscof_total + f.iluminacao_publica + f.bandeira_total;
  const consumoR = f.rs_consumo_total + f.rs_perdas;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{f.cliente_nome}</CardTitle>
            <CardDescription className="mt-1">
              Competência <strong>{competencia}</strong> · {f.modulos.length} módulo{f.modulos.length > 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onCopy}>Copiar resumo</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs do cliente */}
        <div className="grid gap-3 md:grid-cols-4">
          <MiniKpi label="Demanda" value={`${num(f.demanda_usd)} kW`} />
          <MiniKpi label="Consumo Ponta" value={`${num(f.consumo_ponta)} kWh`} />
          <MiniKpi label="Consumo Fora" value={`${num(f.consumo_fora)} kWh`} />
          <MiniKpi label="Total a Pagar" value={brl(f.total_fatura_energy)} highlight />
        </div>

        {/* Composição */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Composição da fatura</h4>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Item</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                <Row label="Demanda" v={f.rs_demanda_total} />
                <Row label="Consumo (energia + perdas)" v={consumoR} />
                <Row label="ICMS" v={f.icms_total} />
                <Row label="PIS / COFINS" v={f.piscof_total} />
                <Row label="Iluminação Pública" v={f.iluminacao_publica} />
                <Row label="Bandeira tarifária" v={f.bandeira_total} />
                <Row label="Crédito/Débito rateado" v={f.cred_deb_rateado} />
                <Row label="Fotovoltaico (abatimento)" v={f.fotovoltaico} />
                <Row label="Ajuste manual" v={f.ajuste_manual} />
                <tr className="border-t-2 border-primary bg-primary/5 font-bold">
                  <td className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2 text-right text-primary text-lg">{brl(f.total_fatura_energy)}</td>
                </tr>
                <tr className="text-xs text-muted-foreground">
                  <td className="px-3 py-1">Tributos totais inclusos</td>
                  <td className="px-3 py-1 text-right">{brl(tributos)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Módulos */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Módulos cobertos</h4>
          <div className="flex flex-wrap gap-1.5">
            {f.modulos.map((mod) => (
              <Badge key={mod} variant="secondary" className="font-normal">{mod}</Badge>
            ))}
          </div>
        </div>

        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong>Como foi calculado:</strong> os valores acima são derivados da Fatura Copel do mês, distribuídos
          entre os módulos por área (m²) e consolidados por cliente. Tributos (ICMS, PIS/COFINS) seguem as alíquotas do cadastro.
        </div>
      </CardContent>
    </Card>
  );
}

function MiniKpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? 'border-primary bg-primary/5' : ''}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-1.5">{label}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{brl(v)}</td>
    </tr>
  );
}