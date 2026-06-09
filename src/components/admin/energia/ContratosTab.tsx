import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, Download, Upload, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

interface Cliente { id: string; razao_social: string | null; nome: string; cnpj: string | null; ativo: boolean; }
interface Modulo  { id: string; identificador: string; ativo: boolean; ordem: number; }
interface Contrato {
  id: string;
  numero_contrato: string;
  cliente_id: string;
  demanda_contratada_kw: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  termo_demanda_path: string | null;
  ativo: boolean;
  observacao: string | null;
}
interface ContratoModulo {
  id: string;
  contrato_id: string;
  modulo_id: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
}

interface ModuloVinculoDraft {
  id?: string;
  modulo_id: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  _delete?: boolean;
}

const BUCKET = 'energia-contratos';
const todayISO = () => new Date().toISOString().slice(0, 10);

export function ContratosTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [vinculos, setVinculos] = useState<ContratoModulo[]>([]);
  const [filterCliente, setFilterCliente] = useState<string>('__all__');
  const [filterAtivo, setFilterAtivo] = useState<string>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [cli, mod, con, vin] = await Promise.all([
      supabase.from('energia_clientes' as any).select('id, nome, razao_social, cnpj, ativo').order('razao_social', { nullsFirst: false }),
      supabase.from('energia_modulos' as any).select('id, identificador, ativo, ordem').order('ordem'),
      supabase.from('energia_contratos' as any).select('*').order('numero_contrato'),
      supabase.from('energia_contrato_modulos' as any).select('*'),
    ]);
    if (cli.error) toast.error('Erro ao carregar clientes');
    else setClientes((cli.data as any) || []);
    if (mod.error) toast.error('Erro ao carregar módulos');
    else setModulos((mod.data as any) || []);
    if (con.error) toast.error('Erro ao carregar contratos');
    else setContratos((con.data as any) || []);
    if (vin.error) toast.error('Erro ao carregar vínculos');
    else setVinculos((vin.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const clienteLabel = (id: string) => {
    const c = clientes.find((x) => x.id === id);
    return c?.razao_social || c?.nome || '—';
  };
  const moduloLabel = (id: string) => modulos.find((m) => m.id === id)?.identificador || '—';

  const filtered = useMemo(() => {
    return contratos.filter((c) => {
      if (filterCliente !== '__all__' && c.cliente_id !== filterCliente) return false;
      if (filterAtivo === 'ativos' && !c.ativo) return false;
      if (filterAtivo === 'inativos' && c.ativo) return false;
      return true;
    });
  }, [contratos, filterCliente, filterAtivo]);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: Contrato) => { setEditing(c); setModalOpen(true); };

  const handleDelete = async (c: Contrato) => {
    if (!confirm(`Excluir contrato ${c.numero_contrato}? Os vínculos com módulos também serão removidos.`)) return;
    const { error } = await supabase.from('energia_contratos' as any).delete().eq('id', c.id);
    if (error) return toast.error('Erro ao excluir');
    if (c.termo_demanda_path) {
      await supabase.storage.from(BUCKET).remove([c.termo_demanda_path]);
    }
    toast.success('Contrato excluído');
    fetchAll();
  };

  const downloadTermo = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return toast.error('Erro ao gerar link');
    window.open(data.signedUrl, '_blank');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Contratos de Energia ({contratos.length})
          </CardTitle>
          <CardDescription>
            Cada contrato define a demanda contratada para um conjunto de módulos durante uma vigência. A Memória de Cálculo lê a demanda do contrato ativo no mês.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <Label>Cliente</Label>
              <Select value={filterCliente} onValueChange={setFilterCliente}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.razao_social || c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterAtivo} onValueChange={setFilterAtivo}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Contrato</Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Demanda (kW)</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Módulos</TableHead>
                  <TableHead className="text-center">Termo</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Nenhum contrato</TableCell></TableRow>
                )}
                {filtered.map((c) => {
                  const mods = vinculos.filter((v) => v.contrato_id === c.id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.numero_contrato}</TableCell>
                      <TableCell>{clienteLabel(c.cliente_id)}</TableCell>
                      <TableCell className="text-right">{Number(c.demanda_contratada_kw).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-xs">
                        {c.vigencia_inicio} → {c.vigencia_fim || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {mods.length === 0 && <span className="text-xs text-muted-foreground">Nenhum</span>}
                          {mods.map((m) => (
                            <Badge key={m.id} variant="secondary" className="text-xs">{moduloLabel(m.modulo_id)}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {c.termo_demanda_path ? (
                          <Button size="icon" variant="ghost" onClick={() => downloadTermo(c.termo_demanda_path!)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.ativo ? 'default' : 'secondary'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {modalOpen && (
        <ContratoModal
          open={modalOpen}
          onOpenChange={(v) => { setModalOpen(v); if (!v) setEditing(null); }}
          contrato={editing}
          clientes={clientes.filter((c) => c.ativo)}
          modulos={modulos.filter((m) => m.ativo)}
          existingVinculos={editing ? vinculos.filter((v) => v.contrato_id === editing.id) : []}
          userId={user?.id || null}
          onSaved={() => { setModalOpen(false); setEditing(null); fetchAll(); }}
          saving={saving}
          setSaving={setSaving}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function ContratoModal({
  open, onOpenChange, contrato, clientes, modulos, existingVinculos, userId, onSaved, saving, setSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contrato: Contrato | null;
  clientes: Cliente[];
  modulos: Modulo[];
  existingVinculos: ContratoModulo[];
  userId: string | null;
  onSaved: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  const [numero, setNumero] = useState(contrato?.numero_contrato || '');
  const [clienteId, setClienteId] = useState(contrato?.cliente_id || '');
  const [demanda, setDemanda] = useState<number>(contrato?.demanda_contratada_kw || 0);
  const [vigInicio, setVigInicio] = useState(contrato?.vigencia_inicio || todayISO());
  const [vigFim, setVigFim] = useState<string>(contrato?.vigencia_fim || '');
  const [ativo, setAtivo] = useState(contrato?.ativo ?? true);
  const [observacao, setObservacao] = useState(contrato?.observacao || '');
  const [file, setFile] = useState<File | null>(null);
  const [existingPath] = useState(contrato?.termo_demanda_path || null);
  const [vinculosDraft, setVinculosDraft] = useState<ModuloVinculoDraft[]>(
    existingVinculos.map((v) => ({ id: v.id, modulo_id: v.modulo_id, vigencia_inicio: v.vigencia_inicio, vigencia_fim: v.vigencia_fim })),
  );

  const addVinculo = () => {
    setVinculosDraft((p) => [...p, { modulo_id: '', vigencia_inicio: vigInicio, vigencia_fim: vigFim || null }]);
  };
  const updateVinculo = (i: number, patch: Partial<ModuloVinculoDraft>) => {
    setVinculosDraft((p) => p.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  };
  const removeVinculo = (i: number) => {
    setVinculosDraft((p) => {
      const v = p[i];
      if (v.id) return p.map((x, idx) => idx === i ? { ...x, _delete: true } : x);
      return p.filter((_, idx) => idx !== i);
    });
  };

  const handleSave = async () => {
    if (!numero.trim()) return toast.error('Informe o número do contrato');
    if (!clienteId) return toast.error('Selecione o cliente');
    if (!vigInicio) return toast.error('Informe a vigência inicial');
    if (demanda <= 0) return toast.error('Demanda deve ser maior que zero');

    setSaving(true);
    try {
      // 1) upload arquivo se houver
      let termoPath = existingPath;
      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${clienteId}/${Date.now()}-${numero.trim().replace(/[^\w-]+/g, '_')}.${ext}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
        if (up.error) { toast.error('Erro ao enviar termo'); setSaving(false); return; }
        if (existingPath && existingPath !== path) {
          await supabase.storage.from(BUCKET).remove([existingPath]);
        }
        termoPath = path;
      }

      // 2) upsert contrato
      const payload: any = {
        numero_contrato: numero.trim(),
        cliente_id: clienteId,
        demanda_contratada_kw: demanda,
        vigencia_inicio: vigInicio,
        vigencia_fim: vigFim || null,
        termo_demanda_path: termoPath,
        ativo,
        observacao: observacao || null,
        updated_by: userId,
      };
      let contratoId = contrato?.id;
      if (contrato) {
        const { error } = await supabase.from('energia_contratos' as any).update(payload).eq('id', contrato.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('energia_contratos' as any).insert(payload).select().single();
        if (error) throw error;
        contratoId = (data as any).id;
      }

      // 3) sincronizar vínculos
      const toDelete = vinculosDraft.filter((v) => v._delete && v.id).map((v) => v.id!);
      const toUpdate = vinculosDraft.filter((v) => !v._delete && v.id && v.modulo_id);
      const toInsert = vinculosDraft.filter((v) => !v._delete && !v.id && v.modulo_id);

      if (toDelete.length) {
        const { error } = await supabase.from('energia_contrato_modulos' as any).delete().in('id', toDelete);
        if (error) throw error;
      }
      for (const v of toUpdate) {
        const { error } = await supabase.from('energia_contrato_modulos' as any).update({
          modulo_id: v.modulo_id,
          vigencia_inicio: v.vigencia_inicio,
          vigencia_fim: v.vigencia_fim || null,
          updated_by: userId,
        }).eq('id', v.id!);
        if (error) throw error;
      }
      if (toInsert.length) {
        const rows = toInsert.map((v) => ({
          contrato_id: contratoId,
          modulo_id: v.modulo_id,
          vigencia_inicio: v.vigencia_inicio,
          vigencia_fim: v.vigencia_fim || null,
          updated_by: userId,
        }));
        const { error } = await supabase.from('energia_contrato_modulos' as any).insert(rows);
        if (error) throw error;
      }

      toast.success(contrato ? 'Contrato atualizado' : 'Contrato criado');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message?.includes('sobreposto')
        ? 'Há módulo com vínculo de vigência sobreposta'
        : e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contrato ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Número do Contrato *</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
            <div>
              <Label>Cliente *</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.razao_social || c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Demanda Contratada (kW) *</Label>
              <Input type="number" step="0.01" value={demanda} onChange={(e) => setDemanda(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              <Label>Contrato ativo</Label>
            </div>
            <div>
              <Label>Vigência Início *</Label>
              <Input type="date" value={vigInicio} onChange={(e) => setVigInicio(e.target.value)} />
            </div>
            <div>
              <Label>Vigência Fim (opcional)</Label>
              <Input type="date" value={vigFim} onChange={(e) => setVigFim(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Termo de Demanda (PDF, máx 10MB)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size > 10 * 1024 * 1024) return toast.error('Arquivo > 10MB');
                  setFile(f || null);
                }}
              />
              {existingPath && !file && (
                <Badge variant="secondary" className="gap-1"><Upload className="h-3 w-3" /> Termo já anexado</Badge>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Módulos vinculados</Label>
              <Button type="button" size="sm" variant="outline" onClick={addVinculo}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar módulo
              </Button>
            </div>
            <div className="space-y-2 rounded-md border p-3">
              {vinculosDraft.filter((v) => !v._delete).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">Nenhum módulo vinculado</p>
              )}
              {vinculosDraft.map((v, i) => {
                if (v._delete) return null;
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label className="text-xs">Módulo</Label>
                      <Select value={v.modulo_id} onValueChange={(val) => updateVinculo(i, { modulo_id: val })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {modulos.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.identificador}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Início</Label>
                      <Input type="date" value={v.vigencia_inicio} onChange={(e) => updateVinculo(i, { vigencia_inicio: e.target.value })} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Fim (opc.)</Label>
                      <Input type="date" value={v.vigencia_fim || ''} onChange={(e) => updateVinculo(i, { vigencia_fim: e.target.value || null })} />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeVinculo(i)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Observação</Label>
            <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {contrato ? 'Salvar' : 'Criar Contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}