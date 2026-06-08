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
import { Loader2, Plus, Save, Trash2, Zap, Users, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface EnergiaCliente {
  id: string;
  nome: string;
  ativo: boolean;
  observacao: string | null;
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

export function RateioEnergiaTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingParams, setSavingParams] = useState(false);

  const [parametros, setParametros] = useState<EnergiaParametros | null>(null);
  const [clientes, setClientes] = useState<EnergiaCliente[]>([]);
  const [modulos, setModulos] = useState<EnergiaModulo[]>([]);

  const [newClienteNome, setNewClienteNome] = useState('');
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
    setSavingParams(false);
    if (error) toast.error('Erro ao salvar parâmetros');
    else toast.success('Parâmetros salvos');
  };

  // ─── Clientes ────────────────────────────────────────
  const handleAddCliente = async () => {
    const nome = newClienteNome.trim().toUpperCase();
    if (!nome) return;
    const { error } = await supabase.from('energia_clientes' as any).insert({ nome, updated_by: user?.id } as any);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Cliente já cadastrado' : 'Erro ao adicionar cliente');
      return;
    }
    setNewClienteNome('');
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
  const totalDemanda = modulos.reduce((s, m) => s + Number(m.demanda_contratada_kw || 0), 0);

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
            Razões sociais que recebem cobrança de energia rateada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do cliente (ex.: BOSCH, CALAMO)"
              value={newClienteNome}
              onChange={e => setNewClienteNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCliente()}
            />
            <Button onClick={handleAddCliente}><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="w-24 text-center">Ativo</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhum cliente cadastrado</TableCell></TableRow>
                )}
                {clientes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Input
                        value={c.nome}
                        onChange={e => setClientes(prev => prev.map(x => x.id === c.id ? { ...x, nome: e.target.value } : x))}
                        onBlur={e => handleUpdateCliente(c.id, { nome: e.target.value.trim().toUpperCase() })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={c.observacao ?? ''}
                        onChange={e => setClientes(prev => prev.map(x => x.id === c.id ? { ...x, observacao: e.target.value } : x))}
                        onBlur={e => handleUpdateCliente(c.id, { observacao: e.target.value || null })}
                      />
                    </TableCell>
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
            Área total: <strong>{totalArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²</strong> · Demanda contratada total: <strong>{totalDemanda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kW</strong>
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
                  <TableHead className="text-right">Demanda contratada (kW)</TableHead>
                  <TableHead className="w-24 text-center">Ativo</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {modulos.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhum módulo cadastrado</TableCell></TableRow>
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
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" step="0.01"
                        className="text-right"
                        value={m.demanda_contratada_kw}
                        onChange={e => setModulos(prev => prev.map(x => x.id === m.id ? { ...x, demanda_contratada_kw: Number(e.target.value) } : x))}
                        onBlur={e => handleUpdateModulo(m.id, { demanda_contratada_kw: Number(e.target.value) })}
                      />
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