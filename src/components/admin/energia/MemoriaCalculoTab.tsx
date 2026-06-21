import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Plus, Copy, Lock, Unlock, Download, ClipboardList, CheckCircle2, AlertTriangle, Receipt, Users, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  calcularMemoria,
  DEFAULT_TARIFAS,
  type EnergiaTarifas,
  type EnergiaLancamentoInput,
  type MemoriaLinha,
  agruparPorCliente,
  type FaturaCliente,
} from '@/lib/energia-rateio';

interface Competencia {
  id: string;
  ano_mes: string;
  status: 'rascunho' | 'fechada';
  observacao: string | null;
  fechada_em: string | null;
}
interface Modulo {
  id: string;
  identificador: string;
  area_m2: number;
  ordem: number;
  ativo: boolean;
  demanda_contratada_kw: number;
  cliente_id: string | null;
}
interface Cliente { id: string; nome: string; razao_social: string | null; }
interface ContratoVigente { modulo_id: string; demanda_contratada_kw: number; numero_contrato: string; }
interface TarifasRow extends EnergiaTarifas { id: string; competencia_id: string; }

// ─── Fatura Copel: itens (mesmo layout impresso) ─────────────────────────
type CopelItemKey = 'te_ponta' | 'usd_ponta' | 'te_fora' | 'usd_fora' | 'demanda_usd' | 'iluminacao_publica';
interface CopelItem {
  quant: string;            // input livre (kWh / kW)
  preco_unit: string;       // R$ unit. com tributos
  valor: string;            // R$
  pis_cofins: string;       // R$
  icms: string;             // R$
  tarifa_unit: string;      // R$/kWh ou R$/kW
}
interface CopelTributo {
  base: string;             // R$
  aliquota: string;         // % (ex: "19", "5,80", "1,26")
  valor: string;            // R$
}
interface FaturaCopelItens {
  itens?: Partial<Record<CopelItemKey, CopelItem>>;
  tributos?: { icms?: CopelTributo; cofins?: CopelTributo; pis?: CopelTributo };
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

// ─── Consumo por Cliente (entrada manual) ────────────────────────────────
interface ConsumoCliente {
  cliente_key: string;        // cliente.id, ou 'AREA_COMUM'
  demanda_kw: string;         // input livre
  consumo_ponta_kwh: string;
  consumo_fora_kwh: string;
}

interface CopelFatura {
  copel_demanda_kw: number;
  copel_consumo_ponta_kwh: number;
  copel_consumo_fora_kwh: number;
  copel_valor_te_ponta: number;
  copel_valor_tusd_ponta: number;
  copel_valor_te_fora: number;
  copel_valor_tusd_fora: number;
  copel_valor_demanda: number;
  copel_valor_ultrapassagem: number;
  copel_valor_icms: number;
  copel_valor_pis_cofins: number;
  copel_valor_bandeira: number;
  copel_valor_iluminacao_publica: number;
  copel_cred_deb: number;
  copel_valor_total: number;
}
interface LancamentoRow {
  id?: string;
  competencia_id: string;
  modulo_id: string;
  demanda_contratada_kw: number;
  demanda_usd_medida_kw: number;
  consumo_ponta_kwh: number;
  consumo_fora_kwh: number;
  ajuste_manual_reais: number;
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const num = (n: number, dec = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

// Parse pt-BR free text (vírgula = decimal, ponto = milhar). Aceita também "1.234,56".
const parseBR = (s: string): number => {
  if (s == null) return 0;
  const t = String(s).trim();
  if (!t) return 0;
  const cleaned = t.replace(/[^\d.,-]/g, '');
  // Formato pt-BR da fatura: vírgula = decimal, ponto = SEMPRE milhar.
  // "43.689" => 43689 ; "0,549525" => 0.549525 ; "1.234,56" => 1234.56
  if (cleaned.includes(',')) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return Number(cleaned.replace(/\./g, '')) || 0;
};

// Formato livre estilo fatura: preserva o que o usuário digitou.
// Usado apenas para inputs livres (text). Para exibições calculadas usamos brl/num.

function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const TARIFA_FIELDS: { key: keyof EnergiaTarifas; label: string; group: string; step?: string }[] = [
  { key: 'demanda_usd', label: 'R$ Demanda USD (kW)', group: 'Demanda', step: '0.000001' },
  { key: 'demanda_isenta', label: 'R$ Demanda Isenta (kW)', group: 'Demanda', step: '0.000001' },
  { key: 'ultrapassagem', label: 'R$ Ultrapassagem (kW)', group: 'Demanda', step: '0.000001' },
  { key: 'te_ponta', label: 'TE Ponta (R$/kWh)', group: 'Tarifa', step: '0.000001' },
  { key: 'tusd_ponta', label: 'TUSD Ponta (R$/kWh)', group: 'Tarifa', step: '0.000001' },
  { key: 'te_fora', label: 'TE Fora Ponta (R$/kWh)', group: 'Tarifa', step: '0.000001' },
  { key: 'tusd_fora', label: 'TUSD Fora Ponta (R$/kWh)', group: 'Tarifa', step: '0.000001' },
  { key: 'iluminacao_publica', label: 'Iluminação Pública (R$)', group: 'Tarifa', step: '0.01' },
  { key: 'pis_pct', label: 'PIS (decimal, ex 0.0165)', group: 'Tributos', step: '0.0001' },
  { key: 'cofins_pct', label: 'COFINS (decimal, ex 0.076)', group: 'Tributos', step: '0.0001' },
  { key: 'icms_pct', label: 'ICMS (decimal, ex 0.19)', group: 'Tributos', step: '0.0001' },
  { key: 'bandeira_valor', label: 'Bandeira (R$/100 kWh)', group: 'Tributos', step: '0.01' },
  { key: 'perdas_copel_ponta_kwh', label: 'Perdas Copel Ponta (kWh)', group: 'Perdas', step: '0.01' },
  { key: 'perdas_copel_fora_kwh', label: 'Perdas Copel Fora (kWh)', group: 'Perdas', step: '0.01' },
  { key: 'perdas_energy_ponta_kwh', label: 'Perdas Energy Ponta (kWh)', group: 'Perdas', step: '0.01' },
  { key: 'perdas_energy_fora_kwh', label: 'Perdas Energy Fora (kWh)', group: 'Perdas', step: '0.01' },
  { key: 'cred_deb_fatura', label: 'Créd/Déb Fatura (R$)', group: 'Outros', step: '0.01' },
];

const COPEL_FIELDS: { key: keyof CopelFatura; label: string; group: string; step?: string; getCalc?: (m: any) => number }[] = [
  { key: 'copel_demanda_kw', label: 'Demanda (kW)', group: 'Grandezas', step: '0.01', getCalc: (m) => m?.totais.demanda_usd ?? 0 },
  { key: 'copel_consumo_ponta_kwh', label: 'Consumo Ponta (kWh)', group: 'Grandezas', step: '0.01', getCalc: (m) => m?.totais.consumo_ponta ?? 0 },
  { key: 'copel_consumo_fora_kwh', label: 'Consumo Fora (kWh)', group: 'Grandezas', step: '0.01', getCalc: (m) => m?.totais.consumo_fora ?? 0 },
  { key: 'copel_valor_te_ponta', label: 'R$ TE Ponta', group: 'Valores R$', step: '0.01', getCalc: (m) => m?.totais.rs_te_ponta ?? 0 },
  { key: 'copel_valor_tusd_ponta', label: 'R$ TUSD Ponta', group: 'Valores R$', step: '0.01', getCalc: (m) => m?.totais.rs_tusd_ponta ?? 0 },
  { key: 'copel_valor_te_fora', label: 'R$ TE Fora', group: 'Valores R$', step: '0.01', getCalc: (m) => m?.totais.rs_te_fora ?? 0 },
  { key: 'copel_valor_tusd_fora', label: 'R$ TUSD Fora', group: 'Valores R$', step: '0.01', getCalc: (m) => m?.totais.rs_tusd_fora ?? 0 },
  { key: 'copel_valor_demanda', label: 'R$ Demanda', group: 'Valores R$', step: '0.01', getCalc: (m) => m?.totais.rs_demanda_total ?? 0 },
  { key: 'copel_valor_ultrapassagem', label: 'R$ Ultrapassagem', group: 'Valores R$', step: '0.01', getCalc: (m) => m?.totais.rs_ultrapassagem ?? 0 },
  { key: 'copel_valor_icms', label: 'R$ ICMS', group: 'Tributos', step: '0.01', getCalc: (m) => m?.totais.icms_total ?? 0 },
  { key: 'copel_valor_pis_cofins', label: 'R$ PIS/COFINS', group: 'Tributos', step: '0.01', getCalc: (m) => m?.totais.piscof_total ?? 0 },
  { key: 'copel_valor_bandeira', label: 'R$ Bandeira', group: 'Tributos', step: '0.01', getCalc: (m) => m?.totais.bandeira_total ?? 0 },
  { key: 'copel_valor_iluminacao_publica', label: 'R$ Iluminação Pública', group: 'Tributos', step: '0.01', getCalc: (m) => m?.totais.iluminacao_publica ?? 0 },
  { key: 'copel_cred_deb', label: 'R$ Crédito/Débito', group: 'Total', step: '0.01', getCalc: (m) => m?.totais.cred_deb_rateado ?? 0 },
  { key: 'copel_valor_total', label: 'TOTAL Fatura', group: 'Total', step: '0.01', getCalc: (m) => m?.totais.total_fatura_copel ?? 0 },
];

export function MemoriaCalculoTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [currentCompId, setCurrentCompId] = useState<string | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tarifas, setTarifas] = useState<TarifasRow | null>(null);
  const [lancamentos, setLancamentos] = useState<Record<string, LancamentoRow>>({});
  const [contratoPorModulo, setContratoPorModulo] = useState<Record<string, ContratoVigente>>({});
  const [newAnoMes, setNewAnoMes] = useState(currentYM());
  const [creating, setCreating] = useState(false);
  const [faturaItens, setFaturaItens] = useState<FaturaCopelItens>({ itens: {}, tributos: {} });
  const [consumoCli, setConsumoCli] = useState<Record<string, ConsumoCliente>>({});
  const [savingFatura, setSavingFatura] = useState(false);
  const [savingConsumo, setSavingConsumo] = useState(false);
  // Alíquotas vindas do cadastro (energia_parametros). Valores em % (ex.: 19, 1.65, 7.6)
  const [aliquotas, setAliquotas] = useState<{ pis: number; cofins: number; icms: number }>({ pis: 0, cofins: 0, icms: 0 });

