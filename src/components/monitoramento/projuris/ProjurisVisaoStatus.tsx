import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, GripVertical, FileText, Clock, AlertTriangle, Link2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProjurisDetalhesModal } from './ProjurisDetalhesModal';
import { OCDetalhesModal } from '../OCDetalhesModal';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { canViewEmpreendimentoLivre } from '@/lib/empreendimento-match';

interface ProjurisRow {
  id: string;
  numero_requisicao: string;
  numero_fluig: string | null;
  status: string | null;
  responsavel: string | null;
  requisitante: string | null;
  data_requisicao: string | null;
  data_ultima_aprovacao: string | null;
  data_ultimo_envio_aprovacao: string | null;
  data_finalizacao: string | null;
  empreendimento: string | null;
  tipo_requisicao: string | null;
  cliente_fornecedor: string | null;
  detalhes: string | null;
  ordem_prioridade: number | null;
  updated_at: string;
}

interface SolicitacaoVinculo {
  id: string;
  protocolo: string;
  status: string;
}

const CLOSED_STATUSES = ['FINALIZADA', 'CANCELADA', 'REPROVADA'];

const STATUS_COLORS: Record<string, string> = {
  'EXECUTADA': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'EM REQUISIÇÃO': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'AGUARDANDO APROVAÇÃO': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'AGUARDANDO EXECUÇÃO': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'AGUARDANDO INFORMAÇÕES': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return '—'; }
}

function getTempoParado(row: ProjurisRow): { days: number; color: string } | null {
  const ref = row.status === 'AGUARDANDO APROVAÇÃO' && row.data_ultimo_envio_aprovacao
    ? row.data_ultimo_envio_aprovacao
    : row.data_requisicao;
  if (!ref) return null;
  try {
    const days = differenceInDays(new Date(), new Date(ref));
    const color = days < 7 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : days < 14 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    return { days, color };
  } catch { return null; }
}

function getFornecedorNome(cf: string | null): string {
  if (!cf) return '—';
  const parts = cf.split(' - ');
  return parts[0]?.trim() || '—';
}

