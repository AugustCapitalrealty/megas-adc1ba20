import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Save, CheckCircle2, AlertTriangle, Lock, Calculator, Receipt, Percent, Lightbulb, Gauge } from 'lucide-react';
import { toast } from 'sonner';

// ─── Tipos (reaproveita o mesmo JSONB usado na Memória) ─────────────────
type CopelItemKey = 'te_ponta' | 'usd_ponta' | 'te_fora' | 'usd_fora' | 'demanda_usd' | 'iluminacao_publica';
interface CopelItem {
  quant: string;
  preco_unit: string;
  valor: string;
  pis_cofins: string;
  icms: string;
  tarifa_unit: string;
}
interface CopelTributo { base: string; aliquota: string; valor: string; }
interface FaturaCopelItens {
  itens?: Partial<Record<CopelItemKey, CopelItem>>;
  tributos?: { icms?: CopelTributo; cofins?: CopelTributo; pis?: CopelTributo };
  total_a_pagar?: string;
}
interface Competencia {
  id: string;
  ano_mes: string;
  status: 'rascunho' | 'fechada';
}
interface TarifasRow {
  id: string;
  competencia_id: string;
  fatura_copel_itens?: any;
  perdas_energy_ponta_kwh?: number | null;
  perdas_energy_fora_kwh?: number | null;
}

const COPEL_ITEM_DEFS: { key: CopelItemKey; label: string; unidade: string; hasUnitario: boolean; hasPisCofins: boolean; hasIcms: boolean; hasTarifa: boolean }[] = [
  { key: 'te_ponta',           label: 'ENERGIA ELÉTRICA TE PONTA',     unidade: 'kWh', hasUnitario: true, hasPisCofins: true, hasIcms: true, hasTarifa: true },
  { key: 'usd_ponta',          label: 'ENERGIA ELÉTRICA USD PONTA',    unidade: 'kWh', hasUnitario: true, hasPisCofins: true, hasIcms: true, hasTarifa: true },
  { key: 'te_fora',            label: 'ENERGIA ELÉTRICA TE F PONTA',   unidade: 'kWh', hasUnitario: true, hasPisCofins: true, hasIcms: true, hasTarifa: true },
  { key: 'usd_fora',           label: 'ENERGIA ELÉTRICA USD F PONTA',  unidade: 'kWh', hasUnitario: true, hasPisCofins: true, hasIcms: true, hasTarifa: true },
  { key: 'demanda_usd',        label: 'DEMANDA USD',                   unidade: 'kW',  hasUnitario: true, hasPisCofins: true, hasIcms: true, hasTarifa: true },
  { key: 'iluminacao_publica', label: 'CONT ILUMIN PÚBLICA MUNICÍPIO', unidade: '—',   hasUnitario: false, hasPisCofins: false, hasIcms: false, hasTarifa: false },
];
const emptyItem = (): CopelItem => ({ quant: '', preco_unit: '', valor: '', pis_cofins: '', icms: '', tarifa_unit: '' });
const emptyTrib = (): CopelTributo => ({ base: '', aliquota: '', valor: '' });

