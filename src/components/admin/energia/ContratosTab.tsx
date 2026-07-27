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
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Plus, Pencil, Trash2, Download, Upload, FileText, X, Search, CalendarCog } from 'lucide-react';
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
const br = (iso?: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

type VigStatus = 'inativo' | 'futuro' | 'encerrado' | 'vigente';
function vigenciaStatus(c: { ativo: boolean; vigencia_inicio: string; vigencia_fim: string | null }, hoje = todayISO()): VigStatus {
  if (!c.ativo) return 'inativo';
  if (c.vigencia_inicio > hoje) return 'futuro';
  if (c.vigencia_fim && c.vigencia_fim < hoje) return 'encerrado';
  return 'vigente';
}
const STATUS_META: Record<VigStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  vigente: { label: 'Ativo', variant: 'default' },
  encerrado: { label: 'Encerrado', variant: 'outline' },
  futuro: { label: 'Futuro', variant: 'outline' },
  inativo: { label: 'Inativo', variant: 'secondary' },
};

/** Dois intervalos [ini, fim] (fim nulo = infinito) se sobrepõem? */
function overlaps(aIni: string, aFim: string | null, bIni: string, bFim: string | null) {
  const aEnd = aFim || '9999-12-31';
  const bEnd = bFim || '9999-12-31';
  return aIni <= bEnd && bIni <= aEnd;
}