function SortableRow({ row, index, onSelect, vinculo, onOpenVinculo }: {
  row: ProjurisRow;
  index: number;
  onSelect: (r: ProjurisRow) => void;
  vinculo?: SolicitacaoVinculo;
  onOpenVinculo: (v: SolicitacaoVinculo) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const tempo = getTempoParado(row);

  return (
    <TableRow ref={setNodeRef} style={style} className={cn('cursor-pointer hover:bg-muted/50', isDragging && 'bg-muted')} onClick={() => onSelect(row)}>
      <TableCell className="w-12 text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-xs font-mono font-medium">{index + 1}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm font-medium">{row.numero_requisicao}</TableCell>
      <TableCell className="text-sm max-w-[140px] truncate">{getFornecedorNome(row.cliente_fornecedor)}</TableCell>
      <TableCell className="text-sm max-w-[120px] truncate">{row.empreendimento || '—'}</TableCell>
      <TableCell>
        <Badge className={cn('text-xs', STATUS_COLORS[row.status || ''] || 'bg-muted text-muted-foreground')}>
          {row.status || '—'}
        </Badge>
      </TableCell>
      <TableCell className="text-sm max-w-[140px] truncate">{row.responsavel || '—'}</TableCell>
      <TableCell className="text-xs">{formatDate(row.data_requisicao)}</TableCell>
      <TableCell>
        {tempo ? (
          <Badge className={cn('text-xs', tempo.color)}>{tempo.days}d</Badge>
        ) : '—'}
      </TableCell>
      <TableCell onClick={e => e.stopPropagation()}>
        {vinculo ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onOpenVinculo(vinculo)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-semibold"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {vinculo.protocolo}
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Ver detalhes da solicitação interna</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
    </TableRow>
  );
}

export function ProjurisVisaoStatus() {
  const { user, effectiveProfile, isImpersonating } = useAuth();
  const effectiveUserId = isImpersonating ? effectiveProfile?.id : user?.id;
  const { empreendimentos: userEmpreendimentos, hasAllAccess, loading: loadingEmps } = useUserEmpreendimentos(effectiveUserId);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProjurisRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmpreendimento, setFilterEmpreendimento] = useState('all');
  const [selectedRow, setSelectedRow] = useState<ProjurisRow | null>(null);
  const [vinculos, setVinculos] = useState<Record<string, SolicitacaoVinculo>>({});
  const [vinculoModal, setVinculoModal] = useState<{ id: string; protocolo: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: projurisData }, { data: solData }] = await Promise.all([
      supabase
        .from('projuris_requisicoes')
        .select('id, numero_requisicao, numero_fluig, status, responsavel, requisitante, data_requisicao, data_ultima_aprovacao, data_ultimo_envio_aprovacao, data_finalizacao, empreendimento, tipo_requisicao, cliente_fornecedor, detalhes, ordem_prioridade, updated_at')
        .not('status', 'in', `(${CLOSED_STATUSES.join(',')})`)
        .order('ordem_prioridade', { ascending: true, nullsFirst: false })
        .order('data_requisicao', { ascending: false }),
      supabase
        .from('solicitacoes')
        .select('id, protocolo, numero_projuris, status')
        .not('numero_projuris', 'is', null),
    ]);
    const all = (projurisData as ProjurisRow[]) || [];
    const visible = all.filter(r => canViewEmpreendimentoLivre(r.empreendimento, userEmpreendimentos, hasAllAccess));
    setRows(visible);
    
    const map: Record<string, SolicitacaoVinculo> = {};
    if (solData) {
      for (const s of solData) {
        if (s.numero_projuris) {
          map[s.numero_projuris] = { id: s.id, protocolo: s.protocolo || '', status: s.status };
        }
      }
    }
    setVinculos(map);
    setLoading(false);
  }, [userEmpreendimentos, hasAllAccess]);

  useEffect(() => { if (!loadingEmps) fetchData(); }, [fetchData, loadingEmps]);

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

  const kpis = useMemo(() => ({
    total: rows.length,
    aguardandoAprovacao: rows.filter(r => r.status === 'AGUARDANDO APROVAÇÃO').length,
    emRequisicao: rows.filter(r => r.status === 'EM REQUISIÇÃO').length,
  }), [rows]);

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

  const handleOpenVinculo = useCallback((v: SolicitacaoVinculo) => {
    setVinculoModal({ id: v.id, protocolo: v.protocolo });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Em Aberto', value: kpis.total, icon: FileText, color: 'text-primary' },
          { label: 'Aguard. Aprovação', value: kpis.aguardandoAprovacao, icon: AlertTriangle, color: 'text-orange-600' },
          { label: 'Em Requisição', value: kpis.emRequisicao, icon: Clock, color: 'text-yellow-600' },
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
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Empreend.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data Req.</TableHead>
                  <TableHead>Parado</TableHead>
                  <TableHead>Vínculo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                ) : (
                  filteredRows.map((row, i) => (
                    <SortableRow
                      key={row.id}
                      row={row}
                      index={i}
                      onSelect={setSelectedRow}
                      vinculo={vinculos[row.numero_requisicao]}
                      onOpenVinculo={handleOpenVinculo}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      </ScrollArea>

      <ProjurisDetalhesModal
        row={selectedRow}
        open={!!selectedRow}
        onOpenChange={open => { if (!open) setSelectedRow(null); }}
        vinculo={selectedRow ? vinculos[selectedRow.numero_requisicao] : undefined}
        onOpenVinculo={handleOpenVinculo}
      />

      <OCDetalhesModal
        open={!!vinculoModal}
        onOpenChange={open => { if (!open) setVinculoModal(null); }}
        solicitacaoId={vinculoModal?.id || null}
        protocolo={vinculoModal?.protocolo || null}
      />
    </div>
  );
}
