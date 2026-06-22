import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Save, Trash2, Zap, Users, LayoutGrid, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface EnergiaCliente {
  id: string;
  nome: string;
  ativo: boolean;
  observacao: string | null;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  cidade: string | null;
  uf: string | null;
}

interface EnergiaModulo {
  id: string;
  identificador: string;
  area_m2: number;
  cliente_id: string | null;
  demanda_contratada_kw: number;
  ordem: number;
  ativo: boolean;
  observacao: string | null;
}

interface EnergiaParametros {
  id: string;
  icms_pct: number;
  pis_pct: number;
  cofins_pct: number;
  observacao: string | null;
}

const UNASSIGNED = '__none__';

function ClienteCombobox({
  value,
  onChange,
  clientes,
  counts,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  clientes: EnergiaCliente[];
  counts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const selected = clientes.find(c => c.id === value);
  const label = selected ? (selected.nome_fantasia || selected.razao_social || selected.nome) : null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !label && 'text-muted-foreground')}>
            {label ?? '— Vago —'}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__vago__"
                onSelect={() => { onChange(null); setOpen(false); }}
              >
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                <span className="italic text-muted-foreground">— Vago —</span>
              </CommandItem>
              {clientes.filter(c => c.ativo).map(c => {
                const display = c.nome_fantasia || c.razao_social || c.nome;
                const search = [c.nome, c.razao_social, c.nome_fantasia, c.cidade].filter(Boolean).join(' ');
                return (
                  <CommandItem
                    key={c.id}
                    value={`${search} ${c.id}`}
                    onSelect={() => { onChange(c.id); setOpen(false); }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === c.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate flex-1">{display}</span>
                    {counts[c.id] > 0 && (
                      <Badge variant="secondary" className="ml-2 shrink-0">{counts[c.id]}</Badge>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function EnergiaCadastrosTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingParams, setSavingParams] = useState(false);

  const [parametros, setParametros] = useState<EnergiaParametros | null>(null);
  const [clientes, setClientes] = useState<EnergiaCliente[]>([]);
  const [modulos, setModulos] = useState<EnergiaModulo[]>([]);

  const [newCnpj, setNewCnpj] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [preview, setPreview] = useState<{ cnpj: string; razao_social: string; nome_fantasia: string; cidade: string; uf: string } | null>(null);
  const [newModuloId, setNewModuloId] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    const [p, c, m] = await Promise.all([
      supabase.from('energia_parametros' as any).select('*').limit(1).maybeSingle(),
      supabase.from('energia_clientes' as any).select('*').order('nome'),
      supabase.from('energia_modulos' as any).select('*').order('ordem').order('identificador'),
    ]);
    if (p.error) toast.error('Erro ao carregar parâmetros');
    else setParametros(p.data as any);
    if (c.error) toast.error('Erro ao carregar clientes de energia');
    else setClientes((c.data || []) as any);
    if (m.error) toast.error('Erro ao carregar módulos');
    else setModulos((m.data || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ─── Parâmetros ──────────────────────────────────────
  const handleSaveParametros = async () => {
    if (!parametros) return;
    setSavingParams(true);
    const { error } = await supabase
      .from('energia_parametros' as any)
      .update({
        icms_pct: parametros.icms_pct,
        pis_pct: parametros.pis_pct,
        cofins_pct: parametros.cofins_pct,
        observacao: parametros.observacao,
        updated_by: user?.id,
      } as any)
      .eq('id', parametros.id);
    if (error) {
      setSavingParams(false);
      toast.error('Erro ao salvar parâmetros');
      return;
    }

    // Fase de testes: propaga alíquotas e RECALCULA tarifas líquidas (Mercado
    // Livre) para TODAS as competências, usando o preço unitário bruto já
    // digitado na Fatura Copel de cada mês. A fatura do cliente lê das
    // colunas demanda_usd/te_*/tusd_*, então é nelas que precisamos espelhar
    // o novo valor pós-tributos.
    const pis = Number(parametros.pis_pct) / 100;
    const cofins = Number(parametros.cofins_pct) / 100;
    const icms = Number(parametros.icms_pct) / 100;
    const fator = 1 - pis - cofins - icms;

    const { data: rows, error: fetchErr } = await supabase
      .from('energia_competencia_tarifas' as any)
      .select('id, fatura_copel_itens');
    if (fetchErr) {
      setSavingParams(false);
      toast.error('Parâmetros salvos, mas falhou ao ler competências');
      return;
    }

    const parseBR = (s: string) => Number(String(s ?? '').replace(/\./g, '').replace(',', '.')) || 0;
    let atualizadas = 0;
    for (const r of (rows as any[]) || []) {
      const itens = r?.fatura_copel_itens?.itens || {};
      const tarif = (k: string) => {
        const p = parseBR(itens?.[k]?.preco_unit || '');
        return p > 0 ? Number((p * fator).toFixed(6)) : 0;
      };
      const payload: any = {
        icms_pct: icms,
        pis_pct: pis,
        cofins_pct: cofins,
      };
      const dem = tarif('demanda_usd');
      const tep = tarif('te_ponta');
      const tusdp = tarif('usd_ponta');
      const tef = tarif('te_fora');
      const tusdf = tarif('usd_fora');
      // Espelha tanto nas colunas Copel (auditoria) quanto nas Mercado Livre
      // (fatura do cliente). Só sobrescreve se houver preço unitário Copel.
      if (dem)   { payload.copel_tarifa_demanda_usd = dem;   payload.demanda_usd = dem; }
      if (tep)   { payload.copel_tarifa_te_ponta = tep;     payload.te_ponta   = tep; }
      if (tusdp) { payload.copel_tarifa_tusd_ponta = tusdp; payload.tusd_ponta = tusdp; }
      if (tef)   { payload.copel_tarifa_te_fora = tef;       payload.te_fora    = tef; }
      if (tusdf) { payload.copel_tarifa_tusd_fora = tusdf;   payload.tusd_fora  = tusdf; }

      const { error: uErr } = await supabase
        .from('energia_competencia_tarifas' as any)
        .update(payload)
        .eq('id', r.id);
      if (!uErr) atualizadas++;
    }

    setSavingParams(false);
    toast.success(`Parâmetros salvos e tarifas recalculadas em ${atualizadas} competência${atualizadas === 1 ? '' : 's'}`);
  };

  // ─── Clientes ────────────────────────────────────────
  const onlyDigits = (s: string) => s.replace(/\D/g, '');
  const formatCnpj = (s: string) => {
    const d = onlyDigits(s).slice(0, 14);
    return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  };

  const handleLookup = async () => {
    const digits = onlyDigits(newCnpj);
    if (digits.length !== 14) return toast.error('CNPJ inválido (14 dígitos)');
    setLookingUp(true);
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!r.ok) { toast.error('CNPJ não encontrado na Receita'); return; }
      const d = await r.json();
      setPreview({
        cnpj: digits,
        razao_social: d.razao_social || '',
        nome_fantasia: d.nome_fantasia || '',
        cidade: d.municipio || '',
        uf: d.uf || '',
      });
    } catch {
      toast.error('Erro ao consultar CNPJ');
    } finally {
      setLookingUp(false);
    }
  };

  const handleAddCliente = async () => {
    if (!preview) return;
    const { error } = await supabase.from('energia_clientes' as any).insert({
      cnpj: preview.cnpj,
      razao_social: preview.razao_social,
      nome_fantasia: preview.nome_fantasia || null,
      cidade: preview.cidade || null,
      uf: preview.uf || null,
      nome: preview.razao_social.toUpperCase(),
      updated_by: user?.id,
    } as any);
    if (error) {
      toast.error(error.message.includes('duplicate') || error.message.includes('unique')
        ? 'CNPJ ou razão social já cadastrados'
        : 'Erro ao adicionar cliente');
      return;
    }
    setPreview(null);
    setNewCnpj('');
    toast.success('Cliente adicionado');
    fetchAll();
  };

  const handleUpdateCliente = async (id: string, patch: Partial<EnergiaCliente>) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    const { error } = await supabase
      .from('energia_clientes' as any)
      .update({ ...patch, updated_by: user?.id } as any)
      .eq('id', id);
    if (error) toast.error('Erro ao atualizar cliente');
  };

  const handleDeleteCliente = async (id: string) => {
    if (!confirm('Excluir este cliente? Os módulos vinculados ficarão sem cliente.')) return;
    const { error } = await supabase.from('energia_clientes' as any).delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir cliente');
    toast.success('Cliente excluído');
    fetchAll();
  };

  // ─── Módulos ─────────────────────────────────────────
  const handleAddModulo = async () => {
    const identificador = newModuloId.trim();
    if (!identificador) return;
    const nextOrdem = (modulos[modulos.length - 1]?.ordem ?? 0) + 1;
    const { error } = await supabase.from('energia_modulos' as any).insert({
      identificador,
      ordem: nextOrdem,
      updated_by: user?.id,
    } as any);
    if (error) return toast.error('Erro ao adicionar módulo');
    setNewModuloId('');
    toast.success('Módulo adicionado');
    fetchAll();
  };

  const handleUpdateModulo = async (id: string, patch: Partial<EnergiaModulo>) => {
    setModulos(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
    const { error } = await supabase
      .from('energia_modulos' as any)
      .update({ ...patch, updated_by: user?.id } as any)
      .eq('id', id);
    if (error) toast.error('Erro ao atualizar módulo');
  };

  const handleDeleteModulo = async (id: string) => {
    if (!confirm('Excluir este módulo?')) return;
    const { error } = await supabase.from('energia_modulos' as any).delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir módulo');
    toast.success('Módulo excluído');
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalArea = modulos.reduce((s, m) => s + Number(m.area_m2 || 0), 0);
  const clienteCounts = modulos.reduce<Record<string, number>>((acc, m) => {
    if (m.cliente_id) acc[m.cliente_id] = (acc[m.cliente_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Parâmetros Copel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Parâmetros Copel
          </CardTitle>
          <CardDescription>
            Alíquotas tributárias padrão aplicadas no cálculo do rateio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>ICMS (%)</Label>
              <Input
                type="number" step="0.01"
                value={parametros?.icms_pct ?? 0}
                onChange={e => setParametros(p => p && ({ ...p, icms_pct: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>PIS (%)</Label>
              <Input
                type="number" step="0.01"
                value={parametros?.pis_pct ?? 0}
                onChange={e => setParametros(p => p && ({ ...p, pis_pct: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>COFINS (%)</Label>
              <Input
                type="number" step="0.01"
                value={parametros?.cofins_pct ?? 0}
                onChange={e => setParametros(p => p && ({ ...p, cofins_pct: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea
              rows={3}
              value={parametros?.observacao ?? ''}
              onChange={e => setParametros(p => p && ({ ...p, observacao: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveParametros} disabled={savingParams}>
              {savingParams ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Parâmetros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Clientes de Energia ({clientes.length})
          </CardTitle>
          <CardDescription>
            Cadastre o cliente pelo CNPJ. Razão social, fantasia e cidade/UF são preenchidos automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-md border p-3 bg-muted/30">
            <div className="flex gap-2">
              <Input
                placeholder="CNPJ (ex.: 12.345.678/0001-90)"
                value={newCnpj}
                onChange={(e) => setNewCnpj(formatCnpj(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
              <Button onClick={handleLookup} disabled={lookingUp} variant="outline">
                {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
              </Button>
            </div>
            {preview && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Razão Social:</span> <strong>{preview.razao_social}</strong></div>
                  <div><span className="text-muted-foreground">Nome Fantasia:</span> {preview.nome_fantasia || '—'}</div>
                  <div><span className="text-muted-foreground">Cidade/UF:</span> {preview.cidade} / {preview.uf}</div>
                  <div><span className="text-muted-foreground">CNPJ:</span> {formatCnpj(preview.cnpj)}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddCliente}><Plus className="h-4 w-4 mr-2" />Confirmar cadastro</Button>
                  <Button variant="ghost" onClick={() => setPreview(null)}>Descartar</Button>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">CNPJ</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead className="w-24">Cidade/UF</TableHead>
                  <TableHead className="w-24 text-center">Ativo</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum cliente cadastrado</TableCell></TableRow>
                )}
                {clientes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-mono">{c.cnpj ? formatCnpj(c.cnpj) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-medium">{c.razao_social || c.nome}</TableCell>
                    <TableCell className="text-sm">{c.nome_fantasia || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs">{c.cidade ? `${c.cidade}/${c.uf || '—'}` : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={c.ativo} onCheckedChange={v => handleUpdateCliente(c.id, { ativo: v })} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteCliente(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Módulos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Módulos do Mega Curitiba ({modulos.length})
          </CardTitle>
          <CardDescription>
            Área total: <strong>{totalArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²</strong>. A demanda contratada agora vive no <em>Contrato</em> vinculado ao módulo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Identificador do módulo (ex.: 1, MEZ 1, ÁREA COMUM)"
              value={newModuloId}
              onChange={e => setNewModuloId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddModulo()}
            />
            <Button onClick={handleAddModulo}><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Ordem</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="text-right">Área (m²)</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="w-24 text-center">Ativo</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {modulos.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum módulo cadastrado</TableCell></TableRow>
                )}
                {modulos.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-20"
                        value={m.ordem}
                        onChange={e => setModulos(prev => prev.map(x => x.id === m.id ? { ...x, ordem: Number(e.target.value) } : x))}
                        onBlur={e => handleUpdateModulo(m.id, { ordem: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={m.identificador}
                        onChange={e => setModulos(prev => prev.map(x => x.id === m.id ? { ...x, identificador: e.target.value } : x))}
                        onBlur={e => handleUpdateModulo(m.id, { identificador: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" step="0.01"
                        className="text-right"
                        value={m.area_m2}
                        onChange={e => setModulos(prev => prev.map(x => x.id === m.id ? { ...x, area_m2: Number(e.target.value) } : x))}
                        onBlur={e => handleUpdateModulo(m.id, { area_m2: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.cliente_id ?? UNASSIGNED}
                        onValueChange={v => handleUpdateModulo(m.id, { cliente_id: v === UNASSIGNED ? null : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>— Vago —</SelectItem>
                          {clientes.filter(c => c.ativo).map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.razao_social || c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={m.ativo} onCheckedChange={v => handleUpdateModulo(m.id, { ativo: v })} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteModulo(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}