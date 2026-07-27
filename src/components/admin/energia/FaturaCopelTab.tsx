import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Save, CheckCircle2, AlertTriangle, Lock, Calculator, Receipt, Percent, Lightbulb, Gauge, Plus, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useSharedCompetencia } from './CompetenciaContext';

// ─── Tipos (reaproveita o mesmo JSONB usado na Memória) ─────────────────
// Catálogo extensível: chaves fixas (core) + chaves opcionais (do catálogo extra).
type CopelItemKey = string;
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
  // chaves opcionais adicionadas manualmente pelo usuário (do catálogo extra)
  extras_keys?: string[];
  // descrição/rótulo livre para item "OUTROS" (key = `outros:<uuid>`)
  extras_labels?: Record<string, string>;
  // ── Bandeira tarifária ──
  // 'oficial' → usa a tarifa tabelada da bandeira vigente (jeito da planilha)
  // 'rateio'  → deriva a tarifa do R$ total lançado na Copel (jeito legado do app)
  bandeira_modo?: BandeiraModo;
  bandeira_vigente?: BandeiraTipo;
  bandeira_tarifa_oficial?: string;
  // Tarifa ANEEL líquida (sem tributos), R$/100 kWh
  bandeira_tarifa_liquida?: string;
  // Quando true, o usuário sobrescreveu manualmente a tarifa com tributos
  bandeira_tarifa_manual?: boolean;
}

// ─── Bandeira tarifária ─────────────────────────────────────────────────
export type BandeiraModo = 'oficial' | 'rateio';
export type BandeiraTipo = 'verde' | 'amarela' | 'vermelha_1' | 'vermelha_2';
/** Tabela de referência ANEEL (R$/kWh, COM tributos) — equivale ao VLOOKUP da planilha. */
const BANDEIRA_TABELA: Record<BandeiraTipo, { label: string; valor: number }> = {
  verde:      { label: 'Verde',        valor: 0 },
  amarela:    { label: 'Amarela',      valor: 0.025464 },
  vermelha_1: { label: 'Vermelha P1',  valor: 0.044630 },
  vermelha_2: { label: 'Vermelha P2',  valor: 0.078770 },
};
/** Tarifas oficiais ANEEL SEM tributos (R$/kWh) — é o número da coluna
 *  "Tarifa unit. (R$)" da fatura da Copel. */
const BANDEIRA_TABELA_LIQUIDA: Record<BandeiraTipo, number> = {
  verde: 0,
  amarela: 0.018850,
  vermelha_1: 0.033010,
  vermelha_2: 0.058270,
};
/** Compat: competências antigas gravaram a tarifa em R$/100 kWh (ex.: 2,5511).
 *  Como nenhuma bandeira real passa de 0,2 R$/kWh, valores ≥ 0,5 são escala antiga. */
const toRsKwh = (n: number) => (n >= 0.5 ? n / 100 : n);
/** Embute ICMS + PIS/COFINS na tarifa líquida (mesma ordem usada no resto do
 *  sistema: ICMS sobre o bruto, PIS/COFINS sobre o líquido de ICMS). */
function grossUpBandeira(liquida: number, aliq: { icms: number; pis: number; cofins: number }): number {
  const icms = aliq.icms / 100;
  const piscof = (aliq.pis + aliq.cofins) / 100;
  const fator = 1 - icms - (1 - icms) * piscof;
  if (!(fator > 0)) return liquida;
  return liquida / fator;
}
const BANDEIRA_ITEM_KEYS: Record<Exclude<BandeiraTipo, 'verde'>, string[]> = {
  amarela:    ['bandeira_amarela_ponta', 'bandeira_amarela_fora'],
  vermelha_1: ['bandeira_vermelha_1_ponta', 'bandeira_vermelha_1_fora'],
  vermelha_2: ['bandeira_vermelha_2_ponta', 'bandeira_vermelha_2_fora'],
};
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