export function ContratosTab({ initialFocusContratoId, onFocusHandled }: { initialFocusContratoId?: string | null; onFocusHandled?: () => void } = {}) {
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

  // Foco vindo do Cadastro de Módulos: abre o modal de edição do contrato indicado.
  useEffect(() => {
    if (!initialFocusContratoId || loading) return;
    const c = contratos.find((x) => x.id === initialFocusContratoId);
    if (c) {
      setEditing(c);
      setModalOpen(true);
      onFocusHandled?.();
    }
  }, [initialFocusContratoId, contratos, loading, onFocusHandled]);

  const clienteLabel = (id: string) => {
    const c = clientes.find((x) => x.id === id);
    return c?.razao_social || c?.nome || '—';
  };
  const moduloLabel = (id: string) => modulos.find((m) => m.id === id)?.identificador || '—';

  const filtered = useMemo(() => {
    return contratos.filter((c) => {
      if (filterCliente !== '__all__' && c.cliente_id !== filterCliente) return false;
      if (filterAtivo !== 'todos' && vigenciaStatus(c) !== filterAtivo) return false;
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
                  <SelectItem value="vigente">Vigentes</SelectItem>
                  <SelectItem value="encerrado">Encerrados</SelectItem>
                  <SelectItem value="futuro">Futuros</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
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
                        {br(c.vigencia_inicio)} → {br(c.vigencia_fim)}
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
                        {(() => {
                          const st = vigenciaStatus(c);
                          return (
                            <div className="flex flex-col items-center gap-0.5">
                              <Badge variant={STATUS_META[st].variant}>{STATUS_META[st].label}</Badge>
                              {st === 'encerrado' && (
                                <span className="text-[10px] text-muted-foreground">em {br(c.vigencia_fim)}</span>
                              )}
                              {st === 'futuro' && (
                                <span className="text-[10px] text-muted-foreground">inicia {br(c.vigencia_inicio)}</span>
                              )}
                            </div>
                          );
                        })()}
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
          allVinculos={vinculos}
          contratos={contratos}
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
  open, onOpenChange, contrato, clientes, modulos, existingVinculos, allVinculos, contratos, userId, onSaved, saving, setSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contrato: Contrato | null;
  clientes: Cliente[];
  modulos: Modulo[];
  existingVinculos: ContratoModulo[];
  allVinculos: ContratoModulo[];
  contratos: Contrato[];
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

  const [moduloSearch, setModuloSearch] = useState('');

  // Lookup: modulo_id -> índice no draft (apenas não deletados)
  const draftByModulo = useMemo(() => {
    const map = new Map<string, number>();
    vinculosDraft.forEach((v, i) => {
      if (!v._delete && v.modulo_id) map.set(v.modulo_id, i);
    });
    return map;
  }, [vinculosDraft]);

  const toggleModulo = (moduloId: string, checked: boolean) => {
    setVinculosDraft((p) => {
      const idx = p.findIndex((v) => v.modulo_id === moduloId && !v._delete);
      if (checked) {
        if (idx >= 0) return p;
        // se existe um soft-deleted, restaura
        const delIdx = p.findIndex((v) => v.modulo_id === moduloId && v._delete);
        if (delIdx >= 0) {
          return p.map((v, i) => i === delIdx ? { ...v, _delete: false, vigencia_inicio: vigInicio, vigencia_fim: vigFim || null } : v);
        }
        return [...p, { modulo_id: moduloId, vigencia_inicio: vigInicio, vigencia_fim: vigFim || null }];
      } else {
        if (idx < 0) return p;
        const v = p[idx];
        if (v.id) return p.map((x, i) => i === idx ? { ...x, _delete: true } : x);
        return p.filter((_, i) => i !== idx);
      }
    });
  };

  const updateVinculoDates = (moduloId: string, patch: { vigencia_inicio?: string; vigencia_fim?: string | null }) => {
    setVinculosDraft((p) => p.map((v) => (v.modulo_id === moduloId && !v._delete) ? { ...v, ...patch } : v));
  };

  const filteredModulos = useMemo(() => {
    const term = moduloSearch.trim().toLowerCase();
    const usedByOthers = new Set(
      allVinculos.filter((v) => v.contrato_id !== contrato?.id).map((v) => v.modulo_id),
    );
    const base = modulos.filter((m) => !usedByOthers.has(m.id));
    const list = term ? base.filter((m) => m.identificador.toLowerCase().includes(term)) : base;
    // selecionados primeiro
    return [...list].sort((a, b) => {
      const sa = draftByModulo.has(a.id) ? 0 : 1;
      const sb = draftByModulo.has(b.id) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return a.identificador.localeCompare(b.identificador, undefined, { numeric: true });
    });
  }, [modulos, moduloSearch, draftByModulo, allVinculos, contrato?.id]);

  const selectAllVisible = () => {
    filteredModulos.forEach((m) => {
      if (!draftByModulo.has(m.id)) toggleModulo(m.id, true);
    });
  };
  const clearAllVisible = () => {
    filteredModulos.forEach((m) => {
      if (draftByModulo.has(m.id)) toggleModulo(m.id, false);
    });
  };
  const applyDefaultDatesToSelected = () => {
    setVinculosDraft((p) => p.map((v) => v._delete ? v : ({ ...v, vigencia_inicio: vigInicio, vigencia_fim: vigFim || null })));
    toast.success('Vigência padrão aplicada aos módulos selecionados');
  };

  const selectedCount = draftByModulo.size;
  const hasCustomDates = (v: ModuloVinculoDraft) =>
    v.vigencia_inicio !== vigInicio || (v.vigencia_fim || '') !== (vigFim || '');

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
              <Badge variant={selectedCount > 0 ? 'default' : 'secondary'}>
                {selectedCount} selecionado{selectedCount === 1 ? '' : 's'}
              </Badge>
            </div>
            <div className="rounded-md border">
              {/* Vigência padrão */}
              <div className="p-3 bg-muted/40 border-b space-y-2">
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs">Vigência padrão · início</Label>
                    <Input type="date" value={vigInicio} onChange={(e) => setVigInicio(e.target.value)} />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs">Fim (opc.)</Label>
                    <Input type="date" value={vigFim} onChange={(e) => setVigFim(e.target.value)} />
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={applyDefaultDatesToSelected} disabled={selectedCount === 0}>
                    <CalendarCog className="h-3 w-3 mr-1" /> Aplicar a todos
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Novos módulos marcados herdam essa vigência. Edite por linha se precisar de exceção.
                </p>
              </div>

              {/* Busca + ações em massa */}
              <div className="p-3 border-b flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar módulo..."
                    value={moduloSearch}
                    onChange={(e) => setModuloSearch(e.target.value)}
                    className="pl-7 h-9"
                  />
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={selectAllVisible} disabled={filteredModulos.length === 0}>
                  Selecionar todos
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={clearAllVisible} disabled={selectedCount === 0}>
                  Limpar
                </Button>
              </div>

              {/* Lista */}
              <div className="max-h-80 overflow-y-auto divide-y">
                {filteredModulos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum módulo encontrado</p>
                )}
                {filteredModulos.map((m) => {
                  const draftIdx = draftByModulo.get(m.id);
                  const checked = draftIdx !== undefined;
                  const v = checked ? vinculosDraft[draftIdx!] : null;
                  const custom = v ? hasCustomDates(v) : false;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors ${checked ? 'bg-primary/5' : ''}`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => toggleModulo(m.id, !!c)}
                        id={`mod-${m.id}`}
                      />
                      <label htmlFor={`mod-${m.id}`} className="flex-1 cursor-pointer text-sm font-medium">
                        {m.identificador}
                      </label>
                      {v && (
                        <>
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {v.vigencia_inicio?.split('-').reverse().join('/')}
                            {' → '}
                            {v.vigencia_fim ? v.vigencia_fim.split('-').reverse().join('/') : '—'}
                          </span>
                          {custom && <Badge variant="outline" className="text-[10px] h-5">custom</Badge>}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button type="button" size="sm" variant="ghost" className="h-7 px-2">
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 space-y-2" align="end">
                              <div>
                                <Label className="text-xs">Início</Label>
                                <Input
                                  type="date"
                                  value={v.vigencia_inicio}
                                  onChange={(e) => updateVinculoDates(m.id, { vigencia_inicio: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Fim (opc.)</Label>
                                <Input
                                  type="date"
                                  value={v.vigencia_fim || ''}
                                  onChange={(e) => updateVinculoDates(m.id, { vigencia_fim: e.target.value || null })}
                                />
                              </div>
                              {custom && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => updateVinculoDates(m.id, { vigencia_inicio: vigInicio, vigencia_fim: vigFim || null })}
                                >
                                  Restaurar padrão
                                </Button>
                              )}
                            </PopoverContent>
                          </Popover>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
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