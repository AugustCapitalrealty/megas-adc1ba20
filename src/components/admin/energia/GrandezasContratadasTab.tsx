import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, FileSignature, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Grandeza {
  id: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  demanda_contratada_kw: number;
  tarifa_demanda_usd: number;
  tarifa_demanda_isenta: number;
  tarifa_ultrapassagem: number;
  te_ponta: number;
  tusd_ponta: number;
  te_fora: number;
  tusd_fora: number;
  iluminacao_publica_padrao: number;
  bandeira_valor_padrao: number;
  observacao: string | null;
}

const EMPTY: Omit<Grandeza, 'id'> = {
  vigencia_inicio: new Date().toISOString().slice(0, 10),
  vigencia_fim: null,
  demanda_contratada_kw: 0,
  tarifa_demanda_usd: 0,
  tarifa_demanda_isenta: 0,
  tarifa_ultrapassagem: 0,
  te_ponta: 0, tusd_ponta: 0, te_fora: 0, tusd_fora: 0,
  iluminacao_publica_padrao: 0,
  bandeira_valor_padrao: 0,
  observacao: null,
};

const FIELDS: { key: keyof typeof EMPTY; label: string; step: string; group: string }[] = [
  { key: 'demanda_contratada_kw', label: 'Demanda Contratada (kW)', step: '0.01', group: 'Demanda' },
  { key: 'tarifa_demanda_usd', label: 'Tarifa Demanda USD (R$/kW)', step: '0.000001', group: 'Demanda' },
  { key: 'tarifa_demanda_isenta', label: 'Tarifa Demanda Isenta (R$/kW)', step: '0.000001', group: 'Demanda' },
  { key: 'tarifa_ultrapassagem', label: 'Tarifa Ultrapassagem (R$/kW)', step: '0.000001', group: 'Demanda' },
  { key: 'te_ponta', label: 'TE Ponta (R$/kWh)', step: '0.000001', group: 'Energia' },
  { key: 'tusd_ponta', label: 'TUSD Ponta (R$/kWh)', step: '0.000001', group: 'Energia' },
  { key: 'te_fora', label: 'TE Fora Ponta (R$/kWh)', step: '0.000001', group: 'Energia' },
  { key: 'tusd_fora', label: 'TUSD Fora Ponta (R$/kWh)', step: '0.000001', group: 'Energia' },
  { key: 'iluminacao_publica_padrao', label: 'Iluminação Pública padrão (R$)', step: '0.01', group: 'Outros' },
  { key: 'bandeira_valor_padrao', label: 'Bandeira padrão (R$/100 kWh)', step: '0.01', group: 'Outros' },
];

export function GrandezasContratadasTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Grandeza[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Grandeza | (Omit<Grandeza, 'id'> & { id?: string }) | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('energia_grandezas_contratadas' as any)
      .select('*')
      .order('vigencia_inicio', { ascending: false });
    if (error) toast.error('Erro ao carregar grandezas');
    else setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  const handleNew = () => {
    const ultimaSemFim = rows.find(r => r.vigencia_fim === null);
    setEditing({
      ...EMPTY,
      vigencia_inicio: ultimaSemFim
        ? new Date(new Date(ultimaSemFim.vigencia_inicio).getTime() + 86400000).toISOString().slice(0, 10)
        : EMPTY.vigencia_inicio,
    });
    setOpen(true);
  };
  const handleEdit = (r: Grandeza) => { setEditing({ ...r }); setOpen(true); };

  const handleSave = async () => {
    if (!editing) return;
    const payload: any = { ...editing, updated_by: user?.id };
    // Encerra vigência aberta anterior se nova começa antes de hoje + 1
    if (!editing.id) {
      const aberta = rows.find(r => r.vigencia_fim === null);
      if (aberta) {
        const fimAnt = new Date(new Date(editing.vigencia_inicio).getTime() - 86400000).toISOString().slice(0, 10);
        const { error } = await supabase
          .from('energia_grandezas_contratadas' as any)
          .update({ vigencia_fim: fimAnt, updated_by: user?.id })
          .eq('id', aberta.id);
        if (error) return toast.error('Erro ao encerrar vigência anterior: ' + error.message);
      }
    }
    const op = editing.id
      ? supabase.from('energia_grandezas_contratadas' as any).update(payload).eq('id', editing.id)
      : supabase.from('energia_grandezas_contratadas' as any).insert(payload);
    const { error } = await op;
    if (error) return toast.error('Erro ao salvar: ' + error.message);
    toast.success('Grandeza salva');
    setOpen(false);
    setEditing(null);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta vigência?')) return;
    const { error } = await supabase.from('energia_grandezas_contratadas' as any).delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir');
    toast.success('Excluído');
    fetchAll();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Grandezas Contratadas (Copel)
            </CardTitle>
            <CardDescription>
              Contrato vigente com a Copel. Cada vigência cadastrada serve como default para as competências do período.
            </CardDescription>
          </div>
          <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" /> Nova Vigência</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vigência</TableHead>
                  <TableHead className="text-right">Demanda (kW)</TableHead>
                  <TableHead className="text-right">TE Ponta</TableHead>
                  <TableHead className="text-right">TUSD Ponta</TableHead>
                  <TableHead className="text-right">TE Fora</TableHead>
                  <TableHead className="text-right">TUSD Fora</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhuma vigência cadastrada</TableCell></TableRow>
                )}
                {rows.map(r => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => handleEdit(r)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{r.vigencia_inicio} → {r.vigencia_fim ?? '∞'}</span>
                        {r.vigencia_fim === null && <Badge>Vigente</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.demanda_contratada_kw).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.te_ponta).toFixed(6)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.tusd_ponta).toFixed(6)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.te_fora).toFixed(6)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.tusd_fora).toFixed(6)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing && 'id' in editing && editing.id ? 'Editar Vigência' : 'Nova Vigência'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Vigência Início</Label>
                  <Input type="date" value={editing.vigencia_inicio} onChange={(e) => setEditing({ ...editing, vigencia_inicio: e.target.value })} />
                </div>
                <div>
                  <Label>Vigência Fim (vazio = vigente)</Label>
                  <Input type="date" value={editing.vigencia_fim ?? ''} onChange={(e) => setEditing({ ...editing, vigencia_fim: e.target.value || null })} />
                </div>
              </div>
              {Array.from(new Set(FIELDS.map(f => f.group))).map(g => (
                <div key={g}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{g}</h4>
                  <div className="grid gap-3 md:grid-cols-3">
                    {FIELDS.filter(f => f.group === g).map(f => (
                      <div key={f.key}>
                        <Label className="text-xs">{f.label}</Label>
                        <Input
                          type="number" step={f.step}
                          value={Number((editing as any)[f.key] ?? 0)}
                          onChange={(e) => setEditing({ ...editing, [f.key]: Number(e.target.value) } as any)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <Label>Observação</Label>
                <Textarea rows={2} value={editing.observacao ?? ''} onChange={(e) => setEditing({ ...editing, observacao: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}