// ─── Catálogo de itens da fatura ────────────────────────────────────────
// `tributacao`:
//   - 'full'        → PIS/COFINS sobre (valor × (1−ICMS)); ICMS sobre valor.
//   - 'isento_icms' → ICMS = 0; PIS/COFINS sobre valor cheio.
//   - 'sem_tributo' → zero tributos (CIP, juros, multa, atualização).
// `sinal`: +1 padrão; -1 para devoluções/créditos (SCEE) — subtrai do total.
// `grupo`: 'core' (sempre, obrigatório) | 'frequente' (sempre visível, pode ficar zerado) |
//          'opcional' (aparece via "+ Adicionar item").
type Tributacao = 'full' | 'isento_icms' | 'sem_tributo';
type Grupo = 'core' | 'frequente' | 'opcional';
interface CopelItemDef {
  key: string;
  label: string;
  unidade: string;
  hasUnitario: boolean;
  tributacao: Tributacao;
  sinal: 1 | -1;
  grupo: Grupo;
  hasTarifa?: boolean;
}
const COPEL_ITEM_DEFS: CopelItemDef[] = [
  // CORE — sempre presentes, obrigatórios
  { key: 'te_ponta',    label: 'ENERGIA ELÉTRICA TE PONTA',    unidade: 'kWh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'core', hasTarifa: true },
  { key: 'usd_ponta',   label: 'ENERGIA ELÉTRICA USD PONTA',   unidade: 'kWh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'core', hasTarifa: true },
  { key: 'te_fora',     label: 'ENERGIA ELÉTRICA TE F PONTA',  unidade: 'kWh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'core', hasTarifa: true },
  { key: 'usd_fora',    label: 'ENERGIA ELÉTRICA USD F PONTA', unidade: 'kWh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'core', hasTarifa: true },
  { key: 'demanda_usd', label: 'DEMANDA USD',                  unidade: 'kW',  hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'core', hasTarifa: true },
  // FREQUENTES — sempre visíveis (zerados quando não há)
  { key: 'demanda_ultrapassagem',  label: 'DEMANDA USD ULTRAP',           unidade: 'kW',  hasUnitario: true, tributacao: 'full',        sinal: 1, grupo: 'frequente', hasTarifa: true },
  { key: 'demanda_isenta_icms',    label: 'DEMANDA USD ISENTA ICMS',      unidade: 'kW',  hasUnitario: true, tributacao: 'isento_icms', sinal: 1, grupo: 'frequente', hasTarifa: true },
  { key: 'iluminacao_publica',     label: 'CONT ILUMIN PÚBLICA MUNICÍPIO', unidade: '—',  hasUnitario: false, tributacao: 'sem_tributo', sinal: 1, grupo: 'frequente' },
  // OPCIONAIS — adicionados via "+ Adicionar item"
  { key: 'bandeira_amarela_ponta',    label: 'ADICIONAL BAND. AMARELA — PONTA',      unidade: 'kWh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'opcional', hasTarifa: true },
  { key: 'bandeira_amarela_fora',     label: 'ADICIONAL BAND. AMARELA — FORA PONTA', unidade: 'kWh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'opcional', hasTarifa: true },
  { key: 'bandeira_vermelha_1_ponta', label: 'ADICIONAL BAND. VERMELHA P1 — PONTA',      unidade: 'kWh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'opcional', hasTarifa: true },
  { key: 'bandeira_vermelha_1_fora',  label: 'ADICIONAL BAND. VERMELHA P1 — FORA PONTA', unidade: 'kWh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'opcional', hasTarifa: true },
  { key: 'bandeira_vermelha_2_ponta', label: 'ADICIONAL BAND. VERMELHA P2 — PONTA',      unidade: 'kWh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'opcional', hasTarifa: true },
  { key: 'bandeira_vermelha_2_fora',  label: 'ADICIONAL BAND. VERMELHA P2 — FORA PONTA', unidade: 'kWh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'opcional', hasTarifa: true },
  { key: 'reativo_ponta',          label: 'ENERGIA REATIVA EXCEDENTE PONTA',     unidade: 'kVArh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'opcional', hasTarifa: true },
  { key: 'reativo_fora',           label: 'ENERGIA REATIVA EXCEDENTE F PONTA',   unidade: 'kVArh', hasUnitario: true, tributacao: 'full', sinal: 1, grupo: 'opcional', hasTarifa: true },
  { key: 'scee_devol_ponta',       label: 'DEVOLUÇÃO SCEE PONTA (geração FV)',   unidade: 'kWh', hasUnitario: true, tributacao: 'sem_tributo', sinal: -1, grupo: 'opcional' },
  { key: 'scee_devol_fora',        label: 'DEVOLUÇÃO SCEE F PONTA (geração FV)', unidade: 'kWh', hasUnitario: true, tributacao: 'sem_tributo', sinal: -1, grupo: 'opcional' },
  { key: 'juros_mora',             label: 'JUROS DE MORA',                       unidade: '—',   hasUnitario: false, tributacao: 'sem_tributo', sinal: 1, grupo: 'opcional' },
  { key: 'multa',                  label: 'MULTA',                               unidade: '—',   hasUnitario: false, tributacao: 'sem_tributo', sinal: 1, grupo: 'opcional' },
  { key: 'atualizacao_monetaria',  label: 'ATUALIZAÇÃO MONETÁRIA',               unidade: '—',   hasUnitario: false, tributacao: 'sem_tributo', sinal: 1, grupo: 'opcional' },
  { key: 'outros',                 label: 'OUTROS (descreva)',                   unidade: '—',   hasUnitario: false, tributacao: 'sem_tributo', sinal: 1, grupo: 'opcional' },
];
const DEF_BY_KEY = new Map(COPEL_ITEM_DEFS.map((d) => [d.key, d]));
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

function normalizeBandeiraBuckets(rawItens: Record<string, any>, pontaKwh: number, foraKwh: number) {
  if (pontaKwh <= 0 || foraKwh <= 0) return rawItens;
  const next = { ...rawItens };
  const pairs = [
    ['bandeira_amarela_ponta', 'bandeira_amarela_fora'],
    ['bandeira_vermelha_1_ponta', 'bandeira_vermelha_1_fora'],
    ['bandeira_vermelha_2_ponta', 'bandeira_vermelha_2_fora'],
  ] as const;

  for (const [pontaKey, foraKey] of pairs) {
    const qPonta = parseBR(next[pontaKey]?.quant || '');
    const qFora = parseBR(next[foraKey]?.quant || '');
    if (qPonta <= 0 || qFora <= 0) continue;
    const pontaPareceFora = Math.abs(qPonta - foraKwh) / foraKwh <= 0.02;
    const foraParecePonta = Math.abs(qFora - pontaKwh) / pontaKwh <= 0.02;
    if (pontaPareceFora && foraParecePonta) {
      const pontaItem = next[pontaKey];
      next[pontaKey] = next[foraKey];
      next[foraKey] = pontaItem;
    }
  }

  return next;
}

// Calcula campos derivados (valor, pis_cofins, icms, tarifa_unit) para um item
// respeitando a regra de tributação do catálogo.
function recalcItem(def: CopelItemDef, curr: CopelItem, aliq: { pis: number; cofins: number; icms: number }): CopelItem {
  return recalcItemImpl(def, curr, aliq);
}

/** Enter (ou Shift+Enter) navega entre os campos da mesma tabela, como numa planilha. */
function gridKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const inputs = Array.from(
    e.currentTarget.closest('table')?.querySelectorAll<HTMLInputElement>('input:not([disabled])') ?? [],
  );
  const idx = inputs.indexOf(e.currentTarget);
  inputs[idx + (e.shiftKey ? -1 : 1)]?.focus();
}

function recalcItemImpl(def: CopelItemDef, curr: CopelItem, aliq: { pis: number; cofins: number; icms: number }): CopelItem {
  if (!def.hasUnitario) return curr;
  const q = parseBR(curr.quant);
  const p = parseBR(curr.preco_unit);
  const valor = q * p;
  const pis = aliq.pis / 100, cofins = aliq.cofins / 100, icms = aliq.icms / 100;
  let vIcms = 0, vPisCof = 0, tarifa = '';
  if (def.tributacao === 'full') {
    vIcms = valor * icms;
    vPisCof = valor * (1 - icms) * (pis + cofins);
    tarifa = def.hasTarifa ? fmtBR(p * (1 - icms) * (1 - pis - cofins), 6) : '';
  } else if (def.tributacao === 'isento_icms') {
    vIcms = 0;
    vPisCof = valor * (pis + cofins);
    tarifa = def.hasTarifa ? fmtBR(p * (1 - pis - cofins), 6) : '';
  } else {
    vIcms = 0; vPisCof = 0; tarifa = '';
  }
  return {
    ...curr,
    valor: fmtBR(valor, 2),
    pis_cofins: fmtBR(vPisCof, 2),
    icms: fmtBR(vIcms, 2),
    tarifa_unit: tarifa,
  };
}

export function FaturaCopelTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const { currentCompId, setCurrentCompId, version } = useSharedCompetencia();
  const [tarifas, setTarifas] = useState<TarifasRow | null>(null);
  const [faturaItens, setFaturaItens] = useState<FaturaCopelItens>({ itens: {}, tributos: {}, total_a_pagar: '', extras_keys: [], extras_labels: {} });
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
    const [t, l, m] = await Promise.all([
      supabase
        .from('energia_competencia_tarifas')
        .select('id, competencia_id, fatura_copel_itens, perdas_energy_ponta_kwh, perdas_energy_fora_kwh, copel_consumo_ponta_kwh, copel_consumo_fora_kwh')
        .eq('competencia_id', compId)
        .maybeSingle(),
      supabase
        .from('energia_competencia_lancamentos')
        .select('modulo_id, consumo_ponta_kwh, consumo_fora_kwh')
        .eq('competencia_id', compId),
      supabase
        .from('energia_modulos')
        .select('id')
        .eq('ativo', true),
    ]);
    if (t.error) toast.error('Erro ao carregar fatura');
    setTarifas((t.data as any) || null);
    const fc = (t.data as any)?.fatura_copel_itens || {};
    // Compat legado: mapeia chaves antigas (bandeira_amarela, bandeira_vermelha_1/2)
    // para o sufixo _fora, preservando os valores lançados.
    const rawItens: Record<string, any> = { ...(fc.itens || {}) };
    const rawExtras: string[] = Array.isArray(fc.extras_keys) ? [...fc.extras_keys] : [];
    const LEGACY_MAP: Record<string, string> = {
      bandeira_amarela: 'bandeira_amarela_fora',
      bandeira_vermelha_1: 'bandeira_vermelha_1_fora',
      bandeira_vermelha_2: 'bandeira_vermelha_2_fora',
    };
    for (const [oldKey, newKey] of Object.entries(LEGACY_MAP)) {
      if (rawItens[oldKey] && !rawItens[newKey]) {
        rawItens[newKey] = rawItens[oldKey];
      }
      delete rawItens[oldKey];
      const idx = rawExtras.indexOf(oldKey);
      if (idx >= 0) rawExtras.splice(idx, 1);
      if (!rawExtras.includes(newKey) && rawItens[newKey]) rawExtras.push(newKey);
    }
    const copelPontaFromItems = parseBR(rawItens.te_ponta?.quant || '') || parseBR(rawItens.usd_ponta?.quant || '') || Number((t.data as any)?.copel_consumo_ponta_kwh) || 0;
    const copelForaFromItems = parseBR(rawItens.te_fora?.quant || '') || parseBR(rawItens.usd_fora?.quant || '') || Number((t.data as any)?.copel_consumo_fora_kwh) || 0;
    const normalizedItens = normalizeBandeiraBuckets(rawItens, copelPontaFromItems, copelForaFromItems);
    // Bandeira: default = jeito da planilha (tarifa oficial). Para competências
    // antigas (sem escolha salva) detectamos a bandeira vigente pelos itens
    // lançados e pré-preenchemos a tarifa tabelada.
    let bandeiraVigente: BandeiraTipo = (fc.bandeira_vigente as BandeiraTipo) || 'verde';
    if (!fc.bandeira_vigente) {
      for (const tipo of ['vermelha_2', 'vermelha_1', 'amarela'] as const) {
        const tem = BANDEIRA_ITEM_KEYS[tipo].some((k) => parseBR(normalizedItens[k]?.valor || '') > 0);
        if (tem) { bandeiraVigente = tipo; break; }
      }
    }
    setFaturaItens({
      itens: normalizedItens,
      tributos: fc.tributos || {},
      total_a_pagar: fc.total_a_pagar || '',
      extras_keys: rawExtras,
      extras_labels: fc.extras_labels || {},
      bandeira_modo: (fc.bandeira_modo as BandeiraModo) || 'oficial',
      bandeira_vigente: bandeiraVigente,
      bandeira_tarifa_oficial: fc.bandeira_tarifa_oficial
        || fmtBR(BANDEIRA_TABELA[bandeiraVigente].valor, 4),
      bandeira_tarifa_liquida: fc.bandeira_tarifa_liquida
        || (fc.bandeira_tarifa_oficial ? '' : fmtBR(BANDEIRA_TABELA_LIQUIDA[bandeiraVigente], 4)),
      bandeira_tarifa_manual: !!fc.bandeira_tarifa_manual,
    });
    const ep = Number((t.data as any)?.perdas_energy_ponta_kwh) || 0;
    const ef = Number((t.data as any)?.perdas_energy_fora_kwh) || 0;
    setEnergyPonta(ep ? fmtBR(ep, 2) : '');
    setEnergyFora(ef ? fmtBR(ef, 2) : '');
    const activeModuloIds = new Set(((m.data as any[]) || []).map((mod) => mod.id));
    const rows = ((l.data as any[]) || []).filter((row) => activeModuloIds.has(row.modulo_id));
    setHasLancamentos(rows.length > 0);
    setClientesPonta(rows.reduce((s, r) => s + (Number(r.consumo_ponta_kwh) || 0), 0));
    setClientesFora(rows.reduce((s, r) => s + (Number(r.consumo_fora_kwh) || 0), 0));
  }, []);

  useEffect(() => { (async () => { setLoading(true); await fetchBase(); setLoading(false); })(); }, [fetchBase, version]);
  useEffect(() => { if (competencias.length && !currentCompId) setCurrentCompId(competencias[0].id); }, [competencias, currentCompId]);
  useEffect(() => { if (currentCompId) fetchComp(currentCompId); }, [currentCompId, fetchComp]);

  const updateItem = (key: CopelItemKey, field: keyof CopelItem, value: string) => {
    setFaturaItens((prev) => {
      const curr = prev.itens?.[key] || emptyItem();
      let next: CopelItem = { ...curr, [field]: value };
      // Resolve def — para items extras dinâmicos "outros:<id>" usa o def base 'outros'.
      const baseKey = key.startsWith('outros:') ? 'outros' : key;
      const def = DEF_BY_KEY.get(baseKey);
      if (def?.hasUnitario && (field === 'quant' || field === 'preco_unit')) {
        next = recalcItem(def, next, aliquotas);
      }
      return { ...prev, itens: { ...(prev.itens || {}), [key]: next } };
    });
  };

  // Auto-tributos: ICMS sobre itens 'full' (com sinal). PIS/COFINS sobre
  // base líquida ICMS desses + base cheia dos itens 'isento_icms'.
  useEffect(() => {
    const it = faturaItens.itens || {};
    const allKeys = Object.keys(it);
    let baseIcms = 0;
    let basePisCofinsIsento = 0;
    for (const k of allKeys) {
      const baseKey = k.startsWith('outros:') ? 'outros' : k;
      const def = DEF_BY_KEY.get(baseKey);
      if (!def) continue;
      const v = parseBR(it[k]?.valor || '') * def.sinal;
      if (def.tributacao === 'full') baseIcms += v;
      else if (def.tributacao === 'isento_icms') basePisCofinsIsento += v;
    }
    const valorIcms = baseIcms * aliquotas.icms / 100;
    const basePisCofins = (baseIcms - valorIcms) + basePisCofinsIsento;
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

  // Recalcula PIS/COFINS e Tarifa unit. por item quando as alíquotas mudam ou
  // ao carregar uma fatura antiga salva com a fórmula errada (sem deduzir ICMS).
  useEffect(() => {
    const pis = aliquotas.pis / 100;
    const cofins = aliquotas.cofins / 100;
    const icms = aliquotas.icms / 100;
    if (!pis && !cofins && !icms) return;
    setFaturaItens((prev) => {
      const it = prev.itens || {};
      let changed = false;
      const nextIt: typeof it = { ...it };
      for (const key of Object.keys(it)) {
        const baseKey = key.startsWith('outros:') ? 'outros' : key;
        const def = DEF_BY_KEY.get(baseKey);
        if (!def || !def.hasUnitario) continue;
        const curr = it[key];
        if (!curr) continue;
        const q = parseBR(curr.quant);
        const p = parseBR(curr.preco_unit);
        if (!q && !p) continue;
        const recalc = recalcItem(def, curr, aliquotas);
        if (recalc.pis_cofins !== curr.pis_cofins || recalc.tarifa_unit !== curr.tarifa_unit || recalc.icms !== curr.icms || recalc.valor !== curr.valor) {
          nextIt[key] = recalc;
          changed = true;
        }
      }
      return changed ? { ...prev, itens: nextIt } : prev;
    });
  }, [aliquotas, faturaItens.itens]);

  // Linhas visíveis na UI: core + frequente sempre; opcional só se em extras_keys.
  const visibleDefs = useMemo<CopelItemDef[]>(() => {
    const extras = faturaItens.extras_keys || [];
    const base = COPEL_ITEM_DEFS.filter((d) => d.grupo !== 'opcional');
    const opcionais: CopelItemDef[] = [];
    for (const k of extras) {
      if (k.startsWith('outros:')) {
        const baseDef = DEF_BY_KEY.get('outros')!;
        const label = (faturaItens.extras_labels || {})[k] || baseDef.label;
        opcionais.push({ ...baseDef, key: k, label });
      } else {
        const d = DEF_BY_KEY.get(k);
        if (d) opcionais.push(d);
      }
    }
    return [...base, ...opcionais];
  }, [faturaItens.extras_keys, faturaItens.extras_labels]);

  const sumValor = useMemo(() => {
    const it = faturaItens.itens || {};
    return visibleDefs.reduce((s, d) => s + parseBR(it[d.key]?.valor || '') * d.sinal, 0);
  }, [faturaItens.itens, visibleDefs]);

  const addExtra = (key: string) => {
    setFaturaItens((prev) => {
      const list = prev.extras_keys || [];
      let newKey = key;
      let labels = prev.extras_labels || {};
      if (key === 'outros') {
        newKey = `outros:${Date.now().toString(36)}`;
        labels = { ...labels, [newKey]: 'OUTROS' };
      } else if (list.includes(key)) {
        return prev; // já existe
      }
      return { ...prev, extras_keys: [...list, newKey], extras_labels: labels };
    });
  };
  const removeExtra = (key: string) => {
    setFaturaItens((prev) => {
      const list = (prev.extras_keys || []).filter((k) => k !== key);
      const { [key]: _omit, ...nextItens } = (prev.itens || {}) as Record<string, CopelItem>;
      const labels = { ...(prev.extras_labels || {}) };
      delete labels[key];
      return { ...prev, extras_keys: list, itens: nextItens, extras_labels: labels };
    });
  };
  const renameOutros = (key: string, label: string) => {
    setFaturaItens((prev) => ({ ...prev, extras_labels: { ...(prev.extras_labels || {}), [key]: label } }));
  };
  const opcionaisDisponiveis = COPEL_ITEM_DEFS.filter(
    (d) => d.grupo === 'opcional' && (d.key === 'outros' || !(faturaItens.extras_keys || []).includes(d.key))
  );
  const totalAPagar = parseBR(faturaItens.total_a_pagar || '');
  const diff = totalAPagar > 0 ? sumValor - totalAPagar : 0;
  const diffAbs = Math.abs(diff);
  const bateOk = totalAPagar > 0 && diffAbs < 0.01;
  // Tolerância de arredondamento: a Copel arredonda cada linha antes de somar,
  // então uma diferença de alguns centavos é esperada. Trate ≤ R$ 1,00 como OK.
  const bateArredondamento = totalAPagar > 0 && !bateOk && diffAbs <= 1.0;
  const diffAceitavel = totalAPagar > 0 && !bateOk && !bateArredondamento && diffAbs <= 10.0;

  const splitBandeira = (foraKey: string, pontaKey: string, totalPonta: number, totalFora: number, preco: number) => {
    const def = DEF_BY_KEY.get(pontaKey);
    const forDef = DEF_BY_KEY.get(foraKey);
    if (!def || !forDef) return;
    setFaturaItens((prev) => {
      const nextIt = { ...(prev.itens || {}) } as Record<string, CopelItem>;
      const pontaItem = recalcItem(def, { ...emptyItem(), quant: fmtBR(totalPonta, 0), preco_unit: fmtBR(preco, 6) }, aliquotas);
      const foraItem  = recalcItem(forDef, { ...emptyItem(), quant: fmtBR(totalFora,  0), preco_unit: fmtBR(preco, 6) }, aliquotas);
      nextIt[pontaKey] = pontaItem;
      nextIt[foraKey]  = foraItem;
      const extras = prev.extras_keys || [];
      const nextExtras = extras.includes(pontaKey) ? extras : [...extras, pontaKey];
      return { ...prev, itens: nextIt, extras_keys: nextExtras };
    });
    toast.success('Bandeira separada em Ponta / Fora Ponta.');
  };

  // ─── Medidor (Energy) & Diferença Copel ──────────────────────────
  const copelPontaKwh = useMemo(() => {
    const it = faturaItens.itens || {};
    const fromItens = parseBR(it.te_ponta?.quant || '') || parseBR(it.usd_ponta?.quant || '');
    return fromItens || Number((tarifas as any)?.copel_consumo_ponta_kwh) || 0;
  }, [faturaItens.itens, tarifas]);
  const copelForaKwh = useMemo(() => {
    const it = faturaItens.itens || {};
    const fromItens = parseBR(it.te_fora?.quant || '') || parseBR(it.usd_fora?.quant || '');
    return fromItens || Number((tarifas as any)?.copel_consumo_fora_kwh) || 0;
  }, [faturaItens.itens, tarifas]);
  const difCopelPonta = copelPontaKwh - clientesPonta;
  const difCopelFora = copelForaKwh - clientesFora;
  const energyPontaNum = parseBR(energyPonta);
  const energyForaNum = parseBR(energyFora);
  const perdasTotaisPonta = energyPontaNum + difCopelPonta;
  const perdasTotaisFora = energyForaNum + difCopelFora;

  // ─── Detecção de bandeira somada em uma linha só (Ponta + Fora) ─────
  // Bug histórico: faturas antigas migradas para o novo esquema Ponta/Fora ficam
  // com todo o kWh no bucket "_fora". Sinal disso: quant do _fora ≈ Ponta+Fora.
  const bandeirasFundidas = useMemo(() => {
    const it = faturaItens.itens || {};
    const totalPonta = parseBR(it.te_ponta?.quant || '') || copelPontaKwh;
    const totalFora  = parseBR(it.te_fora?.quant  || '') || copelForaKwh;
    if (totalPonta <= 0 || totalFora <= 0) return [] as Array<{ key: string; label: string; pair: string; qtdFora: number; totalPonta: number; totalFora: number; preco: number }>;
    const pairs = [
      { fora: 'bandeira_amarela_fora',     ponta: 'bandeira_amarela_ponta',     label: 'Bandeira Amarela' },
      { fora: 'bandeira_vermelha_1_fora',  ponta: 'bandeira_vermelha_1_ponta',  label: 'Bandeira Vermelha P1' },
      { fora: 'bandeira_vermelha_2_fora',  ponta: 'bandeira_vermelha_2_ponta',  label: 'Bandeira Vermelha P2' },
    ];
    const out: Array<{ key: string; label: string; pair: string; qtdFora: number; totalPonta: number; totalFora: number; preco: number }> = [];
    for (const p of pairs) {
      const qFora = parseBR(it[p.fora]?.quant || '');
      const qPonta = parseBR(it[p.ponta]?.quant || '');
      if (qFora <= 0 || qPonta > 0) continue;
      const expectedCombined = totalPonta + totalFora;
      if (Math.abs(qFora - expectedCombined) / expectedCombined <= 0.01 && qFora >= totalFora * 1.5) {
        out.push({
          key: p.fora, label: p.label, pair: p.ponta,
          qtdFora: qFora, totalPonta, totalFora,
          preco: parseBR(it[p.fora]?.preco_unit || ''),
        });
      }
    }
    return out;
  }, [faturaItens.itens, copelPontaKwh, copelForaKwh]);

  // ─── Bandeira: tarifa oficial × rateio fechado ───────────────────────
  const bandeiraModo: BandeiraModo = faturaItens.bandeira_modo || 'oficial';
  const bandeiraTipo: BandeiraTipo = faturaItens.bandeira_vigente || 'verde';
  const bandeiraInfo = useMemo(() => {
    const it = faturaItens.itens || {};
    const keys = [
      'bandeira_amarela_ponta', 'bandeira_amarela_fora',
      'bandeira_vermelha_1_ponta', 'bandeira_vermelha_1_fora',
      'bandeira_vermelha_2_ponta', 'bandeira_vermelha_2_fora',
    ];
    const copelReais = keys.reduce((s, k) => s + parseBR(it[k]?.valor || ''), 0);
    // Preço unitário COM tributos digitado na própria fatura (R$/kWh → R$/100 kWh)
    const precoFatura = keys.map((k) => parseBR(it[k]?.preco_unit || '')).find((v) => v > 0) || 0;
    const tarifaFatura = precoFatura * 100;
    const baseKwh = copelPontaKwh + copelForaKwh + energyPontaNum + energyForaNum;
    const tarifaDerivada = baseKwh > 0 && copelReais > 0 ? (copelReais * 100) / baseKwh : 0;
    // Tarifa líquida (sem tributos): campo salvo, ou engenharia reversa do valor
    // legado gravado em bandeira_tarifa_oficial, ou a tabela ANEEL.
    const salvaLiquida = parseBR(faturaItens.bandeira_tarifa_liquida || '');
    const salvaBruta = parseBR(faturaItens.bandeira_tarifa_oficial || '');
    const fatorGross = grossUpBandeira(1, aliquotas);
    const tarifaLiquida = salvaLiquida > 0
      ? salvaLiquida
      : (salvaBruta > 0 ? salvaBruta / (fatorGross || 1) : BANDEIRA_TABELA_LIQUIDA[bandeiraTipo]);
    const tarifaBrutaCalc = grossUpBandeira(tarifaLiquida, aliquotas);
    // Manual: usuário sobrescreveu a tarifa com tributos
    const tarifaOficial = faturaItens.bandeira_tarifa_manual && salvaBruta > 0 ? salvaBruta : tarifaBrutaCalc;
    const totalOficial = (baseKwh / 100) * tarifaOficial;
    const totalDerivado = (baseKwh / 100) * tarifaDerivada;
    const tarifaAtiva = bandeiraModo === 'oficial' ? tarifaOficial : tarifaDerivada;
    const totalAtivo = bandeiraModo === 'oficial' ? totalOficial : totalDerivado;
    return {
      copelReais, baseKwh, tarifaDerivada, tarifaOficial, totalOficial, totalDerivado,
      tarifaAtiva, totalAtivo, tarifaLiquida, tarifaBrutaCalc, tarifaFatura,
    };
  }, [
    faturaItens.itens, faturaItens.bandeira_tarifa_oficial, faturaItens.bandeira_tarifa_liquida,
    faturaItens.bandeira_tarifa_manual, bandeiraModo, bandeiraTipo, aliquotas,
    copelPontaKwh, copelForaKwh, energyPontaNum, energyForaNum,
  ]);

  const setBandeiraTipo = (tipo: BandeiraTipo) => {
    setFaturaItens((p) => ({
      ...p,
      bandeira_vigente: tipo,
      bandeira_tarifa_liquida: fmtBR(BANDEIRA_TABELA_LIQUIDA[tipo], 4),
      bandeira_tarifa_manual: false,
      bandeira_tarifa_oficial: fmtBR(grossUpBandeira(BANDEIRA_TABELA_LIQUIDA[tipo], aliquotas), 4),
    }));
  };

  const save = async () => {
    if (!tarifas) return;
    // Guarda-corpo: se alguma bandeira "_fora" está com quant absurdamente maior
    // que o consumo fora (indício de linhas Ponta+Fora fundidas), bloquear.
    const it0 = faturaItens.itens || {};
    const forasSuspeitas: string[] = [];
    for (const kFora of ['bandeira_amarela_fora','bandeira_vermelha_1_fora','bandeira_vermelha_2_fora']) {
      const qFora = parseBR(it0[kFora]?.quant || '');
      if (qFora > 0 && copelForaKwh > 0 && qFora >= copelForaKwh * 1.5) forasSuspeitas.push(kFora);
    }
    if (forasSuspeitas.length > 0) {
      toast.error('Revise a Bandeira: a quantidade em "Fora Ponta" parece incluir o consumo Ponta. Use o botão "Separar Ponta/Fora" no topo da tabela.');
      return;
    }
    setSaving(true);
    const it = normalizeBandeiraBuckets(faturaItens.itens || {}, copelPontaKwh, copelForaKwh);
    const faturaItensToSave: FaturaCopelItens = {
      ...faturaItens,
      itens: it,
      bandeira_modo: bandeiraModo,
      bandeira_vigente: bandeiraTipo,
      bandeira_tarifa_liquida: fmtBR(bandeiraInfo.tarifaLiquida, 4),
      bandeira_tarifa_manual: !!faturaItens.bandeira_tarifa_manual,
      bandeira_tarifa_oficial: fmtBR(bandeiraInfo.tarifaOficial, 4),
    };
    const v = (k: CopelItemKey) => parseBR(it[k]?.valor || '');
    const q = (k: CopelItemKey) => parseBR(it[k]?.quant || '');
    const tarif = (k: CopelItemKey) => parseBR(it[k]?.tarifa_unit || '');
    const preco = (k: CopelItemKey) => parseBR(it[k]?.preco_unit || '');
    const trib = faturaItens.tributos || {};
    const tval = (t?: CopelTributo) => parseBR(t?.valor || '');
    const piscof = tval(trib.pis) + tval(trib.cofins);
    const ultrap = v('demanda_ultrapassagem');
    // ── Bandeira (R$/100 kWh) ───────────────────────────────────────
    // Modo 'oficial' (planilha): usa a tarifa tabelada da bandeira vigente.
    // Modo 'rateio' (legado): deriva a tarifa do R$ total lançado na Copel —
    // o engine de rateio (src/lib/energia-rateio.ts) aplica bandeira como
    //   BM/BN = ((Q + perdas_rateadas) / 100) * bandeira_valor
    // Somando todos os clientes: R$ = ((consumo + perdas) / 100) * bandeira_valor
    // Portanto, para reproduzir o total R$ de bandeira lançado na Copel:
    //   bandeira_valor = bandeiraReais * 100 / (copelKwh + energyLosses)
    const bandeiraValor = bandeiraInfo.tarifaAtiva;
    const mirror = {
      copel_consumo_ponta_kwh: q('te_ponta') || q('usd_ponta'),
      copel_consumo_fora_kwh: q('te_fora') || q('usd_fora'),
      copel_demanda_kw: q('demanda_usd'),
      copel_valor_te_ponta: v('te_ponta'),
      copel_valor_tusd_ponta: v('usd_ponta'),
      copel_valor_te_fora: v('te_fora'),
      copel_valor_tusd_fora: v('usd_fora'),
      copel_valor_demanda: v('demanda_usd') + v('demanda_isenta_icms'),
      copel_valor_ultrapassagem: ultrap,
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
      // Tarifas usadas pelo engine de rateio — cada competência usa as suas
      // Usar o PREÇO UNITÁRIO digitado (bruto da Copel), não a tarifa "limpa"
      // pós-tributos, para que a fatura do cliente reflita o que foi lançado.
      demanda_usd: preco('demanda_usd'),
      te_ponta:    preco('te_ponta'),
      tusd_ponta:  preco('usd_ponta'),
      te_fora:     preco('te_fora'),
      tusd_fora:   preco('usd_fora'),
      ultrapassagem: preco('demanda_ultrapassagem'),
      demanda_isenta: preco('demanda_isenta_icms'),
      // Bandeira (R$/100 kWh) para o rateio por cliente
      bandeira_valor: bandeiraValor,
    };
    const { error } = await supabase
      .from('energia_competencia_tarifas')
      .update({
        fatura_copel_itens: faturaItensToSave as any,
        ...mirror,
        perdas_energy_ponta_kwh: energyPontaNum,
        perdas_energy_fora_kwh: energyForaNum,
        // Não clampar: diferenças negativas (Copel mediu menos que a soma
        // dos clientes) também precisam compor as perdas totais para o rateio
        // bater com a planilha do Mega Curitiba.
        perdas_copel_ponta_kwh: difCopelPonta,
        perdas_copel_fora_kwh: difCopelFora,
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
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {currentComp ? (
              <>
                <span>Competência <strong className="text-foreground">{currentComp.ano_mes}</strong></span>
                {isLocked && (
                  <Badge variant="secondary" className="h-7">
                    <Lock className="h-3.5 w-3.5 mr-1" /> Fechada — somente leitura
                  </Badge>
                )}
              </>
            ) : (
              <span>Selecione a competência na barra acima.</span>
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

          {/* Bandeira tarifária — modo de cálculo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" /> Bandeira tarifária — como cobrar do cliente
              </CardTitle>
              <CardDescription className="text-xs">
                Escolha se a bandeira é cobrada pela tarifa oficial da ANEEL (igual à planilha) ou rateando exatamente o R$ lançado na fatura da Copel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm" disabled={isLocked}
                  variant={bandeiraModo === 'oficial' ? 'default' : 'outline'}
                  onClick={() => setFaturaItens((p) => ({ ...p, bandeira_modo: 'oficial' }))}
                >
                  Tarifa oficial (planilha)
                </Button>
                <Button
                  size="sm" disabled={isLocked}
                  variant={bandeiraModo === 'rateio' ? 'default' : 'outline'}
                  onClick={() => setFaturaItens((p) => ({ ...p, bandeira_modo: 'rateio' }))}
                >
                  Rateio fechado (fatura Copel)
                </Button>
              </div>

              {bandeiraModo === 'oficial' && (
                <div className="space-y-2">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Bandeira vigente</Label>
                    <Select value={bandeiraTipo} disabled={isLocked} onValueChange={(v) => setBandeiraTipo(v as BandeiraTipo)}>
                      <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(BANDEIRA_TABELA) as BandeiraTipo[]).map((k) => (
                          <SelectItem key={k} value={k}>{BANDEIRA_TABELA[k].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tarifa ANEEL — sem tributos (R$/100 kWh)</Label>
                    <Input
                      type="text" inputMode="decimal" disabled={isLocked}
                      className="h-8 w-[170px] text-xs text-right bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300/60"
                      onFocus={(e) => e.currentTarget.select()}
                      value={faturaItens.bandeira_tarifa_liquida ?? fmtBR(bandeiraInfo.tarifaLiquida, 4)}
                      onChange={(e) => setFaturaItens((p) => ({ ...p, bandeira_tarifa_liquida: e.target.value, bandeira_tarifa_manual: false }))}
                    />
                    <div className="text-[10px] text-muted-foreground">Coluna “Tarifa unit. (R$)” × 100 da fatura</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tarifa COM tributos — usada na cobrança</Label>
                    <Input
                      type="text" inputMode="decimal" disabled={isLocked}
                      className="h-8 w-[190px] text-xs text-right font-semibold bg-primary/5 border-primary/40"
                      onFocus={(e) => e.currentTarget.select()}
                      value={faturaItens.bandeira_tarifa_manual
                        ? (faturaItens.bandeira_tarifa_oficial || '')
                        : fmtBR(bandeiraInfo.tarifaBrutaCalc, 4)}
                      onChange={(e) => setFaturaItens((p) => ({ ...p, bandeira_tarifa_oficial: e.target.value, bandeira_tarifa_manual: true }))}
                    />
                    <div className="text-[10px] text-muted-foreground">
                      {faturaItens.bandeira_tarifa_manual ? (
                        <button type="button" className="underline" onClick={() => setFaturaItens((p) => ({ ...p, bandeira_tarifa_manual: false }))}>
                          Sobrescrito — voltar ao calculado ({fmtBR(bandeiraInfo.tarifaBrutaCalc, 4)})
                        </button>
                      ) : (
                        <>ICMS {fmtBR(aliquotas.icms, 2)}% + PIS/COFINS {fmtBR(aliquotas.pis + aliquotas.cofins, 2)}% embutidos</>
                      )}
                    </div>
                  </div>
                </div>
                {bandeiraInfo.tarifaFatura > 0 && bandeiraInfo.tarifaOficial > 0 &&
                  Math.abs(bandeiraInfo.tarifaFatura - bandeiraInfo.tarifaOficial) / bandeiraInfo.tarifaFatura > 0.005 && (
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 flex flex-wrap items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    A fatura traz <strong>{fmtBR(bandeiraInfo.tarifaFatura, 4)}</strong> R$/100 kWh com tributos (preço unit. das linhas de bandeira).
                    <button
                      type="button" className="underline" disabled={isLocked}
                      onClick={() => setFaturaItens((p) => ({ ...p, bandeira_tarifa_oficial: fmtBR(bandeiraInfo.tarifaFatura, 4), bandeira_tarifa_manual: true }))}
                    >
                      usar o valor da fatura
                    </button>
                  </div>
                )}
                </div>
              )}

              {/* Comparativo */}
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                <div className={`rounded-md border p-3 space-y-1 ${bandeiraModo === 'oficial' ? 'border-primary bg-primary/5' : ''}`}>
                  <div className="font-semibold">Tarifa oficial (planilha)</div>
                  <div className="text-muted-foreground">Tarifa ANEEL (sem tributos): <strong className="text-foreground">{fmtBR(bandeiraInfo.tarifaLiquida, 4)}</strong> R$/100 kWh</div>
                  <div className="text-muted-foreground">Tarifa cobrada (com tributos): <strong className="text-foreground">{fmtBR(bandeiraInfo.tarifaOficial, 4)}</strong> R$/100 kWh</div>
                  <div className="text-muted-foreground">Total cobrado dos clientes: <strong className="text-foreground">{brl(bandeiraInfo.totalOficial)}</strong></div>
                  <div className="text-muted-foreground">
                    Sobra/falta vs. Copel: <strong className="text-foreground">{brl(bandeiraInfo.totalOficial - bandeiraInfo.copelReais)}</strong>
                  </div>
                </div>
                <div className={`rounded-md border p-3 space-y-1 ${bandeiraModo === 'rateio' ? 'border-primary bg-primary/5' : ''}`}>
                  <div className="font-semibold">Rateio fechado (fatura Copel)</div>
                  <div className="text-muted-foreground">Tarifa: <strong className="text-foreground">{fmtBR(bandeiraInfo.tarifaDerivada, 4)}</strong> R$/100 kWh</div>
                  <div className="text-muted-foreground">Total cobrado dos clientes: <strong className="text-foreground">{brl(bandeiraInfo.totalDerivado)}</strong></div>
                  <div className="text-muted-foreground">Sobra/falta vs. Copel: <strong className="text-foreground">{brl(0)}</strong></div>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Bandeira lançada na fatura Copel: <strong className="text-foreground">{brl(bandeiraInfo.copelReais)}</strong> ·
                base do rateio: <strong className="text-foreground">{fmtBR(bandeiraInfo.baseKwh, 2)}</strong> kWh (consumo Copel + perdas)
              </div>

              <details className="text-[11px] text-muted-foreground">
                <summary className="cursor-pointer text-foreground font-medium">Como é calculado (os dois jeitos)</summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <strong className="text-foreground">Por que “com tributos”:</strong> o motor de rateio soma a bandeira
                    direto no total do cliente, sem aplicar imposto depois. Por isso a tarifa usada precisa já conter
                    ICMS e PIS/COFINS — é o mesmo número da coluna “Preço unit (R$) com tributos” da fatura da Copel.
                    O app parte da tarifa oficial líquida e embute os tributos: <em>líquida ÷ (1 − ICMS − (1 − ICMS) × PIS/COFINS)</em>.
                  </div>
                  <div>
                    <strong className="text-foreground">Tarifa oficial (planilha):</strong> cada cliente paga
                    <em> ((consumo + perdas rateadas) ÷ 100) × tarifa tabelada da ANEEL</em>. É o preço público da bandeira,
                    fácil de o cliente conferir. Como a bandeira também incide sobre as perdas técnicas, a soma cobrada
                    fica um pouco <strong>maior</strong> que o valor de bandeira da fatura da Copel — essa sobra fica com o condomínio.
                  </div>
                  <div>
                    <strong className="text-foreground">Rateio fechado (fatura Copel):</strong> a tarifa é derivada —
                    <em> (R$ total de bandeira da Copel × 100) ÷ (kWh Copel + perdas)</em> — e depois aplicada da mesma forma.
                    A soma cobrada dos clientes <strong>fecha exatamente</strong> com a Copel (sem sobra nem falta), mas o
                    R$/100 kWh mostrado não é o número oficial da ANEEL.
                  </div>
                  <div>
                    <strong className="text-foreground">Qual é mais justo:</strong> a tarifa oficial é mais transparente
                    para o cliente; o rateio fechado é mais justo para o conjunto, porque ninguém paga mais nem menos
                    que o total real da Copel.
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>

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
                {bandeirasFundidas.length > 0 && !isLocked && (
                  <Alert className="mb-3 border-amber-400 bg-amber-50 dark:bg-amber-950/30">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-sm">Bandeira lançada em uma linha só</AlertTitle>
                    <AlertDescription className="text-xs space-y-2">
                      <div>
                        Detectamos que <strong>{bandeirasFundidas.map((b) => b.label).join(', ')}</strong> está com o kWh de <em>Ponta + Fora Ponta</em> juntos na linha "Fora Ponta".
                        A Copel imprime em duas linhas separadas — assim os tributos por posto ficam corretos e o rateio funciona por Ponta/Fora.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {bandeirasFundidas.map((b) => (
                          <Button key={b.key} size="sm" variant="outline" className="h-7 text-xs border-amber-500 text-amber-800 dark:text-amber-200"
                            onClick={() => splitBandeira(b.key, b.pair, b.totalPonta, b.totalFora, b.preco)}>
                            Separar {b.label}: {fmtBR(b.totalPonta, 0)} P + {fmtBR(b.totalFora, 0)} FP
                          </Button>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
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
                      {visibleDefs.map((d) => {
                        const v = faturaItens.itens?.[d.key] || emptyItem();
                        const hasPisCofins = d.tributacao !== 'sem_tributo';
                        const hasIcms = d.tributacao === 'full';
                        const hasTarifa = !!d.hasTarifa;
                        const isOpcional = d.grupo === 'opcional';
                        const isOutros = d.key.startsWith('outros:');
                        const calcInp = (val: string, on: (s: string) => void) => (
                          <Input type="text" inputMode="decimal" disabled={isLocked}
                            className="h-7 text-[11px] px-1 text-right bg-muted/30"
                            onFocus={(e) => e.currentTarget.select()}
                            onKeyDown={gridKeyDown}
                            value={val} onChange={(e) => on(e.target.value)} />
                        );
                        const editInp = (val: string, on: (s: string) => void) => (
                          <Input type="text" inputMode="decimal" disabled={isLocked}
                            className="h-7 text-[11px] px-1 text-right bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300/60"
                            onFocus={(e) => e.currentTarget.select()}
                            onKeyDown={gridKeyDown}
                            value={val} onChange={(e) => on(e.target.value)} />
                        );
                        return (
                          <tr key={d.key} className={
                            d.key === 'iluminacao_publica' ? 'bg-blue-50/30 dark:bg-blue-950/20'
                            : isOpcional ? 'bg-violet-50/30 dark:bg-violet-950/20'
                            : ''
                          }>
                            <td className="border px-2 py-1 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                {d.key === 'iluminacao_publica' && <Lightbulb className="inline h-3 w-3 text-blue-500" />}
                                {d.sinal === -1 && <span className="text-emerald-600 font-bold">−</span>}
                                {isOutros ? (
                                  <Input
                                    type="text" disabled={isLocked}
                                    className="h-6 text-[11px] px-1 w-44 inline-block"
                                    value={(faturaItens.extras_labels || {})[d.key] || ''}
                                    onChange={(e) => renameOutros(d.key, e.target.value)}
                                    placeholder="Descreva o item..." />
                                ) : (
                                  <span>{d.label}</span>
                                )}
                                {isOpcional && !isLocked && (
                                  <button
                                    type="button"
                                    title="Remover item"
                                    onClick={() => removeExtra(d.key)}
                                    className="ml-auto text-muted-foreground hover:text-red-600">
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="border px-2 py-1 text-center text-muted-foreground">{d.unidade}</td>
                            <td className="border px-1 py-1">{d.hasUnitario ? editInp(v.quant, (s) => updateItem(d.key, 'quant', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                            <td className="border px-1 py-1">{d.hasUnitario ? editInp(v.preco_unit, (s) => updateItem(d.key, 'preco_unit', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                            <td className="border px-1 py-1">{calcInp(v.valor, (s) => updateItem(d.key, 'valor', s))}</td>
                            <td className="border px-1 py-1">{hasPisCofins ? calcInp(v.pis_cofins, (s) => updateItem(d.key, 'pis_cofins', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                            <td className="border px-1 py-1">{hasIcms ? calcInp(v.icms, (s) => updateItem(d.key, 'icms', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                            <td className="border px-1 py-1">{hasTarifa ? calcInp(v.tarifa_unit, (s) => updateItem(d.key, 'tarifa_unit', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                          </tr>
                        );
                      })}
                      {/* Linha "+ Adicionar item" */}
                      {!isLocked && (
                        <tr>
                          <td className="border bg-muted/20 px-2 py-1.5" colSpan={8}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={opcionaisDisponiveis.length === 0}>
                                  <Plus className="h-3.5 w-3.5" /> Adicionar item da fatura
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-72 max-h-96 overflow-y-auto">
                                <DropdownMenuLabel>Itens opcionais</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {opcionaisDisponiveis.map((d) => (
                                  <DropdownMenuItem key={d.key} onClick={() => addExtra(d.key)} className="flex flex-col items-start gap-0.5">
                                    <span className="text-xs font-medium">
                                      {d.sinal === -1 ? '− ' : ''}{d.label}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {d.unidade} · {d.tributacao === 'full' ? 'tributação cheia' : d.tributacao === 'isento_icms' ? 'isento ICMS' : 'sem tributos'}
                                    </span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )}
                      <tr className="bg-primary/5 font-bold">
                        <td className="border px-2 py-1.5 text-right" colSpan={4}>TOTAL</td>
                        <td className="border px-2 py-1.5 text-right tabular-nums text-primary">{brl(sumValor)}</td>
                        <td className="border" colSpan={3}>
                          <div className="flex items-center justify-end gap-2 pr-2">
                            {totalAPagar > 0 && (
                              bateOk ? (
                                <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Bate com fatura</Badge>
                              ) : bateArredondamento ? (
                                <Badge title="A Copel arredonda cada linha antes de somar; diferenças de centavos são normais." className="bg-green-600/80 hover:bg-green-600/80"><CheckCircle2 className="h-3 w-3 mr-1" /> Bate ({brl(diff)} · arredondamento Copel)</Badge>
                              ) : diffAceitavel ? (
                                <Badge className="bg-amber-500 hover:bg-amber-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" /> Diferença {brl(diff)}</Badge>
                              ) : (
                                <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Diferença {brl(diff)}</Badge>
                              )
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
                  Mesmo cálculo da aba Lançamentos: <strong>TOTAL Fatura Copel − TOTAL Preenchido</strong>.
                  {!hasLancamentos && ' Sem lançamentos de clientes nesta competência — preencha na Memória de Cálculo.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      <th className="border bg-muted px-2 py-1 text-left font-semibold"></th>
                      <th className="border bg-muted px-2 py-1 font-semibold">Ponta (kWh)</th>
                      <th className="border bg-muted px-2 py-1 font-semibold">Fora da Ponta (kWh)</th>
                      <th className="border bg-muted px-2 py-1 font-semibold">Total (kWh)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-primary/5 font-semibold">
                      <td className="border px-2 py-1">TOTAL Preenchido</td>
                      <td className="border px-2 py-1 text-right tabular-nums">{hasLancamentos ? fmtBR(clientesPonta, 2) : '—'}</td>
                      <td className="border px-2 py-1 text-right tabular-nums">{hasLancamentos ? fmtBR(clientesFora, 2) : '—'}</td>
                      <td className="border px-2 py-1 text-right tabular-nums">{hasLancamentos ? fmtBR(clientesPonta + clientesFora, 2) : '—'}</td>
                    </tr>
                    <tr className="bg-primary/5 font-semibold">
                      <td className="border px-2 py-1">TOTAL Fatura Copel</td>
                      <td className="border px-2 py-1 text-right tabular-nums">{copelPontaKwh ? fmtBR(copelPontaKwh, 2) : '—'}</td>
                      <td className="border px-2 py-1 text-right tabular-nums">{copelForaKwh ? fmtBR(copelForaKwh, 2) : '—'}</td>
                      <td className="border px-2 py-1 text-right tabular-nums">{(copelPontaKwh + copelForaKwh) ? fmtBR(copelPontaKwh + copelForaKwh, 2) : '—'}</td>
                    </tr>
                    <tr className="bg-primary/10 font-bold">
                      <td className="border px-2 py-1">Diferença (Copel − Preenchido)</td>
                      {[
                        { entered: clientesPonta, total: copelPontaKwh },
                        { entered: clientesFora, total: copelForaKwh },
                        { entered: clientesPonta + clientesFora, total: copelPontaKwh + copelForaKwh },
                      ].map((c, i) => {
                        const diff = c.total - c.entered;
                        const cls = c.total <= 0
                          ? 'text-muted-foreground'
                          : Math.abs(diff) < 0.01
                            ? 'text-green-600'
                            : diff > 0 ? 'text-amber-600' : 'text-red-600';
                        const txt = c.total <= 0
                          ? '—'
                          : Math.abs(diff) < 0.01
                            ? '0,00'
                            : diff > 0 ? `+${fmtBR(diff, 2)}` : `−${fmtBR(-diff, 2)}`;
                        return (
                          <td key={i} className={`border px-2 py-1 text-right tabular-nums ${cls}`}>{txt}</td>
                        );
                      })}
                    </tr>
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
                bateOk ? (
                  <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Bate com a fatura</Badge>
                ) : bateArredondamento ? (
                  <Badge title="A Copel arredonda cada linha antes de somar; diferenças de centavos são normais." className="bg-green-600/80 hover:bg-green-600/80"><CheckCircle2 className="h-3 w-3 mr-1" /> Bate ({brl(diff)} · arredondamento Copel)</Badge>
                ) : diffAceitavel ? (
                  <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-500"><AlertTriangle className="h-3 w-3 mr-1" /> Diferença {brl(diff)}</Badge>
                ) : (
                  <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Diferença {brl(diff)}</Badge>
                )
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