  const currentComp = competencias.find((c) => c.id === currentCompId) || null;
  const isLocked = currentComp?.status === 'fechada';

  // ─── Loaders ───────────────────────────────────────────
  const fetchBase = useCallback(async () => {
    const [c, m, cli, par] = await Promise.all([
      supabase.from('energia_competencias').select('*').order('ano_mes', { ascending: false }),
      supabase.from('energia_modulos').select('*').eq('ativo', true).order('ordem'),
      supabase.from('energia_clientes').select('id, nome, razao_social'),
      supabase.from('energia_parametros' as any).select('icms_pct, pis_pct, cofins_pct').limit(1).maybeSingle(),
    ]);
    if (c.error) toast.error('Erro ao carregar competências');
    else setCompetencias((c.data as any) || []);
    if (m.error) toast.error('Erro ao carregar módulos');
    else setModulos((m.data as any) || []);
    if (cli.error) toast.error('Erro ao carregar clientes');
    else setClientes((cli.data as any) || []);
    if (par.data) {
      const p: any = par.data;
      setAliquotas({ pis: Number(p.pis_pct) || 0, cofins: Number(p.cofins_pct) || 0, icms: Number(p.icms_pct) || 0 });
    }
  }, []);

  const fetchCompData = useCallback(async (compId: string, anoMes: string) => {
    const [t, l] = await Promise.all([
      supabase.from('energia_competencia_tarifas').select('*').eq('competencia_id', compId).maybeSingle(),
      supabase.from('energia_competencia_lancamentos').select('*').eq('competencia_id', compId),
    ]);
    if (t.error) toast.error('Erro ao carregar tarifas');
    setTarifas((t.data as any) || null);
    // Hidrata Fatura Copel (JSON) e Consumo por Cliente (JSON)
    const tdata = (t.data as any) || null;
    const fcRaw = tdata?.fatura_copel_itens || {};
    setFaturaItens({
      itens: fcRaw.itens || {},
      tributos: fcRaw.tributos || {},
    });
    const ccRaw: any[] = Array.isArray(tdata?.consumo_por_cliente) ? tdata.consumo_por_cliente : [];
    const ccMap: Record<string, ConsumoCliente> = {};
    ccRaw.forEach((r) => { if (r?.cliente_key) ccMap[r.cliente_key] = r; });
    setConsumoCli(ccMap);
    if (l.error) toast.error('Erro ao carregar lançamentos');
    const map: Record<string, LancamentoRow> = {};
    ((l.data as any[]) || []).forEach((r) => { map[r.modulo_id] = r; });
    setLancamentos(map);

    // Resolver contrato vigente por módulo para o mês da competência
    // Usa o 1º dia do mês como referência
    const ref = `${anoMes}-01`;
    const { data: vinculos, error: vErr } = await supabase
      .from('energia_contrato_modulos' as any)
      .select('modulo_id, vigencia_inicio, vigencia_fim, contrato:energia_contratos!inner(id, numero_contrato, demanda_contratada_kw, ativo)')
      .lte('vigencia_inicio', ref);
    const cMap: Record<string, ContratoVigente> = {};
    if (!vErr && vinculos) {
      for (const v of vinculos as any[]) {
        const fim = v.vigencia_fim ? v.vigencia_fim : null;
        if (fim && fim < ref) continue;
        if (!v.contrato?.ativo) continue;
        // Em caso de múltiplos, pega o mais recente (vigencia_inicio maior)
        const prev = cMap[v.modulo_id];
        if (!prev || v.vigencia_inicio > (prev as any).__inicio) {
          cMap[v.modulo_id] = {
            modulo_id: v.modulo_id,
            demanda_contratada_kw: Number(v.contrato.demanda_contratada_kw) || 0,
            numero_contrato: v.contrato.numero_contrato,
          } as ContratoVigente;
          (cMap[v.modulo_id] as any).__inicio = v.vigencia_inicio;
        }
      }
    }
    setContratoPorModulo(cMap);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchBase();
      setLoading(false);
    })();
  }, [fetchBase]);

  useEffect(() => {
    if (competencias.length && !currentCompId) setCurrentCompId(competencias[0].id);
  }, [competencias, currentCompId]);

  useEffect(() => {
    if (currentCompId) {
      const comp = competencias.find((c) => c.id === currentCompId);
      if (comp) fetchCompData(currentCompId, comp.ano_mes);
    }
  }, [currentCompId, competencias, fetchCompData]);

  // ─── Ações ────────────────────────────────────────────
  const handleCreate = async (copyFromPrevious: boolean) => {
    if (!/^\d{4}-\d{2}$/.test(newAnoMes)) return toast.error('Formato AAAA-MM');
    setCreating(true);
    const { data: comp, error } = await supabase
      .from('energia_competencias')
      .insert({ ano_mes: newAnoMes, updated_by: user?.id } as any)
      .select()
      .single();
    if (error) { setCreating(false); return toast.error(error.message.includes('duplicate') ? 'Mês já existe' : 'Erro ao criar'); }

    // tarifas: padrão ou do mês anterior
    let tarifaSeed: any = { ...DEFAULT_TARIFAS };
    if (copyFromPrevious && competencias[0]) {
      const { data: prev } = await supabase
        .from('energia_competencia_tarifas')
        .select('*').eq('competencia_id', competencias[0].id).maybeSingle();
      if (prev) {
        const { id: _i, competencia_id: _c, created_at: _ca, updated_at: _ua, updated_by: _ub, ...rest } = prev as any;
        tarifaSeed = rest;
      }
    }
    await supabase.from('energia_competencia_tarifas').insert({
      competencia_id: (comp as any).id, updated_by: user?.id, ...tarifaSeed,
    } as any);

    // lançamentos: copia leituras (zera consumo/medida se "Nova vazia")
    if (copyFromPrevious && competencias[0]) {
      const { data: prevL } = await supabase
        .from('energia_competencia_lancamentos')
        .select('*').eq('competencia_id', competencias[0].id);
      const rows = ((prevL as any[]) || []).map((r) => ({
        competencia_id: (comp as any).id,
        modulo_id: r.modulo_id,
        demanda_contratada_kw: r.demanda_contratada_kw,
        demanda_usd_medida_kw: r.demanda_usd_medida_kw,
        consumo_ponta_kwh: r.consumo_ponta_kwh,
        consumo_fora_kwh: r.consumo_fora_kwh,
        ajuste_manual_reais: 0,
        updated_by: user?.id,
      }));
      if (rows.length) await supabase.from('energia_competencia_lancamentos').insert(rows as any);
    }

    setCreating(false);
    toast.success('Competência criada');
    await fetchBase();
    setCurrentCompId((comp as any).id);
  };

  const handleToggleLock = async () => {
    if (!currentComp) return;
    const next = currentComp.status === 'fechada' ? 'rascunho' : 'fechada';
    const { error } = await supabase
      .from('energia_competencias')
      .update({
        status: next,
        fechada_em: next === 'fechada' ? new Date().toISOString() : null,
        fechada_por: next === 'fechada' ? user?.id : null,
        updated_by: user?.id,
      } as any)
      .eq('id', currentComp.id);
    if (error) return toast.error('Erro ao atualizar status');
    toast.success(next === 'fechada' ? 'Competência fechada' : 'Competência reaberta');
    fetchBase();
  };

  const updateTarifa = (key: keyof EnergiaTarifas, value: number) => {
    setTarifas((t) => (t ? { ...t, [key]: value } : t));
  };

  const saveTarifas = async () => {
    if (!tarifas) return;
    const { id, competencia_id, ...rest } = tarifas;
    const { error } = await supabase
      .from('energia_competencia_tarifas')
      .update({ ...rest, updated_by: user?.id } as any)
      .eq('id', id);
    if (error) toast.error('Erro ao salvar tarifas'); else toast.success('Tarifas salvas');
  };

  const updateCopelField = (key: keyof CopelFatura, value: number) => {
    setTarifas((t) => (t ? ({ ...t, [key]: value } as any) : t));
  };
  const saveCopel = async () => {
    if (!tarifas) return;
    const payload: any = {};
    COPEL_FIELDS.forEach(f => { payload[f.key] = (tarifas as any)[f.key] ?? 0; });
    const { error } = await supabase
      .from('energia_competencia_tarifas')
      .update({ ...payload, updated_by: user?.id })
      .eq('id', tarifas.id);
    if (error) toast.error('Erro ao salvar fatura Copel'); else toast.success('Fatura Copel salva');
  };

  const saveFotovoltaicoSaldoFinal = async (saldoPonta: number, saldoFora: number) => {
    if (!tarifas) return;
    await supabase
      .from('energia_competencia_tarifas')
      .update({
        fotovoltaico_saldo_final_ponta_kwh: saldoPonta,
        fotovoltaico_saldo_final_fora_kwh: saldoFora,
        updated_by: user?.id,
      } as any)
      .eq('id', tarifas.id);
  };

  // ─── Fatura Copel (itens) ────────────────────────────────────
  // Formata número pt-BR com N casas, vazio se 0
  const fmtBR = (n: number, dec = 2) =>
    !n || !isFinite(n) ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  const updateFaturaItem = (key: CopelItemKey, field: keyof CopelItem, value: string) => {
    setFaturaItens((prev) => {
      const curr = prev.itens?.[key] || emptyItem();
      let next: CopelItem = { ...curr, [field]: value };
      const def = COPEL_ITEM_DEFS.find((d) => d.key === key);
      // Quando muda Quant ou Preço unit, recalcula derivados (valor, pis/cofins, icms, tarifa unit)
      if (def?.hasUnitario && (field === 'quant' || field === 'preco_unit')) {
        const q = parseBR(next.quant);
        const p = parseBR(next.preco_unit);
        const valor = q * p;
        const pis = aliquotas.pis / 100;
        const cofins = aliquotas.cofins / 100;
        const icms = aliquotas.icms / 100;
        const pisCof = valor * (pis + cofins);
        const icmsV = valor * icms;
        // tarifa "limpa" = preço unit removendo a carga tributária embutida
        const tarifaUnit = p * (1 - pis - cofins - icms);
        next = {
          ...next,
          valor: fmtBR(valor, 2),
          pis_cofins: fmtBR(pisCof, 2),
          icms: fmtBR(icmsV, 2),
          tarifa_unit: fmtBR(tarifaUnit, 6),
        };
      }
      return { ...prev, itens: { ...(prev.itens || {}), [key]: next } };
    });
  };

  // Auto-preenche a tabela lateral de Tributos a partir dos itens e das alíquotas do cadastro
  useEffect(() => {
    const it = faturaItens.itens || {};
    const baseTributavel = COPEL_ITEM_DEFS
      .filter((d) => d.hasPisCofins)
      .reduce((s, d) => s + parseBR(it[d.key]?.valor || ''), 0);
    const next = {
      icms: { base: fmtBR(baseTributavel, 2), aliquota: fmtBR(aliquotas.icms, 2), valor: fmtBR(baseTributavel * aliquotas.icms / 100, 2) },
      cofins: { base: fmtBR(baseTributavel, 2), aliquota: fmtBR(aliquotas.cofins, 2), valor: fmtBR(baseTributavel * aliquotas.cofins / 100, 2) },
      pis: { base: fmtBR(baseTributavel, 2), aliquota: fmtBR(aliquotas.pis, 2), valor: fmtBR(baseTributavel * aliquotas.pis / 100, 2) },
    };
    setFaturaItens((prev) => {
      const trib = prev.tributos || {};
      const same = (a?: CopelTributo, b?: CopelTributo) => a && b && a.base === b.base && a.aliquota === b.aliquota && a.valor === b.valor;
      if (same(trib.icms, next.icms) && same(trib.cofins, next.cofins) && same(trib.pis, next.pis)) return prev;
      return { ...prev, tributos: next };
    });
  }, [faturaItens.itens, aliquotas]);

  const updateFaturaTributo = (key: 'icms' | 'cofins' | 'pis', field: keyof CopelTributo, value: string) => {
    setFaturaItens((prev) => ({
      ...prev,
      tributos: { ...(prev.tributos || {}), [key]: { ...(prev.tributos?.[key] || emptyTrib()), [field]: value } },
    }));
  };
  const saveFaturaItens = async () => {
    if (!tarifas) return;
    setSavingFatura(true);
    // Espelha valores numéricos nas colunas copel_* (compatibilidade c/ engine atual)
    const it = faturaItens.itens || {};
    const v = (k: CopelItemKey) => parseBR(it[k]?.valor || '');
    const q = (k: CopelItemKey) => parseBR(it[k]?.quant || '');
    const tarif = (k: CopelItemKey) => parseBR(it[k]?.tarifa_unit || '');
    const trib = faturaItens.tributos || {};
    const tributoValor = (t?: CopelTributo) => parseBR(t?.valor || '');
    const piscof = tributoValor(trib.pis) + tributoValor(trib.cofins);
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
      copel_valor_icms: tributoValor(trib.icms),
      copel_valor_pis_cofins: piscof,
      // Tarifas unitárias podem alimentar tarifas atuais para o cálculo
      te_ponta: tarif('te_ponta'),
      tusd_ponta: tarif('usd_ponta'),
      te_fora: tarif('te_fora'),
      tusd_fora: tarif('usd_fora'),
      demanda_usd: tarif('demanda_usd'),
      iluminacao_publica: v('iluminacao_publica'),
    };
    const { error } = await supabase
      .from('energia_competencia_tarifas')
      .update({ fatura_copel_itens: faturaItens as any, ...mirror, updated_by: user?.id } as any)
      .eq('id', tarifas.id);
    setSavingFatura(false);
    if (error) toast.error('Erro ao salvar fatura Copel');
    else {
      toast.success('Fatura Copel salva');
      setTarifas((t) => (t ? ({ ...t, ...mirror } as any) : t));
    }
  };

  // ─── Consumo por Cliente (entrada) → rateia para módulos por área ────
  const updateConsumoCli = (key: string, field: keyof ConsumoCliente, value: string) => {
    setConsumoCli((p) => ({ ...p, [key]: { ...(p[key] || { cliente_key: key, demanda_kw: '', consumo_ponta_kwh: '', consumo_fora_kwh: '' }), [field]: value } }));
  };
  const saveConsumoCli = async () => {
    if (!tarifas || !currentCompId) return;
    setSavingConsumo(true);
    // 1) persiste JSON
    const arr = Object.values(consumoCli);
    const { error: e1 } = await supabase
      .from('energia_competencia_tarifas')
      .update({ consumo_por_cliente: arr as any, updated_by: user?.id } as any)
      .eq('id', tarifas.id);
    if (e1) { setSavingConsumo(false); return toast.error('Erro ao salvar consumo'); }

    // 2) Rateia cada cliente entre seus módulos proporcional à área. Faltante vai p/ módulos vagos.
    const lancMap: Record<string, { d: number; cp: number; cf: number }> = {};
    for (const m of modulos) lancMap[m.id] = { d: 0, cp: 0, cf: 0 };

    const isAreaComum = (m: Modulo) => /(área|area) comum/i.test(m.identificador);
    for (const cli of arr) {
      const mods = consumoCli[cli.cliente_key]
        ? modulos.filter((m) => {
            if (cli.cliente_key === 'AREA_COMUM') return isAreaComum(m);
            return m.cliente_id === cli.cliente_key && !isAreaComum(m);
          })
        : [];
      const totalArea = mods.reduce((s, m) => s + (m.area_m2 || 0), 0);
      const D = parseBR(cli.demanda_kw);
      const CP = parseBR(cli.consumo_ponta_kwh);
      const CF = parseBR(cli.consumo_fora_kwh);
      if (mods.length === 0) continue;
      if (totalArea > 0) {
        for (const m of mods) {
          const w = m.area_m2 / totalArea;
          lancMap[m.id] = { d: D * w, cp: CP * w, cf: CF * w };
        }
      } else {
        const w = 1 / mods.length;
        for (const m of mods) lancMap[m.id] = { d: D * w, cp: CP * w, cf: CF * w };
      }
    }

    // 3) Módulos vagos = resto da Copel
    const totalCopelD = (tarifas as any).copel_demanda_kw || 0;
    const totalCopelCP = (tarifas as any).copel_consumo_ponta_kwh || 0;
    const totalCopelCF = (tarifas as any).copel_consumo_fora_kwh || 0;
    const usedD = Object.values(lancMap).reduce((s, x) => s + x.d, 0);
    const usedCP = Object.values(lancMap).reduce((s, x) => s + x.cp, 0);
    const usedCF = Object.values(lancMap).reduce((s, x) => s + x.cf, 0);
    const restoD = Math.max(0, totalCopelD - usedD);
    const restoCP = Math.max(0, totalCopelCP - usedCP);
    const restoCF = Math.max(0, totalCopelCF - usedCF);
    const vagos = modulos.filter((m) => !m.cliente_id && !isAreaComum(m));
    const totalAreaVagos = vagos.reduce((s, m) => s + (m.area_m2 || 0), 0);
    if (vagos.length > 0) {
      if (totalAreaVagos > 0) {
        for (const m of vagos) {
          const w = m.area_m2 / totalAreaVagos;
          lancMap[m.id] = { d: restoD * w, cp: restoCP * w, cf: restoCF * w };
        }
      } else {
        const w = 1 / vagos.length;
        for (const m of vagos) lancMap[m.id] = { d: restoD * w, cp: restoCP * w, cf: restoCF * w };
      }
    }

    // 4) Upserta lançamentos por módulo
    const rows = modulos.map((m) => {
      const x = lancMap[m.id] || { d: 0, cp: 0, cf: 0 };
      const existing = lancamentos[m.id];
      return {
        ...(existing?.id ? { id: existing.id } : {}),
        competencia_id: currentCompId,
        modulo_id: m.id,
        demanda_contratada_kw: contratoPorModulo[m.id]?.demanda_contratada_kw || m.demanda_contratada_kw || 0,
        demanda_usd_medida_kw: Number(x.d.toFixed(4)),
        consumo_ponta_kwh: Number(x.cp.toFixed(4)),
        consumo_fora_kwh: Number(x.cf.toFixed(4)),
        ajuste_manual_reais: existing?.ajuste_manual_reais || 0,
        updated_by: user?.id,
      };
    });
    const { error: e2 } = await supabase
      .from('energia_competencia_lancamentos')
      .upsert(rows as any, { onConflict: 'competencia_id,modulo_id' });
    setSavingConsumo(false);
    if (e2) toast.error('Erro ao distribuir aos módulos: ' + e2.message);
    else {
      toast.success('Consumo por cliente salvo e rateado');
      await fetchCompData(currentCompId, currentComp!.ano_mes);
    }
  };

  // Inputs por módulo (autosave debounced)
  const debounceRefs = useRef<Record<string, any>>({});
  const updateLanc = (moduloId: string, patch: Partial<LancamentoRow>) => {
    setLancamentos((prev) => {
      const existing = prev[moduloId] || {
        competencia_id: currentCompId!,
        modulo_id: moduloId,
        demanda_contratada_kw: contratoPorModulo[moduloId]?.demanda_contratada_kw || 0,
        demanda_usd_medida_kw: 0,
        consumo_ponta_kwh: 0,
        consumo_fora_kwh: 0,
        ajuste_manual_reais: 0,
      };
      const next = { ...existing, ...patch };
      // autosave debounced
      clearTimeout(debounceRefs.current[moduloId]);
      debounceRefs.current[moduloId] = setTimeout(async () => {
        const { id, ...payload } = next as any;
        if (id) {
          await supabase.from('energia_competencia_lancamentos').update({ ...payload, updated_by: user?.id }).eq('id', id);
        } else {
          const { data, error } = await supabase
            .from('energia_competencia_lancamentos')
            .insert({ ...payload, updated_by: user?.id })
            .select().single();
          if (!error && data) {
            setLancamentos((p) => ({ ...p, [moduloId]: data as any }));
          }
        }
      }, 600);
      return { ...prev, [moduloId]: next };
    });
  };

  // ─── Cálculo em memória ───────────────────────────────
  const memoria = useMemo(() => {
    if (!tarifas) return null;
    const inputs: EnergiaLancamentoInput[] = modulos.map((m) => {
      const l = lancamentos[m.id];
      const cli = clientes.find((c) => c.id === m.cliente_id);
      const demandaContrato = contratoPorModulo[m.id]?.demanda_contratada_kw ?? 0;
      return {
        modulo_id: m.id,
        identificador: m.identificador,
        cliente_nome: cli?.razao_social || cli?.nome || (m.cliente_id ? '—' : 'VAGO'),
        area_m2: m.area_m2,
        demanda_contratada_kw: demandaContrato,
        demanda_usd_medida_kw: l?.demanda_usd_medida_kw ?? 0,
        consumo_ponta_kwh: l?.consumo_ponta_kwh ?? 0,
        consumo_fora_kwh: l?.consumo_fora_kwh ?? 0,
        ajuste_manual_reais: l?.ajuste_manual_reais ?? 0,
        is_area_comum: m.identificador.toUpperCase().includes('ÁREA COMUM') || m.identificador.toUpperCase().includes('AREA COMUM'),
      };
    });
    return calcularMemoria(tarifas, inputs);
  }, [tarifas, lancamentos, modulos, clientes, contratoPorModulo]);

  const exportCSV = () => {
    if (!memoria) return;
    const headers = ['Módulo','Cliente','Área m²','Dem. Contratada','Dem. USD','Ultrap.','R$ Demanda','Consumo Ponta','Consumo Fora','Consumo Total','R$ Consumo','Perdas kWh','R$ Perdas','ICMS','PIS/COFINS','Ilum. Pública','Bandeira','Créd/Déb','Fotovolt.','Ajuste','TOTAL Energy','TOTAL Copel'];
    const rows = [...memoria.linhas, memoria.totais].map((l) => [
      l.identificador, l.cliente_nome, l.area_m2,
      l.demanda_contratada, l.demanda_usd, l.ultrapassagem, l.rs_demanda_total,
      l.consumo_ponta, l.consumo_fora, l.consumo_total, l.rs_consumo_total,
      l.perdas_kwh, l.rs_perdas, l.icms_total, l.piscof_total,
      l.iluminacao_publica, l.bandeira_total, l.cred_deb_rateado, l.fotovoltaico, l.ajuste_manual,
      l.total_fatura_energy, l.total_fatura_copel,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) =>
      typeof v === 'number' ? v.toFixed(2).replace('.', ',') : `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `memoria-calculo-${currentComp?.ano_mes}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header: competência selector + ações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Memória de Cálculo
          </CardTitle>
          <CardDescription>
            Replica integralmente a planilha mensal do Mega Curitiba. Entre a fatura Copel (tarifas) e a leitura por módulo; o cálculo é automático.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <Label>Competência</Label>
              <Select value={currentCompId ?? ''} onValueChange={setCurrentCompId}>
                <SelectTrigger><SelectValue placeholder="Selecionar competência..." /></SelectTrigger>
                <SelectContent>
                  {competencias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.ano_mes} {c.status === 'fechada' ? '🔒' : ''}
                    </SelectItem>
                  ))}
                  {competencias.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">Nenhuma competência ainda</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nova competência (AAAA-MM)</Label>
              <Input value={newAnoMes} onChange={(e) => setNewAnoMes(e.target.value)} className="w-32" />
            </div>
            <Button onClick={() => handleCreate(false)} disabled={creating} variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Vazia
            </Button>
            <Button onClick={() => handleCreate(true)} disabled={creating || !competencias.length}>
              <Copy className="h-4 w-4 mr-2" /> Duplicar último
            </Button>
            {currentComp && (
              <>
                <Badge variant={isLocked ? 'secondary' : 'default'} className="h-9 px-3 text-sm">
                  {isLocked ? '🔒 Fechada' : '📝 Rascunho'}
                </Badge>
                <Button onClick={handleToggleLock} variant="outline">
                  {isLocked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  {isLocked ? 'Reabrir' : 'Fechar'}
                </Button>
                <Button onClick={exportCSV} variant="outline">
                  <Download className="h-4 w-4 mr-2" /> CSV
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!currentComp ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Crie uma competência para começar.</CardContent></Card>
      ) : !tarifas ? (
        <div className="flex items-center justify-center min-h-[150px]"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          {/* Bloco Fotovoltaico (kWh) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">☀️ Fotovoltaico (kWh)</CardTitle>
              <CardDescription>
                Saldo inicial vem do mês anterior automaticamente ao fechar a competência. Geração + Saldo Inicial abatem o consumo da <strong>Área Comum</strong>. O que sobrar fica como saldo final e segue para o próximo mês.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {(['ponta','fora'] as const).map((horario) => {
                  const sufx = horario === 'ponta' ? 'ponta' : 'fora';
                  const inicialKey = `fotovoltaico_saldo_inicial_${sufx}_kwh` as const;
                  const geracaoKey = `fotovoltaico_geracao_${sufx}_kwh` as const;
                  const inicial = Number((tarifas as any)[inicialKey] ?? 0);
                  const geracao = Number((tarifas as any)[geracaoKey] ?? 0);
                  const consumido = horario === 'ponta'
                    ? memoria?.fotovoltaico.consumido_ponta_kwh ?? 0
                    : memoria?.fotovoltaico.consumido_fora_kwh ?? 0;
                  const saldoFinal = horario === 'ponta'
                    ? memoria?.fotovoltaico.saldo_final_ponta_kwh ?? 0
                    : memoria?.fotovoltaico.saldo_final_fora_kwh ?? 0;
                  return (
                    <div key={horario} className="rounded-md border p-3 space-y-2">
                      <h4 className="font-semibold text-sm">{horario === 'ponta' ? 'Ponta' : 'Fora Ponta'}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Saldo inicial (kWh)</Label>
                          <Input type="number" step="0.01" disabled value={inicial} />
                        </div>
                        <div>
                          <Label className="text-xs">Geração do mês (kWh)</Label>
                          <Input
                            type="number" step="0.01" disabled={isLocked}
                            value={geracao}
                            onChange={(e) => setTarifas((t) => (t ? ({ ...t, [geracaoKey]: Number(e.target.value) } as any) : t))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Consumido pela Área Comum</Label>
                          <div className="text-sm font-medium py-2">{num(consumido)} kWh</div>
                        </div>
                        <div>
                          <Label className="text-xs text-primary">Saldo final → próximo mês</Label>
                          <div className="text-sm font-bold text-primary py-2">{num(saldoFinal)} kWh</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end mt-4 gap-2">
                <Button variant="outline" disabled={isLocked} onClick={saveTarifas}>Salvar Geração</Button>
                <Button
                  variant="outline"
                  disabled={isLocked || !memoria}
                  onClick={() => memoria && saveFotovoltaicoSaldoFinal(
                    memoria.fotovoltaico.saldo_final_ponta_kwh,
                    memoria.fotovoltaico.saldo_final_fora_kwh,
                  ).then(() => toast.success('Saldo final atualizado'))}
                >
                  Persistir Saldo Final
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Aviso: a Fatura Copel agora vive em aba dedicada */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span>📄</span>
                <span>
                  {(tarifas as any)?.copel_valor_total > 0
                    ? <>Fatura Copel desta competência: <strong className="text-primary">{brl((tarifas as any).copel_valor_total)}</strong>{' '}<span className="text-muted-foreground">(Demanda {num((tarifas as any).copel_demanda_kw || 0)} kW · Ponta {num((tarifas as any).copel_consumo_ponta_kwh || 0)} kWh · Fora {num((tarifas as any).copel_consumo_fora_kwh || 0)} kWh)</span></>
                    : <span className="text-muted-foreground">Fatura Copel ainda não preenchida para esta competência.</span>}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Edite na aba <strong>Fatura Copel</strong>.</span>
            </CardContent>
          </Card>

          {/* Consumo por Cliente — entrada principal do mês */}
          <ConsumoClienteCard
            clientes={clientes}
            modulos={modulos}
            consumoCli={consumoCli}
            updateConsumoCli={updateConsumoCli}
            onSave={saveConsumoCli}
            saving={savingConsumo}
            isLocked={isLocked}
            copelTotais={{
              d: (tarifas as any).copel_demanda_kw || 0,
              cp: (tarifas as any).copel_consumo_ponta_kwh || 0,
              cf: (tarifas as any).copel_consumo_fora_kwh || 0,
            }}
          />

          {/* Matriz Memória de Cálculo */}
        </>
      )}
    </div>
  );
}

// ─── Matriz por Módulo (visões agrupadas para caber na tela) ───────────────
type VisaoKey = 'cliente' | 'demanda' | 'consumo' | 'tributos' | 'ajustes' | 'completa';

interface MatrizProps {
  memoria: { linhas: MemoriaLinha[]; totais: MemoriaLinha };
  modulos: Modulo[];
  lancamentos: Record<string, LancamentoRow>;
  updateLanc: (modulo_id: string, patch: Partial<LancamentoRow>) => void;
  isLocked: boolean;
  num: (v: number) => string;
  brl: (v: number) => string;
}

function MatrizModulos({ memoria, modulos, lancamentos, updateLanc, isLocked, num, brl }: MatrizProps) {
  const [visao, setVisao] = useState<VisaoKey>('cliente');

  const faturasCliente: FaturaCliente[] = useMemo(
    () => agruparPorCliente(memoria.linhas, modulos.map(m => ({ id: m.id, cliente_id: m.cliente_id, identificador: m.identificador }))),
    [memoria.linhas, modulos],
  );
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const toggleCliente = (key: string) => setExpandido(s => ({ ...s, [key]: !s[key] }));
  const totalEnergyCli = faturasCliente.reduce((s, f) => s + f.total_fatura_energy, 0);
  const totalCopelCli = faturasCliente.reduce((s, f) => s + f.total_fatura_copel, 0);

  const headCell = 'px-1.5 py-1.5 text-[11px] whitespace-nowrap font-semibold';
  const dataCell = 'px-1.5 py-0.5 text-[11px] tabular-nums';
  const editBg = 'bg-yellow-50 dark:bg-yellow-950/30';
  const editHeadBg = 'bg-yellow-100 dark:bg-yellow-900/30';

  const renderInput = (
    moduloId: string,
    field: 'demanda_usd_medida_kw' | 'consumo_ponta_kwh' | 'consumo_fora_kwh' | 'ajuste_manual_reais',
  ) => {
    // Somente "Ajuste" continua editável aqui. Consumo/Demanda são preenchidos
    // no card "Consumo por Cliente" e ratearam para os módulos.
    const editable = field === 'ajuste_manual_reais';
    const val = lancamentos[moduloId]?.[field] ?? 0;
    if (!editable) {
      return <span className="text-[11px] tabular-nums">{num(Number(val))}</span>;
    }
    return (
      <Input
        type="number"
        step="0.01"
        disabled={isLocked}
        className="h-6 text-right w-full min-w-0 px-1 text-[11px]"
        value={val}
        onChange={(e) => updateLanc(moduloId, { [field]: Number(e.target.value) } as Partial<LancamentoRow>)}
      />
    );
  };

  // Colunas dinâmicas por visão
  const visaoCols: Record<Exclude<VisaoKey, 'completa' | 'cliente'>, Array<{
    head: React.ReactNode;
    cell: (l: MemoriaLinha) => React.ReactNode;
    total: React.ReactNode;
    editable?: boolean;
    align?: 'left' | 'right' | 'center';
  }>> = {
    demanda: [
      { head: 'Dem. Contr.', cell: (l) => num(l.demanda_contratada), total: num(memoria.totais.demanda_contratada), align: 'right' },
      { head: 'Dem. USD', editable: true, cell: (l) => renderInput(l.modulo_id, 'demanda_usd_medida_kw'), total: num(memoria.totais.demanda_usd), align: 'right' },
      { head: 'Ultrap.', cell: (l) => num(l.ultrapassagem), total: num(memoria.totais.ultrapassagem), align: 'right' },
      { head: 'R$ Demanda', cell: (l) => brl(l.rs_demanda_total), total: brl(memoria.totais.rs_demanda_total), align: 'right' },
    ],
    consumo: [
      { head: 'Cons. Ponta', editable: true, cell: (l) => renderInput(l.modulo_id, 'consumo_ponta_kwh'), total: num(memoria.totais.consumo_ponta), align: 'right' },
      { head: 'Cons. Fora', editable: true, cell: (l) => renderInput(l.modulo_id, 'consumo_fora_kwh'), total: num(memoria.totais.consumo_fora), align: 'right' },
      { head: 'Cons. Total', cell: (l) => num(l.consumo_total), total: num(memoria.totais.consumo_total), align: 'right' },
      { head: 'R$ Consumo', cell: (l) => brl(l.rs_consumo_total), total: brl(memoria.totais.rs_consumo_total), align: 'right' },
      { head: 'Perdas kWh', cell: (l) => num(l.perdas_kwh), total: num(memoria.totais.perdas_kwh), align: 'right' },
      { head: 'R$ Perdas', cell: (l) => brl(l.rs_perdas), total: brl(memoria.totais.rs_perdas), align: 'right' },
    ],
    tributos: [
      { head: 'ICMS', cell: (l) => brl(l.icms_total), total: brl(memoria.totais.icms_total), align: 'right' },
      { head: 'PIS/COFINS', cell: (l) => brl(l.piscof_total), total: brl(memoria.totais.piscof_total), align: 'right' },
      { head: 'Ilum. Pub.', cell: (l) => brl(l.iluminacao_publica), total: brl(memoria.totais.iluminacao_publica), align: 'right' },
      { head: 'Bandeira', cell: (l) => brl(l.bandeira_total), total: brl(memoria.totais.bandeira_total), align: 'right' },
      { head: 'Créd/Déb', cell: (l) => brl(l.cred_deb_rateado), total: brl(memoria.totais.cred_deb_rateado), align: 'right' },
      { head: 'Fotovolt.', cell: (l) => brl(l.fotovoltaico), total: brl(memoria.totais.fotovoltaico), align: 'right' },
    ],
    ajustes: [
      { head: 'Ajuste', editable: true, cell: (l) => renderInput(l.modulo_id, 'ajuste_manual_reais'), total: brl(memoria.totais.ajuste_manual), align: 'right' },
    ],
  };

  const renderTabela = (cols: typeof visaoCols.demanda) => (
    <div className="overflow-x-auto">
      <table className="text-[11px] border-collapse w-full table-fixed">
        <thead className="bg-muted">
          <tr className="border-b">
            <th className={`sticky left-0 bg-muted text-left z-10 w-[70px] ${headCell}`}>Módulo</th>
            <th className={`text-left ${headCell}`} style={{ width: '22%' }}>Cliente</th>
            <th className={`text-right ${headCell}`} style={{ width: '60px' }}>Área m²</th>
            {cols.map((c, i) => (
              <th key={i} className={`text-${c.align ?? 'right'} ${headCell} ${c.editable ? editHeadBg : ''}`}>{c.head}</th>
            ))}
            <th className={`text-right ${headCell} font-bold`} style={{ width: '88px' }}>Tot. Energy</th>
            <th className={`text-right ${headCell} font-bold`} style={{ width: '88px' }}>Tot. Copel</th>
            <th className={`text-center ${headCell}`} style={{ width: '36px' }}>OK</th>
          </tr>
        </thead>
        <tbody>
          {memoria.linhas.map((l, i) => (
            <tr key={l.modulo_id} className={i % 2 ? 'bg-muted/30' : ''}>
              <td className={`sticky left-0 bg-background font-medium z-10 border-r ${dataCell}`}>{l.identificador}</td>
              <td className={`${dataCell} truncate`} title={l.cliente_nome}>{l.cliente_nome}</td>
              <td className={`${dataCell} text-right`}>{num(l.area_m2)}</td>
              {cols.map((c, j) => (
                <td key={j} className={`${dataCell} text-${c.align ?? 'right'} ${c.editable ? editBg : ''}`}>
                  {c.cell(l)}
                </td>
              ))}
              <td className={`${dataCell} text-right font-semibold`}>{brl(l.total_fatura_energy)}</td>
              <td className={`${dataCell} text-right font-semibold`}>{brl(l.total_fatura_copel)}</td>
              <td className={`${dataCell} text-center`}>
                {l.bate ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 inline" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600 inline" />}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-primary bg-primary/5 font-bold">
            <td className={`sticky left-0 bg-primary/10 z-10 border-r ${dataCell}`}>TOTAL</td>
            <td />
            <td className={`${dataCell} text-right`}>{num(memoria.totais.area_m2)}</td>
            {cols.map((c, j) => (
              <td key={j} className={`${dataCell} text-${c.align ?? 'right'}`}>{c.total}</td>
            ))}
            <td className={`${dataCell} text-right text-primary`}>{brl(memoria.totais.total_fatura_energy)}</td>
            <td className={`${dataCell} text-right text-primary`}>{brl(memoria.totais.total_fatura_copel)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderCompleta = () => (
    <div className="overflow-x-auto">
      <table className="text-[11px] border-collapse w-full">
        <thead className="bg-muted">
          <tr className="border-b">
            <th className={`sticky left-0 bg-muted text-left z-10 ${headCell}`}>Módulo</th>
            <th className={`text-left ${headCell}`}>Cliente</th>
            <th className={`text-right ${headCell}`}>Área m²</th>
            <th className={`text-right ${headCell}`}>Dem. Contr.</th>
            <th className={`text-right ${headCell} ${editHeadBg}`}>Dem. USD</th>
            <th className={`text-right ${headCell}`}>Ultrap.</th>
            <th className={`text-right ${headCell}`}>R$ Demanda</th>
            <th className={`text-right ${headCell} ${editHeadBg}`}>Cons. Ponta</th>
            <th className={`text-right ${headCell} ${editHeadBg}`}>Cons. Fora</th>
            <th className={`text-right ${headCell}`}>Cons. Total</th>
            <th className={`text-right ${headCell}`}>R$ Consumo</th>
            <th className={`text-right ${headCell}`}>Perdas kWh</th>
            <th className={`text-right ${headCell}`}>R$ Perdas</th>
            <th className={`text-right ${headCell}`}>ICMS</th>
            <th className={`text-right ${headCell}`}>PIS/COFINS</th>
            <th className={`text-right ${headCell}`}>Ilum. Pub.</th>
            <th className={`text-right ${headCell}`}>Bandeira</th>
            <th className={`text-right ${headCell}`}>Créd/Déb</th>
            <th className={`text-right ${headCell}`}>Fotovolt.</th>
            <th className={`text-right ${headCell} ${editHeadBg}`}>Ajuste</th>
            <th className={`text-right ${headCell} font-bold`}>TOTAL Energy</th>
            <th className={`text-right ${headCell} font-bold`}>TOTAL Copel</th>
            <th className={`text-center ${headCell}`}>OK</th>
          </tr>
        </thead>
        <tbody>
          {memoria.linhas.map((l, i) => (
            <tr key={l.modulo_id} className={i % 2 ? 'bg-muted/30' : ''}>
              <td className={`sticky left-0 bg-background font-medium z-10 border-r ${dataCell}`}>{l.identificador}</td>
              <td className={dataCell}>{l.cliente_nome}</td>
              <td className={`${dataCell} text-right`}>{num(l.area_m2)}</td>
              <td className={`${dataCell} text-right`}>{num(l.demanda_contratada)}</td>
              <td className={`${dataCell} ${editBg}`}>{renderInput(l.modulo_id, 'demanda_usd_medida_kw')}</td>
              <td className={`${dataCell} text-right`}>{num(l.ultrapassagem)}</td>
              <td className={`${dataCell} text-right`}>{brl(l.rs_demanda_total)}</td>
              <td className={`${dataCell} ${editBg}`}>{renderInput(l.modulo_id, 'consumo_ponta_kwh')}</td>
              <td className={`${dataCell} ${editBg}`}>{renderInput(l.modulo_id, 'consumo_fora_kwh')}</td>
              <td className={`${dataCell} text-right`}>{num(l.consumo_total)}</td>
              <td className={`${dataCell} text-right`}>{brl(l.rs_consumo_total)}</td>
              <td className={`${dataCell} text-right`}>{num(l.perdas_kwh)}</td>
              <td className={`${dataCell} text-right`}>{brl(l.rs_perdas)}</td>
              <td className={`${dataCell} text-right`}>{brl(l.icms_total)}</td>
              <td className={`${dataCell} text-right`}>{brl(l.piscof_total)}</td>
              <td className={`${dataCell} text-right`}>{brl(l.iluminacao_publica)}</td>
              <td className={`${dataCell} text-right`}>{brl(l.bandeira_total)}</td>
              <td className={`${dataCell} text-right`}>{brl(l.cred_deb_rateado)}</td>
              <td className={`${dataCell} text-right`}>{brl(l.fotovoltaico)}</td>
              <td className={`${dataCell} ${editBg}`}>{renderInput(l.modulo_id, 'ajuste_manual_reais')}</td>
              <td className={`${dataCell} text-right font-semibold`}>{brl(l.total_fatura_energy)}</td>
              <td className={`${dataCell} text-right font-semibold`}>{brl(l.total_fatura_copel)}</td>
              <td className={`${dataCell} text-center`}>
                {l.bate ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 inline" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600 inline" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Tabs value={visao} onValueChange={(v) => setVisao(v as VisaoKey)} className="w-full">
      <div className="px-4 pb-3">
        <TabsList className="grid w-full grid-cols-6 max-w-3xl">
          <TabsTrigger value="cliente">Fatura por Cliente</TabsTrigger>
          <TabsTrigger value="demanda">Demanda</TabsTrigger>
          <TabsTrigger value="consumo">Consumo</TabsTrigger>
          <TabsTrigger value="tributos">Tributos/Encargos</TabsTrigger>
          <TabsTrigger value="ajustes">Ajustes</TabsTrigger>
          <TabsTrigger value="completa">Completa</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="cliente" className="mt-0">
        <div className="overflow-x-auto">
          <table className="text-[12px] border-collapse w-full">
            <thead className="bg-muted">
              <tr className="border-b">
                <th className={`text-left ${headCell} w-8`}></th>
                <th className={`text-left ${headCell}`}>Cliente</th>
                <th className={`text-center ${headCell} w-16`}>Módulos</th>
                <th className={`text-right ${headCell}`}>Área m²</th>
                <th className={`text-right ${headCell}`}>Cons. Total kWh</th>
                <th className={`text-right ${headCell}`}>R$ Demanda</th>
                <th className={`text-right ${headCell}`}>R$ Consumo</th>
                <th className={`text-right ${headCell}`}>R$ Tributos</th>
                <th className={`text-right ${headCell}`}>Fotovolt.</th>
                <th className={`text-right ${headCell} font-bold`}>TOTAL Energy</th>
                <th className={`text-right ${headCell} font-bold`}>TOTAL Copel</th>
              </tr>
            </thead>
            <tbody>
              {faturasCliente.map((f) => (
                <>
                  <tr
                    key={f.cliente_key}
                    className={`border-b cursor-pointer hover:bg-muted/40 ${f.cliente_key === 'AREA_COMUM' ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
                    onClick={() => toggleCliente(f.cliente_key)}
                  >
                    <td className={`${dataCell} text-center`}>{expandido[f.cliente_key] ? '▾' : '▸'}</td>
                    <td className={`${dataCell} font-semibold`}>{f.cliente_nome}</td>
                    <td className={`${dataCell} text-center`}>{f.modulos.length}</td>
                    <td className={`${dataCell} text-right`}>{num(f.area_m2)}</td>
                    <td className={`${dataCell} text-right`}>{num(f.consumo_total)}</td>
                    <td className={`${dataCell} text-right`}>{brl(f.rs_demanda_total)}</td>
                    <td className={`${dataCell} text-right`}>{brl(f.rs_consumo_total + f.rs_perdas)}</td>
                    <td className={`${dataCell} text-right`}>{brl(f.icms_total + f.piscof_total + f.iluminacao_publica + f.bandeira_total)}</td>
                    <td className={`${dataCell} text-right`}>{brl(f.fotovoltaico)}</td>
                    <td className={`${dataCell} text-right font-bold`}>{brl(f.total_fatura_energy)}</td>
                    <td className={`${dataCell} text-right font-bold`}>{brl(f.total_fatura_copel)}</td>
                  </tr>
                  {expandido[f.cliente_key] && (
                    <tr className="border-b bg-muted/20">
                      <td colSpan={11} className="px-4 py-2 text-[11px] text-muted-foreground">
                        <strong>Módulos:</strong> {f.modulos.join(', ')}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              <tr className="border-t-2 border-primary bg-primary/5 font-bold">
                <td />
                <td className={dataCell}>TOTAL ({faturasCliente.length} clientes)</td>
                <td className={`${dataCell} text-center`}>{memoria.linhas.length}</td>
                <td className={`${dataCell} text-right`}>{num(memoria.totais.area_m2)}</td>
                <td className={`${dataCell} text-right`}>{num(memoria.totais.consumo_total)}</td>
                <td className={`${dataCell} text-right`}>{brl(memoria.totais.rs_demanda_total)}</td>
                <td className={`${dataCell} text-right`}>{brl(memoria.totais.rs_consumo_total + memoria.totais.rs_perdas)}</td>
                <td className={`${dataCell} text-right`}>{brl(memoria.totais.icms_total + memoria.totais.piscof_total + memoria.totais.iluminacao_publica + memoria.totais.bandeira_total)}</td>
                <td className={`${dataCell} text-right`}>{brl(memoria.totais.fotovoltaico)}</td>
                <td className={`${dataCell} text-right text-primary`}>{brl(totalEnergyCli)}</td>
                <td className={`${dataCell} text-right text-primary`}>{brl(totalCopelCli)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="px-4 pt-2 text-[11px] text-muted-foreground">
          Cada linha = 1 fatura enviada ao cliente. Clientes com vários módulos (ex.: Mercado Livre) são consolidados em uma cobrança única. Clique para ver os módulos.
        </p>
      </TabsContent>
      <TabsContent value="demanda" className="mt-0">{renderTabela(visaoCols.demanda)}</TabsContent>
      <TabsContent value="consumo" className="mt-0">{renderTabela(visaoCols.consumo)}</TabsContent>
      <TabsContent value="tributos" className="mt-0">{renderTabela(visaoCols.tributos)}</TabsContent>
      <TabsContent value="ajustes" className="mt-0">{renderTabela(visaoCols.ajustes)}</TabsContent>
      <TabsContent value="completa" className="mt-0">{renderCompleta()}</TabsContent>
    </Tabs>
  );
}

// ─── Card: Itens da Fatura Copel (layout idêntico à fatura) ───────────────
interface FaturaCopelCardProps {
  faturaItens: FaturaCopelItens;
  updateItem: (key: CopelItemKey, field: keyof CopelItem, value: string) => void;
  updateTributo: (key: 'icms' | 'cofins' | 'pis', field: keyof CopelTributo, value: string) => void;
  onSave: () => void;
  saving: boolean;
  isLocked: boolean;
}
function FaturaCopelCard({ faturaItens, updateItem, updateTributo, onSave, saving, isLocked }: FaturaCopelCardProps) {
  const it = faturaItens.itens || {};
  const trib = faturaItens.tributos || {};
  const sumValor = COPEL_ITEM_DEFS.reduce((s, d) => s + parseBR(it[d.key]?.valor || ''), 0);

  const cell = 'border px-1 py-1';
  const head = 'border bg-muted text-[11px] font-semibold px-1 py-1';
  const inp = (v: string, onChange: (s: string) => void, align: 'left' | 'right' = 'right') => (
    <Input
      type="text"
      inputMode="decimal"
      disabled={isLocked}
      className={`h-7 text-[11px] px-1 ${align === 'right' ? 'text-right' : ''}`}
      value={v}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>📄 Itens da Fatura Copel</CardTitle>
        <CardDescription>
          Preencha apenas <strong>Quant.</strong> e <strong>Preço unit (R$)</strong> de cada linha — o Valor, PIS/COFINS, ICMS, Tarifa unit. e a tabela de Tributos são calculados automaticamente a partir das alíquotas do cadastro. Você ainda pode sobrescrever qualquer campo manualmente se a fatura tiver arredondamento diferente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-[1fr,260px] gap-3 items-start">
          {/* Itens */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr>
                  <th className={`${head} text-left`}>Itens de fatura</th>
                  <th className={head}>Unid.</th>
                  <th className={head}>Quant.</th>
                  <th className={head}>Preço unit (R$)<br/>com tributos</th>
                  <th className={head}>Valor (R$)</th>
                  <th className={head}>PIS/COFINS</th>
                  <th className={head}>ICMS</th>
                  <th className={head}>Tarifa unit. (R$)</th>
                </tr>
              </thead>
              <tbody>
                {COPEL_ITEM_DEFS.map((d) => {
                  const v = it[d.key] || emptyItem();
                  return (
                    <tr key={d.key}>
                      <td className={`${cell} text-left whitespace-nowrap`}>{d.label}</td>
                      <td className={`${cell} text-center text-muted-foreground`}>{d.unidade}</td>
                      <td className={cell}>{d.hasUnitario ? inp(v.quant, (s) => updateItem(d.key, 'quant', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                      <td className={cell}>{d.hasUnitario ? inp(v.preco_unit, (s) => updateItem(d.key, 'preco_unit', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                      <td className={cell}>{inp(v.valor, (s) => updateItem(d.key, 'valor', s))}</td>
                      <td className={cell}>{d.hasPisCofins ? inp(v.pis_cofins, (s) => updateItem(d.key, 'pis_cofins', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                      <td className={cell}>{d.hasIcms ? inp(v.icms, (s) => updateItem(d.key, 'icms', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                      <td className={cell}>{d.hasTarifa ? inp(v.tarifa_unit, (s) => updateItem(d.key, 'tarifa_unit', s)) : <span className="text-muted-foreground text-center block">—</span>}</td>
                    </tr>
                  );
                })}
                <tr className="bg-primary/5 font-semibold">
                  <td className={`${cell} text-right`} colSpan={4}>TOTAL Valor (R$)</td>
                  <td className={`${cell} text-right tabular-nums`}>{sumValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={cell} colSpan={3} />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tributos */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr>
                  <th className={`${head} text-left`}>Tributo</th>
                  <th className={head}>Base de Cálc. (R$)</th>
                  <th className={head}>Alíquota (%)</th>
                  <th className={head}>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                {(['icms', 'cofins', 'pis'] as const).map((k) => {
                  const t = trib[k] || emptyTrib();
                  return (
                    <tr key={k}>
                      <td className={`${cell} text-left font-semibold uppercase`}>{k}</td>
                      <td className={cell}>{inp(t.base, (s) => updateTributo(k, 'base', s))}</td>
                      <td className={cell}>{inp(t.aliquota, (s) => updateTributo(k, 'aliquota', s))}</td>
                      <td className={cell}>{inp(t.valor, (s) => updateTributo(k, 'valor', s))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <Button onClick={onSave} disabled={isLocked || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Fatura Copel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Card: Consumo por Cliente (entrada principal) ────────────────────────
interface ConsumoClienteCardProps {
  clientes: Cliente[];
  modulos: Modulo[];
  consumoCli: Record<string, ConsumoCliente>;
  updateConsumoCli: (key: string, field: keyof ConsumoCliente, value: string) => void;
  onSave: () => void;
  saving: boolean;
  isLocked: boolean;
  copelTotais: { d: number; cp: number; cf: number };
}
function ConsumoClienteCard({ clientes, modulos, consumoCli, updateConsumoCli, onSave, saving, isLocked, copelTotais }: ConsumoClienteCardProps) {
  const isAreaComum = (m: Modulo) => /(área|area) comum/i.test(m.identificador);

  // Agrupa módulos por cliente (e identifica Área Comum + Vagos)
  const grupos: Array<{
    key: string;
    nome: string;
    modulos: Modulo[];
    isVago?: boolean;
    isAreaComum?: boolean;
    demandaContratada: number;
  }> = [];

  const clienteMap = new Map(clientes.map((c) => [c.id, c]));
  const byCliente: Record<string, Modulo[]> = {};
  const areaComumMods: Modulo[] = [];
  const vagos: Modulo[] = [];
  for (const m of modulos) {
    if (isAreaComum(m)) areaComumMods.push(m);
    else if (!m.cliente_id) vagos.push(m);
    else (byCliente[m.cliente_id] = byCliente[m.cliente_id] || []).push(m);
  }
  for (const [cid, mods] of Object.entries(byCliente)) {
    const c = clienteMap.get(cid);
    grupos.push({
      key: cid,
      nome: c?.razao_social || c?.nome || '—',
      modulos: mods,
      demandaContratada: mods.reduce((s, m) => s + (m.demanda_contratada_kw || 0), 0),
    });
  }
  grupos.sort((a, b) => a.nome.localeCompare(b.nome));
  if (areaComumMods.length > 0) {
    grupos.push({
      key: 'AREA_COMUM',
      nome: 'ÁREA COMUM',
      modulos: areaComumMods,
      isAreaComum: true,
      demandaContratada: areaComumMods.reduce((s, m) => s + (m.demanda_contratada_kw || 0), 0),
    });
  }

  // Totais entrados
  const sumD = grupos.reduce((s, g) => s + parseBR(consumoCli[g.key]?.demanda_kw || ''), 0);
  const sumCP = grupos.reduce((s, g) => s + parseBR(consumoCli[g.key]?.consumo_ponta_kwh || ''), 0);
  const sumCF = grupos.reduce((s, g) => s + parseBR(consumoCli[g.key]?.consumo_fora_kwh || ''), 0);
  // Resto = módulos vagos (faturado para Mega)
  const restoD = Math.max(0, copelTotais.d - sumD);
  const restoCP = Math.max(0, copelTotais.cp - sumCP);
  const restoCF = Math.max(0, copelTotais.cf - sumCF);

  const cell = 'border px-2 py-1';
  const head = 'border bg-muted text-[11px] font-semibold px-2 py-1';
  const inp = (v: string, onChange: (s: string) => void) => (
    <Input
      type="text"
      inputMode="decimal"
      disabled={isLocked}
      className="h-7 text-[12px] px-2 text-right bg-yellow-50 dark:bg-yellow-950/30"
      value={v}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const overD = sumD + restoD > copelTotais.d + 0.001 && copelTotais.d > 0;
  const validation = (entered: number, total: number) => {
    if (total <= 0) return null;
    const diff = total - entered;
    if (Math.abs(diff) < 0.01) return <span className="text-green-600">OK</span>;
    if (diff > 0) return <span className="text-amber-600">Resto p/ Vagos: {fmt(diff)}</span>;
    return <span className="text-red-600">Excede em {fmt(-diff)}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>👥 Consumo por Cliente</CardTitle>
        <CardDescription>
          A Copel mede tudo junto. Um cliente recebe <strong>uma fatura</strong> cobrindo todos os seus módulos. Preencha por cliente — o sistema rateia para os módulos por área. <strong>Módulos vagos</strong> recebem o resto e são faturados para a Mega.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className={`${head} text-left`}>Cliente</th>
                <th className={head}>Módulos</th>
                <th className={head}>Dem. Contratada (kW)</th>
                <th className={head}>Demanda Usada (kW)</th>
                <th className={head}>Consumo Ponta (kWh)</th>
                <th className={head}>Consumo Fora (kWh)</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => {
                const c = consumoCli[g.key] || { cliente_key: g.key, demanda_kw: '', consumo_ponta_kwh: '', consumo_fora_kwh: '' };
                return (
                  <tr key={g.key} className={g.isAreaComum ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}>
                    <td className={`${cell} font-semibold`}>{g.nome}</td>
                    <td className={`${cell} text-[11px] text-muted-foreground`}>{g.modulos.map((m) => m.identificador).join(', ')}</td>
                    <td className={`${cell} text-right tabular-nums`}>{fmt(g.demandaContratada)}</td>
                    <td className={cell}>{inp(c.demanda_kw, (s) => updateConsumoCli(g.key, 'demanda_kw', s))}</td>
                    <td className={cell}>{inp(c.consumo_ponta_kwh, (s) => updateConsumoCli(g.key, 'consumo_ponta_kwh', s))}</td>
                    <td className={cell}>{inp(c.consumo_fora_kwh, (s) => updateConsumoCli(g.key, 'consumo_fora_kwh', s))}</td>
                  </tr>
                );
              })}
              {/* Linha Módulos Vagos */}
              <tr className="bg-slate-100 dark:bg-slate-900/40">
                <td className={`${cell} font-semibold`}>MÓDULOS VAGOS → Mega</td>
                <td className={`${cell} text-[11px] text-muted-foreground`}>{vagos.map((m) => m.identificador).join(', ') || '—'}</td>
                <td className={`${cell} text-right tabular-nums`}>{fmt(vagos.reduce((s, m) => s + (m.demanda_contratada_kw || 0), 0))}</td>
                <td className={`${cell} text-right tabular-nums text-muted-foreground`}>{fmt(restoD)}</td>
                <td className={`${cell} text-right tabular-nums text-muted-foreground`}>{fmt(restoCP)}</td>
                <td className={`${cell} text-right tabular-nums text-muted-foreground`}>{fmt(restoCF)}</td>
              </tr>
              {/* Totais e validação */}
              <tr className="bg-primary/5 font-bold">
                <td className={`${cell} text-right`} colSpan={3}>TOTAL = Copel</td>
                <td className={`${cell} text-right tabular-nums`}>{fmt(copelTotais.d)}<div className="text-[10px] font-normal">{validation(sumD, copelTotais.d)}</div></td>
                <td className={`${cell} text-right tabular-nums`}>{fmt(copelTotais.cp)}<div className="text-[10px] font-normal">{validation(sumCP, copelTotais.cp)}</div></td>
                <td className={`${cell} text-right tabular-nums`}>{fmt(copelTotais.cf)}<div className="text-[10px] font-normal">{validation(sumCF, copelTotais.cf)}</div></td>
              </tr>
            </tbody>
          </table>
        </div>
        {overD && (
          <p className="text-[11px] text-red-600 mt-2">⚠ Soma das demandas excede a Copel — revise os valores.</p>
        )}
        <div className="flex justify-end mt-3">
          <Button onClick={onSave} disabled={isLocked || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar e Ratear para Módulos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}