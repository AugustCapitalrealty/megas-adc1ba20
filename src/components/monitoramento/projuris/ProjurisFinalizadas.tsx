import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, CheckCircle, XCircle, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjurisRow {
  id: string;
  numero_requisicao: string;
  status: string | null;
  responsavel: string | null;
  data_requisicao: string | null;
  data_finalizacao: string | null;
  empreendimento: string | null;
  cliente_fornecedor: string | null;
  updated_at: string;
}

const CLOSED_STATUSES = ['FINALIZADA', 'CANCELADA', 'REPROVADA'];

const STATUS_COLORS: Record<string, string> = {
  'FINALIZADA': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'CANCELADA': 'bg-destructive/10 text-destructive',
  'REPROVADA': 'bg-destructive/10 text-destructive',
};

function fmt(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return '—'; }
}

export function ProjurisFinalizadas() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProjurisRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projuris_requisicoes')
      .select('id, numero_requisicao, status, responsavel, data_requisicao, data_finalizacao, empreendimento, cliente_fornecedor, updated_at')
      .in('status', CLOSED_STATUSES)
      .order('data_finalizacao', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });
    setRows((data as ProjurisRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        return r.numero_requisicao?.toLowerCase().includes(s) || r.responsavel?.toLowerCase().includes(s) || r.cliente_fornecedor?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [rows, search, filterStatus]);

  const kpis = useMemo(() => ({
    total: rows.length,
    finalizadas: rows.filter(r => r.status === 'FINALIZADA').length,
    canceladas: rows.filter(r => r.status === 'CANCELADA').length,
    reprovadas: rows.filter(r => r.status === 'REPROVADA').length,
  }), [rows]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: kpis.total, icon: CheckCircle, color: 'text-primary' },
          { label: 'Finalizadas', value: kpis.finalizadas, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Canceladas', value: kpis.canceladas, icon: Ban, color: 'text-destructive' },
          { label: 'Reprovadas', value: kpis.reprovadas, icon: XCircle, color: 'text-destructive' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <kpi.icon className={cn('h-4 w-4', kpi.color)} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {CLOSED_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Req.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Data Req.</TableHead>
              <TableHead>Data Finalização</TableHead>
              <TableHead>Empreendimento</TableHead>
              <TableHead>Cliente/Fornecedor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
            ) : (
              filtered.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm font-medium">{row.numero_requisicao}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', STATUS_COLORS[row.status || ''] || 'bg-muted text-muted-foreground')}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{row.responsavel || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(row.data_requisicao)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(row.data_finalizacao)}</TableCell>
                  <TableCell className="text-sm">{row.empreendimento || '—'}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate">{row.cliente_fornecedor || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