const parseBR = (s: string): number => {
  if (s == null) return 0;
  const t = String(s).trim();
  if (!t) return 0;
  const cleaned = t.replace(/[^\d.,-]/g, '');
  if (cleaned.includes(',')) return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(cleaned.replace(/\./g, '')) || 0;
};
const fmtBR = (n: number, dec = 2) =>
  !n || !isFinite(n) ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export function FaturaCopelTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [currentCompId, setCurrentCompId] = useState<string | null>(null);
  const [tarifas, setTarifas] = useState<TarifasRow | null>(null);
  const [faturaItens, setFaturaItens] = useState<FaturaCopelItens>({ itens: {}, tributos: {}, total_a_pagar: '' });
  const [aliquotas, setAliquotas] = useState({ pis: 0, cofins: 0, icms: 0 });
  const [saving, setSaving] = useState(false);
  const [energyPonta, setEnergyPonta] = useState('');
  const [energyFora, setEnergyFora] = useState('');
  const [clientesPonta, setClientesPonta] = useState(0);
  const [clientesFora, setClientesFora] = useState(0);
  const [hasLancamentos, setHasLancamentos] = useState(false);

  const currentComp = competencias.find((c) => c.id === currentCompId) || null;
  const isLocked = currentComp?.status === 'fechada';

  const fetchBase = useCallback(async () => {
    const [c, par] = await Promise.all([
      supabase.from('energia_competencias').select('id, ano_mes, status').order('ano_mes', { ascending: false }),
      supabase.from('energia_parametros' as any).select('icms_pct, pis_pct, cofins_pct').limit(1).maybeSingle(),
    ]);
    if (c.error) toast.error('Erro ao carregar competências');
    else setCompetencias((c.data as any) || []);
    if (par.data) {
      const p: any = par.data;
      setAliquotas({ pis: Number(p.pis_pct) || 0, cofins: Number(p.cofins_pct) || 0, icms: Number(p.icms_pct) || 0 });
    }
  }, []);

  const fetchComp = useCallback(async (compId: string) => {
    const [t, l] = await Promise.all([
      supabase
        .from('energia_competencia_tarifas')
        .select('id, competencia_id, fatura_copel_itens, perdas_energy_ponta_kwh, perdas_energy_fora_kwh')
        .eq('competencia_id', compId)
        .maybeSingle(),
      supabase
        .from('energia_competencia_lancamentos')
        .select('consumo_ponta_kwh, consumo_fora_kwh')
        .eq('competencia_id', compId),
    ]);
    if (t.error) toast.error('Erro ao carregar fatura');
    setTarifas((t.data as any) || null);
    const fc = (t.data as any)?.fatura_copel_itens || {};
    setFaturaItens({ itens: fc.itens || {}, tributos: fc.tributos || {}, total_a_pagar: fc.total_a_pagar || '' });
    const ep = Number((t.data as any)?.perdas_energy_ponta_kwh) || 0;
    const ef = Number((t.data as any)?.perdas_energy_fora_kwh) || 0;
    setEnergyPonta(ep ? fmtBR(ep, 2) : '');
    setEnergyFora(ef ? fmtBR(ef, 2) : '');
    const rows = (l.data as any[]) || [];
    setHasLancamentos(rows.length > 0);
    setClientesPonta(rows.reduce((s, r) => s + (Number(r.consumo_ponta_kwh) || 0), 0));
    setClientesFora(rows.reduce((s, r) => s + (Number(r.consumo_fora_kwh) || 0), 0));
  }, []);

  useEffect(() => { (async () => { setLoading(true); await fetchBase(); setLoading(false); })(); }, [fetchBase]);
  useEffect(() => { if (competencias.length && !currentCompId) setCurrentCompId(competencias[0].id); }, [competencias, currentCompId]);
  useEffect(() => { if (currentCompId) fetchComp(currentCompId); }, [currentCompId, fetchComp]);

  const updateItem = (key: CopelItemKey, field: keyof CopelItem, value: string) => {
    setFaturaItens((prev) => {
      const curr = prev.itens?.[key] || emptyItem();
      let next: CopelItem = { ...curr, [field]: value };
      const def = COPEL_ITEM_DEFS.find((d) => d.key === key);
      if (def?.hasUnitario && (field === 'quant' || field === 'preco_unit')) {
        const q = parseBR(next.quant);
        const p = parseBR(next.preco_unit);
        const valor = q * p;
        const pis = aliquotas.pis / 100;
        const cofins = aliquotas.cofins / 100;
        const icms = aliquotas.icms / 100;
        next = {
          ...next,
          valor: fmtBR(valor, 2),
          pis_cofins: fmtBR(valor * (pis + cofins), 2),
          icms: fmtBR(valor * icms, 2),
          tarifa_unit: fmtBR(p * (1 - pis - cofins - icms), 6),
        };
      }
      return { ...prev, itens: { ...(prev.itens || {}), [key]: next } };
    });
  };

  // Auto-tributos
  useEffect(() => {
    const it = faturaItens.itens || {};
    // Base ICMS = soma dos itens tributáveis (bruto). PIS/COFINS incidem
    // sobre a base já líquida do ICMS ("cálculo por dentro" da Copel).
    const baseIcms = COPEL_ITEM_DEFS.filter((d) => d.hasPisCofins).reduce((s, d) => s + parseBR(it[d.key]?.valor || ''), 0);
    const valorIcms = baseIcms * aliquotas.icms / 100;
    const basePisCofins = baseIcms - valorIcms;
    const next = {
      icms: { base: fmtBR(baseIcms, 2), aliquota: fmtBR(aliquotas.icms, 2), valor: fmtBR(valorIcms, 2) },
      cofins: { base: fmtBR(basePisCofins, 2), aliquota: fmtBR(aliquotas.cofins, 2), valor: fmtBR(basePisCofins * aliquotas.cofins / 100, 2) },
      pis: { base: fmtBR(basePisCofins, 2), aliquota: fmtBR(aliquotas.pis, 2), valor: fmtBR(basePisCofins * aliquotas.pis / 100, 2) },
    };
    setFaturaItens((prev) => {
      const tr = prev.tributos || {};
      const same = (a?: CopelTributo, b?: CopelTributo) => a && b && a.base === b.base && a.aliquota === b.aliquota && a.valor === b.valor;
      if (same(tr.icms, next.icms) && same(tr.cofins, next.cofins) && same(tr.pis, next.pis)) return prev;
      return { ...prev, tributos: next };
    });
  }, [faturaItens.itens, aliquotas]);

  const sumValor = useMemo(() => {
    const it = faturaItens.itens || {};
    return COPEL_ITEM_DEFS.reduce((s, d) => s + parseBR(it[d.key]?.valor || ''), 0);
  }, [faturaItens.itens]);
  const totalAPagar = parseBR(faturaItens.total_a_pagar || '');
  const diff = totalAPagar > 0 ? sumValor - totalAPagar : 0;
  const bateOk = totalAPagar > 0 && Math.abs(diff) < 0.01;

  // ─── Medidor (Energy) & Diferença Copel ──────────────────────────
  const copelPontaKwh = useMemo(() => {
    const it = faturaItens.itens || {};
    return parseBR(it.te_ponta?.quant || '') || parseBR(it.usd_ponta?.quant || '');
  }, [faturaItens.itens]);
  const copelForaKwh = useMemo(() => {
    const it = faturaItens.itens || {};
    return parseBR(it.te_fora?.quant || '') || parseBR(it.usd_fora?.quant || '');
  }, [faturaItens.itens]);
  const difCopelPonta = clientesPonta - copelPontaKwh;
  const difCopelFora = clientesFora - copelForaKwh;
  const energyPontaNum = parseBR(energyPonta);
  const energyForaNum = parseBR(energyFora);
  const perdasTotaisPonta = energyPontaNum + difCopelPonta;
  const perdasTotaisFora = energyForaNum + difCopelFora;

  const save = async () => {
    if (!tarifas) return;
    setSaving(true);
    const it = faturaItens.itens || {};
    const v = (k: CopelItemKey) => parseBR(it[k]?.valor || '');
    const q = (k: CopelItemKey) => parseBR(it[k]?.quant || '');
    const tarif = (k: CopelItemKey) => parseBR(it[k]?.tarifa_unit || '');
    const trib = faturaItens.tributos || {};
    const tval = (t?: CopelTributo) => parseBR(t?.valor || '');
    const piscof = tval(trib.pis) + tval(trib.cofins);
    const mirror = {
      copel_consumo_ponta_kwh: q('te_ponta') || q('usd_ponta'),
      copel_consumo_fora_kwh: q('te_fora') || q('usd_fora'),
      copel_demanda_kw: q('demanda_usd'),
      copel_valor_te_ponta: v('te_ponta'),
      copel_valor_tusd_ponta: v('usd_ponta'),
      copel_valor_te_fora: v('te_fora'),
      copel_valor_tusd_fora: v('usd_fora'),
      copel_valor_demanda: v('demanda_usd'),
      copel_valor_iluminacao_publica: v('iluminacao_publica'),
      copel_valor_icms: tval(trib.icms),
      copel_valor_pis_cofins: piscof,
      copel_valor_total: sumValor,
      // Tarifas unitárias pós-tributos da Copel (cativo). NÃO sobrescrever as
      // tarifas do Mercado Livre que ficam em demanda_usd/te_*/tusd_* e são
      // editadas separadamente na aba Memória de Cálculo.
      copel_tarifa_te_ponta: tarif('te_ponta'),
      copel_tarifa_tusd_ponta: tarif('usd_ponta'),
      copel_tarifa_te_fora: tarif('te_fora'),
      copel_tarifa_tusd_fora: tarif('usd_fora'),
      copel_tarifa_demanda_usd: tarif('demanda_usd'),
      iluminacao_publica: v('iluminacao_publica'),
    };
    const { error } = await supabase
      .from('energia_competencia_tarifas')
      .update({
        fatura_copel_itens: faturaItens as any,
        ...mirror,
        perdas_energy_ponta_kwh: energyPontaNum,
        perdas_energy_fora_kwh: energyForaNum,
        perdas_copel_ponta_kwh: Math.max(0, difCopelPonta),
        perdas_copel_fora_kwh: Math.max(0, difCopelFora),
        updated_by: user?.id,
      } as any)
      .eq('id', tarifas.id);
    setSaving(false);
    if (error) toast.error('Erro ao salvar fatura Copel');
    else toast.success('Fatura Copel salva');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Fatura Copel</CardTitle>
          <CardDescription>
            Lance a fatura mensal da Copel exatamente como ela aparece impressa. Você digita só <strong>Quant.</strong> e <strong>Preço unit.</strong> — o resto é calculado automaticamente a partir das alíquotas do cadastro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <Label>Competência</Label>
              <Select value={currentCompId ?? ''} onValueChange={setCurrentCompId}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {competencias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.ano_mes} {c.status === 'fechada' ? '🔒' : ''}</SelectItem>
                  ))}
                  {competencias.length === 0 && <div className="p-2 text-sm text-muted-foreground">Crie uma competência na aba Memória de Cálculo.</div>}
                </SelectContent>
              </Select>
            </div>
            {currentComp && (
              <Badge variant={isLocked ? 'secondary' : 'default'} className="h-9 px-3 text-sm">
                {isLocked ? <><Lock className="h-3.5 w-3.5 mr-1" /> Fechada</> : '📝 Rascunho'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!currentComp ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Selecione uma competência para começar.</CardContent></Card>
      ) : !tarifas ? (
        <div className="flex items-center justify-center min-h-[150px]"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              icon={<Calculator className="h-4 w-4" />}
              label="Total calculado"
              value={brl(sumValor)}
              hint="Soma dos itens"
              tone="primary"
            />
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Receipt className="h-4 w-4" /> Total a pagar (Copel)
                </div>
                <Input
                  type="text"
                  inputMode="decimal"
                  disabled={isLocked}
                  placeholder="0,00"
                  className="h-9 text-lg font-bold text-right bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300/60"
                  value={faturaItens.total_a_pagar || ''}
                  onChange={(e) => setFaturaItens((p) => ({ ...p, total_a_pagar: e.target.value }))}
                />
                <div className="text-[10px] text-muted-foreground mt-1">Cabeçalho da fatura impressa</div>
              </CardContent>
            </Card>
            <KpiCard
              icon={bateOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              label="Diferença"
              value={totalAPagar > 0 ? brl(diff) : '—'}
              hint={totalAPagar <= 0 ? 'Digite o total a pagar' : bateOk ? 'Bate com a fatura ✓' : 'Revise os itens'}
              tone={totalAPagar <= 0 ? 'muted' : bateOk ? 'success' : 'warning'}
            />
            <KpiCard
              icon={<Percent className="h-4 w-4" />}
              label="Alíquotas do cadastro"
              value={`${fmtBR(aliquotas.icms, 2)}% / ${fmtBR(aliquotas.cofins, 2)}% / ${fmtBR(aliquotas.pis, 2)}%`}
              hint="ICMS / COFINS / PIS"
              tone="muted"
            />
          </div>

          {/* Itens + Tributos */}
          <div className="grid lg:grid-cols-[1fr,300px] gap-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Itens de fatura</CardTitle>
                <CardDescription className="text-xs">
                  Colunas amarelas são entrada. Cinza claro é calculado automaticamente — você ainda pode sobrescrever se precisar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr>
                        <th className="border bg-muted text-left px-2 py-1.5 font-semibold">Item</th>
                        <th className="border bg-muted px-2 py-1.5 font-semibold w-10">Un.</th>
                        <th className="border bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1.5 font-semibold">Quant.</th>
                        <th className="border bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1.5 font-semibold">Preço unit (R$)</th>
                        <th className="border bg-muted/60 px-2 py-1.5 font-semibold">Valor (R$)</th>
                        <th className="border bg-muted/60 px-2 py-1.5 font-semibold">PIS/COFINS</th>
                        <th className="border bg-muted/60 px-2 py-1.5 font-semibold">ICMS</th>
                        <th className="border bg-muted/60 px-2 py-1.5 font-semibold">Tarifa unit.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COPEL_ITEM_DEFS.map((d) => {
                        const v = faturaItens.itens?.[d.key] || emptyItem();
                        const calcInp = (val: string, on: (s: string) => void) => (
                          <Input type="text" inputMode="decimal" disabled={isLocked}
                            className="h-7 text-[11px] px-1 text-right bg-muted/30"
                            value={val} onChange={(e) => on(e.target.value)} />
                        );
                        const editInp = (val: string, on: (s: string) => void) => (
                          <Input type="text" inputMode="decimal" disabled={isLocked}
                            className="h-7 text-[11px] px-1 text-right bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300/60"
                            value={val} onChange={(e) => on(e.target.value)} />
                        );
                        return (
                          <tr key={d.key} className={d.key === 'iluminacao_publica' ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}>
                            <td className="border px-2 py-1 whitespace-nowrap">
                              {d.key === 'iluminacao_publica' && <Lightbulb className="inline h-3 w-3 mr-1 text-blue-500" />}
                              {d.label}
                            </td>
                            <td className="border px-2 py-1 text-center text-muted-foreground">{d.unidade}</td>
                            <td className="border px-1 py-1">{d.hasUnitario ? editInp(v.quant, (s) => updateItem(d.key, 'quant', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                            <td className="border px-1 py-1">{d.hasUnitario ? editInp(v.preco_unit, (s) => updateItem(d.key, 'preco_unit', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                            <td className="border px-1 py-1">{calcInp(v.valor, (s) => updateItem(d.key, 'valor', s))}</td>
                            <td className="border px-1 py-1">{d.hasPisCofins ? calcInp(v.pis_cofins, (s) => updateItem(d.key, 'pis_cofins', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                            <td className="border px-1 py-1">{d.hasIcms ? calcInp(v.icms, (s) => updateItem(d.key, 'icms', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                            <td className="border px-1 py-1">{d.hasTarifa ? calcInp(v.tarifa_unit, (s) => updateItem(d.key, 'tarifa_unit', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-primary/5 font-bold">
                        <td className="border px-2 py-1.5 text-right" colSpan={4}>TOTAL</td>
                        <td className="border px-2 py-1.5 text-right tabular-nums text-primary">{brl(sumValor)}</td>
                        <td className="border" colSpan={3}>
                          <div className="flex items-center justify-end gap-2 pr-2">
                            {totalAPagar > 0 && (
                              bateOk
                                ? <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Bate com fatura</Badge>
                                : <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-500"><AlertTriangle className="h-3 w-3 mr-1" /> Diferença {brl(diff)}</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Tributos calculados</CardTitle>
                  <CardDescription className="text-xs">Base × alíquota do cadastro. Atualiza sozinho.</CardDescription>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr>
                        <th className="border bg-muted px-2 py-1 text-left font-semibold">Trib.</th>
                        <th className="border bg-muted px-2 py-1 font-semibold">Base</th>
                        <th className="border bg-muted px-2 py-1 font-semibold">%</th>
                        <th className="border bg-muted px-2 py-1 font-semibold">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['icms', 'cofins', 'pis'] as const).map((k) => {
                        const t = faturaItens.tributos?.[k] || emptyTrib();
                        return (
                          <tr key={k}>
                            <td className="border px-2 py-1 font-semibold uppercase">{k}</td>
                            <td className="border px-2 py-1 text-right tabular-nums">{t.base || '—'}</td>
                            <td className="border px-2 py-1 text-right tabular-nums">{t.aliquota || '—'}</td>
                            <td className="border px-2 py-1 text-right tabular-nums">{t.valor || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Como funciona</CardTitle>
                </CardHeader>
                <CardContent className="text-[12px] space-y-1.5">
                  <Step n={1}>Digite <strong>Quant.</strong> e <strong>Preço unit.</strong> de cada linha.</Step>
                  <Step n={2}>O sistema calcula Valor, PIS/COFINS, ICMS e a tarifa "limpa".</Step>
                  <Step n={3}>Compare o <strong>Total calculado</strong> com <strong>Total a pagar</strong> e salve.</Step>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Medidor (Energy) & Diferença Copel */}
          <div className="grid lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Diferença da Fatura Copel
                </CardTitle>
                <CardDescription className="text-xs">
                  Consumo somado dos clientes (lançamentos) menos o consumo da fatura Copel.
                  {!hasLancamentos && ' Sem lançamentos de clientes nesta competência — preencha na Memória de Cálculo.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      <th className="border bg-muted px-2 py-1 text-left font-semibold">Período</th>
                      <th className="border bg-muted px-2 py-1 font-semibold">Clientes (kWh)</th>
                      <th className="border bg-muted px-2 py-1 font-semibold">Copel (kWh)</th>
                      <th className="border bg-muted px-2 py-1 font-semibold">Diferença (kWh)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Ponta', cli: clientesPonta, copel: copelPontaKwh, dif: difCopelPonta },
                      { label: 'Fora da Ponta', cli: clientesFora, copel: copelForaKwh, dif: difCopelFora },
                      { label: 'Total', cli: clientesPonta + clientesFora, copel: copelPontaKwh + copelForaKwh, dif: difCopelPonta + difCopelFora, bold: true },
                    ].map((r) => (
                      <tr key={r.label} className={r.bold ? 'bg-primary/5 font-bold' : ''}>
                        <td className="border px-2 py-1">{r.label}</td>
                        <td className="border px-2 py-1 text-right tabular-nums">{hasLancamentos ? fmtBR(r.cli, 2) : '—'}</td>
                        <td className="border px-2 py-1 text-right tabular-nums">{r.copel ? fmtBR(r.copel, 2) : '—'}</td>
                        <td className={`border px-2 py-1 text-right tabular-nums ${r.dif > 0 ? 'text-amber-600' : r.dif < 0 ? 'text-red-600' : ''}`}>
                          {hasLancamentos && r.copel ? fmtBR(r.dif, 2) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" /> Medidor (Energy)
                </CardTitle>
                <CardDescription className="text-xs">
                  Digite as perdas identificadas no medidor Energy. As <strong>Perdas Totais</strong> somam o que você digitou com a diferença da fatura Copel.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      <th className="border bg-muted px-2 py-1 text-left font-semibold">Período</th>
                      <th className="border bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 font-semibold">Energy (kWh)</th>
                      <th className="border bg-muted/60 px-2 py-1 font-semibold">Diferença Copel (kWh)</th>
                      <th className="border bg-muted/60 px-2 py-1 font-semibold">Perdas Totais (kWh)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border px-2 py-1">Ponta</td>
                      <td className="border px-1 py-1">
                        <Input type="text" inputMode="decimal" disabled={isLocked}
                          className="h-7 text-[12px] px-1 text-right bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300/60"
                          value={energyPonta} onChange={(e) => setEnergyPonta(e.target.value)} placeholder="0,00" />
                      </td>
                      <td className="border px-2 py-1 text-right tabular-nums text-muted-foreground">{hasLancamentos ? fmtBR(difCopelPonta, 2) : '—'}</td>
                      <td className="border px-2 py-1 text-right tabular-nums font-semibold">{fmtBR(perdasTotaisPonta, 2) || '0,00'}</td>
                    </tr>
                    <tr>
                      <td className="border px-2 py-1">Fora da Ponta</td>
                      <td className="border px-1 py-1">
                        <Input type="text" inputMode="decimal" disabled={isLocked}
                          className="h-7 text-[12px] px-1 text-right bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300/60"
                          value={energyFora} onChange={(e) => setEnergyFora(e.target.value)} placeholder="0,00" />
                      </td>
                      <td className="border px-2 py-1 text-right tabular-nums text-muted-foreground">{hasLancamentos ? fmtBR(difCopelFora, 2) : '—'}</td>
                      <td className="border px-2 py-1 text-right tabular-nums font-semibold">{fmtBR(perdasTotaisFora, 2) || '0,00'}</td>
                    </tr>
                    <tr className="bg-primary/5 font-bold">
                      <td className="border px-2 py-1">Total</td>
                      <td className="border px-2 py-1 text-right tabular-nums">{fmtBR(energyPontaNum + energyForaNum, 2) || '0,00'}</td>
                      <td className="border px-2 py-1 text-right tabular-nums">{hasLancamentos ? fmtBR(difCopelPonta + difCopelFora, 2) : '—'}</td>
                      <td className="border px-2 py-1 text-right tabular-nums text-primary">{fmtBR(perdasTotaisPonta + perdasTotaisFora, 2) || '0,00'}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Barra inferior fixa */}
      {currentComp && tarifas && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur border-t shadow-lg">
          <div className="container max-w-screen-2xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total calculado: </span>
                <span className="font-bold text-primary">{brl(sumValor)}</span>
              </div>
              {totalAPagar > 0 && (
                bateOk
                  ? <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Bate com a fatura</Badge>
                  : <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-500"><AlertTriangle className="h-3 w-3 mr-1" /> Diferença {brl(diff)}</Badge>
              )}
            </div>
            <Button onClick={save} disabled={isLocked || saving} size="lg">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Fatura Copel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KPI helpers ────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: 'primary' | 'success' | 'warning' | 'muted' }) {
  const toneClasses =
    tone === 'success' ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20' :
    tone === 'warning' ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' :
    tone === 'primary' ? 'border-primary/30 bg-primary/5' :
    '';
  const valueClasses =
    tone === 'success' ? 'text-green-700 dark:text-green-400' :
    tone === 'warning' ? 'text-amber-700 dark:text-amber-400' :
    tone === 'primary' ? 'text-primary' :
    '';
  return (
    <Card className={toneClasses}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon} {label}</div>
        <div className={`text-xl font-bold ${valueClasses}`}>{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">{n}</span>
      <span>{children}</span>
    </div>
  );
}