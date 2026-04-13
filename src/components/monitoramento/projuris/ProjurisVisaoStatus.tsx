import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, GripVertical, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProjurisRow {
  id: string;
  numero_requisicao: string;
  numero_fluig: string | null;
  status: string | null;
  responsavel: string | null;
  data_requisicao: string | null;
  data_ultima_aprovacao: string | null;
  data_ultimo_envio_aprovacao: string | null;
  empreendimento: string | null;
  tipo_requisicao: string | null;
  cliente_fornecedor: string | null;
  detalhes: string | null;
  ordem_prioridade: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  'FINALIZADA': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'EXECUTADA': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'EM REQUISIÇÃO': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'AGUARDANDO APROVAÇÃO': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'AGUARDANDO EXECUÇÃO': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'AGUARDANDO INFORMAÇÕES': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'CANCELADA': 'bg-destructive/10 text-destructive',
  'REPROVADA': 'bg-destructive/10 text-destructive',
};

function SortableRow({ row, index }: { row: ProjurisRow; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(isDragging && 'bg-muted')}>
      <TableCell className="w-12 text-center">
        <div className="flex items-center gap-1">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-xs font-mono font-medium">{index + 1}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm font-medium">{row.numero_requisicao}</TableCell>
      <TableCell>
        <Badge className={cn('text-xs', STATUS_COLORS[row.status || ''] || 'bg-muted text-muted-foreground')}>
          {row.status || '—'}
        </Badge>
      </TableCell>
      <TableCell className="text-sm max-w-[180px] truncate">{row.responsavel || '—'}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{row.data_requisicao ? formatBR(row.data_requisicao, 'dd/MM/yyyy') : '—'}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{row.data_ultima_aprovacao ? formatBR(row.data_ultima_aprovacao, 'dd/MM/yyyy') : '—'}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{row.data_ultimo_envio_aprovacao ? formatBR(row.data_ultimo_envio_aprovacao, 'dd/MM/yyyy') : '—'}</TableCell>
      <TableCell className="text-sm">{row.empreendimento || '—'}</TableCell>
      <TableCell className="text-sm max-w-[180px] truncate">{row.cliente_fornecedor || '—'}</TableCell>
    </TableRow>
  );
}

export function ProjurisVisaoStatus() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProjurisRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmpreendimento, setFilterEmpreendimento] = useState('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projuris_requisicoes')
      .select('id, numero_requisicao, numero_fluig, status, responsavel, data_requisicao, data_ultima_aprovacao, data_ultimo_envio_aprovacao, empreendimento, tipo_requisicao, cliente_fornecedor, detalhes, ordem_prioridade')
      .order('ordem_prioridade', { ascending: true, nullsFirst: false })
      .order('data_requisicao', { ascending: false });
    setRows((data as ProjurisRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterEmpreendimento !== 'all' && r.empreendimento !== filterEmpreendimento) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          r.numero_requisicao?.toLowerCase().includes(s) ||
          r.responsavel?.toLowerCase().includes(s) ||
          r.cliente_fornecedor?.toLowerCase().includes(s) ||
          r.detalhes?.toLowerCase().includes(s) ||
          r.numero_fluig?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [rows, search, filterStatus, filterEmpreendimento]);

  const statuses = useMemo(() => [...new Set(rows.map(r => r.status).filter(Boolean))].sort(), [rows]);
  const empreendimentos = useMemo(() => [...new Set(rows.map(r => r.empreendimento).filter(Boolean))].sort(), [rows]);

  const kpis = useMemo(() => {
    const active = rows.filter(r => !['FINALIZADA', 'CANCELADA', 'REPROVADA'].includes(r.status || ''));
    return {
      total: rows.length,
      ativos: active.length,
      aguardandoAprovacao: rows.filter(r => r.status === 'AGUARDANDO APROVAÇÃO').length,
      emRequisicao: rows.filter(r => r.status === 'EM REQUISIÇÃO').length,
      finalizadas: rows.filter(r => r.status === 'FINALIZADA').length,
    };
  }, [rows]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredRows.findIndex(r => r.id === active.id);
    const newIndex = filteredRows.findIndex(r => r.id === over.id);
    const reordered = arrayMove(filteredRows, oldIndex, newIndex);

    setRows(prev => {
      const filteredIds = new Set(reordered.map(r => r.id));
      const others = prev.filter(r => !filteredIds.has(r.id));
      return [...reordered, ...others];
    });

    const updates = reordered.map((r, i) => ({ id: r.id, ordem_prioridade: i + 1 }));
    for (const u of updates) {
      await supabase.from('projuris_requisicoes').update({ ordem_prioridade: u.ordem_prioridade }).eq('id', u.id);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: kpis.total, icon: FileText, color: 'text-primary' },
          { label: 'Ativos', value: kpis.ativos, icon: Clock, color: 'text-blue-600' },
          { label: 'Aguard. Aprovação', value: kpis.aguardandoAprovacao, icon: AlertTriangle, color: 'text-orange-600' },
          { label: 'Em Requisição', value: kpis.emRequisicao, icon: Clock, color: 'text-yellow-600' },
          { label: 'Finalizadas', value: kpis.finalizadas, icon: CheckCircle, color: 'text-green-600' },
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
            <SelectItem value="all">Todos os Status</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEmpreendimento} onValueChange={setFilterEmpreendimento}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Empreendimento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {empreendimentos.map(e => <SelectItem key={e} value={e!}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[600px]">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredRows.map(r => r.id)} strategy={verticalListSortingStrategy}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Seq.</TableHead>
                  <TableHead>Nº Req.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data Req.</TableHead>
                  <TableHead>Últ. Aprov.</TableHead>
                  <TableHead>Últ. Envio Aprov.</TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Cliente/Fornecedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                ) : (
                  filteredRows.map((row, i) => <SortableRow key={row.id} row={row} index={i} />)
                )}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      </ScrollArea>
    </div>
  );
}
