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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Plus, Copy, Lock, Unlock, Download, Calculator, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  calcularMemoria,
  DEFAULT_TARIFAS,
  type EnergiaTarifas,
  type EnergiaLancamentoInput,
  type MemoriaLinha,
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

  const currentComp = competencias.find((c) => c.id === currentCompId) || null;
  const isLocked = currentComp?.status === 'fechada';

  // ─── Loaders ───────────────────────────────────────────
  const fetchBase = useCallback(async () => {
    const [c, m, cli] = await Promise.all([
      supabase.from('energia_competencias').select('*').order('ano_mes', { ascending: false }),
      supabase.from('energia_modulos').select('*').eq('ativo', true).order('ordem'),
      supabase.from('energia_clientes').select('id, nome, razao_social'),
    ]);
    if (c.error) toast.error('Erro ao carregar competências');
    else setCompetencias((c.data as any) || []);
    if (m.error) toast.error('Erro ao carregar módulos');
    else setModulos((m.data as any) || []);
    if (cli.error) toast.error('Erro ao carregar clientes');
    else setClientes((cli.data as any) || []);
  }, []);

  const fetchCompData = useCallback(async (compId: string, anoMes: string) => {
    const [t, l] = await Promise.all([
      supabase.from('energia_competencia_tarifas').select('*').eq('competencia_id', compId).maybeSingle(),
      supabase.from('energia_competencia_lancamentos').select('*').eq('competencia_id', compId),
    ]);
    if (t.error) toast.error('Erro ao carregar tarifas');
    setTarifas((t.data as any) || null);
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

  const tarifaGroups = Array.from(new Set(TARIFA_FIELDS.map((f) => f.group)));

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
          {/* Tarifas Copel */}
          <Card>
            <CardHeader>
              <CardTitle>Tarifas Copel do mês — {currentComp.ano_mes}</CardTitle>
              <CardDescription>Snapshot dos parâmetros da fatura. Edite e clique em Salvar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tarifaGroups.map((g) => (
                <div key={g}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{g}</h4>
                  <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {TARIFA_FIELDS.filter((f) => f.group === g).map((f) => (
                      <div key={f.key}>
                        <Label className="text-xs">{f.label}</Label>
                        <Input
                          type="number" step={f.step}
                          value={(tarifas as any)[f.key] ?? 0}
                          disabled={isLocked}
                          onChange={(e) => updateTarifa(f.key, Number(e.target.value))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={saveTarifas} disabled={isLocked}>Salvar Tarifas</Button>
              </div>
            </CardContent>
          </Card>

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

          {/* Bloco Conferência Fatura Copel */}
          <Card>
            <CardHeader>
              <CardTitle>📄 Conferência com a Fatura Copel</CardTitle>
              <CardDescription>
                Digite os valores que vieram impressos na fatura Copel. A coluna "Sistema" mostra o calculado pela memória; "Delta" indica a divergência.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-2 py-2">Item</th>
                      <th className="text-right px-2 py-2 w-40">Fatura Copel</th>
                      <th className="text-right px-2 py-2 w-40">Sistema</th>
                      <th className="text-right px-2 py-2 w-40">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COPEL_FIELDS.map((f) => {
                      const fatura = Number((tarifas as any)[f.key] ?? 0);
                      const calc = f.getCalc ? f.getCalc(memoria) : 0;
                      const delta = fatura - calc;
                      const absDelta = Math.abs(delta);
                      const isKwh = f.key.includes('kwh') || f.key === 'copel_demanda_kw';
                      const okThreshold = isKwh ? 0.1 : 1;
                      const warnThreshold = isKwh ? Math.max(1, Math.abs(calc) * 0.01) : Math.max(5, Math.abs(calc) * 0.01);
                      const color = absDelta <= okThreshold ? 'text-green-600' : absDelta <= warnThreshold ? 'text-amber-600' : 'text-red-600';
                      return (
                        <tr key={f.key} className="border-b">
                          <td className="px-2 py-1">{f.label}</td>
                          <td className="px-2 py-1">
                            <Input
                              type="number" step={f.step}
                              className="h-7 text-right"
                              disabled={isLocked}
                              value={fatura}
                              onChange={(e) => updateCopelField(f.key, Number(e.target.value))}
                            />
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">
                            {isKwh ? num(calc) : brl(calc)}
                          </td>
                          <td className={`px-2 py-1 text-right tabular-nums font-semibold ${color}`}>
                            {isKwh ? num(delta) : brl(delta)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-3">
                <Button onClick={saveCopel} disabled={isLocked}>Salvar Fatura Copel</Button>
              </div>
            </CardContent>
          </Card>

          {/* Matriz Memória de Cálculo */}
          {memoria && (
            <Card>
              <CardHeader>
                <CardTitle>Matriz por Módulo ({modulos.length})</CardTitle>
                <CardDescription>
                  Colunas <span className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">amarelas</span> são editáveis (autosave). Demais são calculadas em tempo real.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <MatrizModulos
                  memoria={memoria}
                  lancamentos={lancamentos}
                  updateLanc={updateLanc}
                  isLocked={isLocked}
                  num={num}
                  brl={brl}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}