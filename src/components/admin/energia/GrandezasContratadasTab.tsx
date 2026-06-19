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
import { Loader2, Plus, Trash2, FileSignature, Save, Info } from 'lucide-react';
import { toast } from 'sonner';

// "Grandezas Contratadas" = bloco fixo do contrato com a Copel (muda só quando
// renegocia a concessionária). NÃO contém tarifas mensais — essas vivem na
// fatura mensal (aba "Conferência com a Fatura Copel" em Memória de Cálculo).
interface Grandeza {
  id: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  demanda_contratada_kw: number;
  demanda_fora_ponta_kw: number;
  energia_ponta_kwh: number;
  energia_fora_ponta_kwh: number;
  res_capacidade_ponta_kw: number;
  res_capacidade_fora_ponta_kw: number;
  montante_ponta_kw: number;
  montante_fora_ponta_kw: number;
  observacao: string | null;
}

const EMPTY: Omit<Grandeza, 'id'> = {
  vigencia_inicio: new Date().toISOString().slice(0, 10),
  vigencia_fim: null,
  demanda_contratada_kw: 750,
  demanda_fora_ponta_kw: 0,
  energia_ponta_kwh: 0,
  energia_fora_ponta_kwh: 0,
  res_capacidade_ponta_kw: 0,
  res_capacidade_fora_ponta_kw: 0,
  montante_ponta_kw: 0,
  montante_fora_ponta_kw: 0,
  observacao: null,
};

const FIELDS: { key: keyof typeof EMPTY; label: string; unit: string }[] = [
  { key: 'demanda_contratada_kw', label: 'Demanda Todos os Períodos', unit: 'kW' },
  { key: 'demanda_fora_ponta_kw', label: 'Demanda Fora Ponta', unit: 'kW' },
  { key: 'energia_ponta_kwh', label: 'Energia Ponta', unit: 'kWh' },
  { key: 'energia_fora_ponta_kwh', label: 'Energia Fora Ponta', unit: 'kWh' },
  { key: 'res_capacidade_ponta_kw', label: 'Res. Capacidade Ponta', unit: 'kW' },
  { key: 'res_capacidade_fora_ponta_kw', label: 'Res. Capacidade Fora Ponta', unit: 'kW' },
  { key: 'montante_ponta_kw', label: 'Montante na Ponta', unit: 'kW' },
  { key: 'montante_fora_ponta_kw', label: 'Montante Fora de Ponta', unit: 'kW' },
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
      .select('id,vigencia_inicio,vigencia_fim,demanda_contratada_kw,demanda_fora_ponta_kw,energia_ponta_kwh,energia_fora_ponta_kwh,res_capacidade_ponta_kw,res_capacidade_fora_ponta_kw,montante_ponta_kw,montante_fora_ponta_kw,observacao')
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
    const payload: any = {
      vigencia_inicio: editing.vigencia_inicio,
      vigencia_fim: editing.vigencia_fim,
      demanda_contratada_kw: editing.demanda_contratada_kw,
      demanda_fora_ponta_kw: editing.demanda_fora_ponta_kw,
      energia_ponta_kwh: editing.energia_ponta_kwh,
      energia_fora_ponta_kwh: editing.energia_fora_ponta_kwh,
      res_capacidade_ponta_kw: editing.res_capacidade_ponta_kw,
      res_capacidade_fora_ponta_kw: editing.res_capacidade_fora_ponta_kw,
      montante_ponta_kw: editing.montante_ponta_kw,
      montante_fora_ponta_kw: editing.montante_fora_ponta_kw,
      observacao: editing.observacao,
      updated_by: user?.id,
    };
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
      <Card className="border-l-4 border-l-primary">
        <CardContent className="py-3 flex items-start gap-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
          <div>
            <strong className="text-foreground">Grandezas Contratadas</strong> é o bloco fixo do contrato com a Copel
            (muda só quando renegociamos a concessionária). Tarifas, tributos e itens
            da fatura (TE, TUSD, ICMS, PIS/COFINS, bandeira) são preenchidos
            <strong className="text-foreground"> mês a mês</strong> em <em>Memória de Cálculo → Conferência com a Fatura Copel</em>.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Grandezas Contratadas — Contrato Copel
            </CardTitle>
            <CardDescription>
              Vigências do contrato com a Copel. A Demanda Contratada é a única grandeza
              normalmente diferente de zero — hoje <strong>750 kW</strong> Todos os Períodos.
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
                  <TableHead className="text-right">Demanda Todos Períodos (kW)</TableHead>
                  <TableHead className="text-right">Demanda Fora Ponta (kW)</TableHead>
                  <TableHead className="text-right">Energia Ponta (kWh)</TableHead>
                  <TableHead className="text-right">Energia Fora (kWh)</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma vigência cadastrada</TableCell></TableRow>
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
                    <TableCell className="text-right tabular-nums">{Number(r.demanda_fora_ponta_kw ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.energia_ponta_kwh ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.energia_fora_ponta_kwh ?? 0).toFixed(2)}</TableCell>
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
        <DialogContent className="max-w-2xl">
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
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Grandezas do Contrato</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {FIELDS.map(f => (
                    <div key={f.key}>
                      <Label className="text-xs">{f.label} ({f.unit})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={Number((editing as any)[f.key] ?? 0)}
                        onChange={(e) => setEditing({ ...editing, [f.key]: Number(e.target.value) } as any)}
                      />
                    </div>
                  ))}
                </div>
              </div>
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