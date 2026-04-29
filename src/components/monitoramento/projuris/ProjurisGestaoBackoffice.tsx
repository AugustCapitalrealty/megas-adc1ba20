import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Link2, Sparkles, AlertTriangle, Clock, FileText, Briefcase, User } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ProjurisDecisaoModal } from './ProjurisDecisaoModal';
import { OCDetalhesModal } from '../OCDetalhesModal';
import { toast } from '@/hooks/use-toast';

interface Row {
  id: string;
  numero_requisicao: string;
  status: string | null;
  responsavel: string | null;
  requisitante: string | null;
  data_requisicao: string | null;
  data_ultimo_envio_aprovacao: string | null;
  empreendimento: string | null;
  cliente_fornecedor: string | null;
  valor: number | null;
  updated_at: string;
}

interface Vinculo { id: string; protocolo: string }

const CLOSED_STATUSES = ['FINALIZADA', 'CANCELADA', 'REPROVADA'];

const STATUS_COLORS: Record<string, string> = {
  'EXECUTADA': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'EM REQUISIÇÃO': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'AGUARDANDO APROVAÇÃO': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'AGUARDANDO EXECUÇÃO': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'AGUARDANDO INFORMAÇÕES': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

function normalize(s: string | null | undefined): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fornecedorNome(cf: string | null): string {
  if (!cf) return '—';
  return cf.split(' - ')[0]?.trim() || '—';
}

const NAME_CONNECTORS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
function shortName(s: string | null): string {
  if (!s) return '—';
  const parts = s.trim().split(/\s+/).filter(p => p && !NAME_CONNECTORS.has(p.toLowerCase()));
  if (parts.length === 0) return s;
  return parts.slice(0, 2).join(' ');
}

function isBackofficeResp(resp: string | null): boolean {
  const n = normalize(resp);
  return n.includes('backoffice') || n.includes('juridico') || n.includes('jurídico');
}

function diasNoStatus(row: Row, lastChange: Record<string, string>): number | null {
  const ref = lastChange[row.id]
    || (row.status === 'AGUARDANDO APROVAÇÃO' ? row.data_ultimo_envio_aprovacao : null)
    || row.updated_at
    || row.data_requisicao;
  if (!ref) return null;
  try { return differenceInDays(new Date(), new Date(ref)); } catch { return null; }
}

function agingColor(days: number | null): string {
  if (days == null) return 'bg-muted text-muted-foreground';
  if (days < 7) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (days < 14) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
}

export function ProjurisGestaoBackoffice() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [vinculos, setVinculos] = useState<Record<string, Vinculo>>({});
  const [lastStatusChange, setLastStatusChange] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmp, setFilterEmp] = useState('all');
  const [filterResp, setFilterResp] = useState('all');
  const [onlyBackoffice, setOnlyBackoffice] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [decisaoRow, setDecisaoRow] = useState<Row | null>(null);
  const [vinculoModal, setVinculoModal] = useState<Vinculo | null>(null);

  const myName = useMemo(() => normalize(profile?.full_name), [profile]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: pjData }, { data: solData }] = await Promise.all([
      supabase
        .from('projuris_requisicoes')
        .select('id, numero_requisicao, status, responsavel, requisitante, data_requisicao, data_ultimo_envio_aprovacao, empreendimento, cliente_fornecedor, valor, updated_at')
        .not('status', 'in', `(${CLOSED_STATUSES.join(',')})`)
        .order('data_requisicao', { ascending: false }),
      supabase
        .from('solicitacoes')
        .select('id, protocolo, numero_projuris')
        .not('numero_projuris', 'is', null),
    ]);

    const all = (pjData as Row[]) || [];
    setRows(all);

    const map: Record<string, Vinculo> = {};
    for (const s of solData || []) {
      if (s.numero_projuris) map[s.numero_projuris] = { id: s.id, protocolo: s.protocolo || '' };
    }
    setVinculos(map);

    if (all.length > 0) {
      const ids = all.map(r => r.id);
      const { data: acoesData } = await supabase
        .from('projuris_acoes')
        .select('requisicao_id, status_novo, created_at')
        .in('requisicao_id', ids)
        .not('status_novo', 'is', null)
        .order('created_at', { ascending: false });
      const last: Record<string, string> = {};
      for (const a of acoesData || []) {
        if (!last[a.requisicao_id]) last[a.requisicao_id] = a.created_at;
      }
      setLastStatusChange(last);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statuses = useMemo(() => [...new Set(rows.map(r => r.status).filter(Boolean) as string[])].sort(), [rows]);
  const empreendimentos = useMemo(() => [...new Set(rows.map(r => r.empreendimento).filter(Boolean) as string[])].sort(), [rows]);
  const responsaveis = useMemo(() => [...new Set(rows.map(r => r.responsavel).filter(Boolean) as string[])].sort(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterEmp !== 'all' && r.empreendimento !== filterEmp) return false;
      if (filterResp !== 'all' && r.responsavel !== filterResp) return false;
      if (onlyBackoffice && !isBackofficeResp(r.responsavel)) return false;
      if (onlyMine && !(myName && normalize(r.requisitante) === myName)) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          r.numero_requisicao?.toLowerCase().includes(s) ||
          r.responsavel?.toLowerCase().includes(s) ||
          r.requisitante?.toLowerCase().includes(s) ||
          r.cliente_fornecedor?.toLowerCase().includes(s) ||
          r.empreendimento?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [rows, filterStatus, filterEmp, filterResp, onlyBackoffice, onlyMine, myName, search]);

  const kpis = useMemo(() => ({
    total: rows.length,
    aguardandoNos: rows.filter(r => isBackofficeResp(r.responsavel)).length,
    aprov7d: rows.filter(r => {
      if (r.status !== 'AGUARDANDO APROVAÇÃO') return false;
      const d = diasNoStatus(r, lastStatusChange);
      return d != null && d >= 7;
    }).length,
    aguardInfo: rows.filter(r => r.status === 'AGUARDANDO INFORMAÇÕES').length,
  }), [rows, lastStatusChange]);

  const kpiCards = [
    { label: 'Em aberto', value: kpis.total, icon: FileText, color: 'text-primary' },
    { label: 'Ação do Backoffice', value: kpis.aguardandoNos, icon: Briefcase, color: 'text-orange-600' },
    { label: 'Aprovação ≥ 7d', value: kpis.aprov7d, icon: AlertTriangle, color: 'text-red-600' },
    { label: 'Aguard. Informações', value: kpis.aguardInfo, icon: Clock, color: 'text-amber-600' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <k.icon className={cn('h-4 w-4', k.color)} />
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar requisição, fornecedor, requisitante..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEmp} onValueChange={setFilterEmp}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Empreendimento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {empreendimentos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterResp} onValueChange={setFilterResp}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {responsaveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="only-bo" checked={onlyBackoffice} onCheckedChange={setOnlyBackoffice} />
          <Label htmlFor="only-bo" className="text-xs cursor-pointer">Apenas ações nossas</Label>
        </div>
        {myName && (
          <div className="flex items-center gap-2">
            <Switch id="only-mine" checked={onlyMine} onCheckedChange={setOnlyMine} />
            <Label htmlFor="only-mine" className="text-xs cursor-pointer">Minhas requisições</Label>
          </div>
        )}
      </div>

      <ScrollArea className="h-[600px] rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Projuris / Vínculo</TableHead>
              <TableHead>Requisitante</TableHead>
              <TableHead>Empreend.</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Data Req.</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma requisição encontrada</TableCell></TableRow>
            ) : filtered.map(r => {
              const dias = diasNoStatus(r, lastStatusChange);
              const isMine = myName && normalize(r.requisitante) === myName;
              const isOurAction = isBackofficeResp(r.responsavel);
              const overdue = dias != null && dias >= 14;
              const v = vinculos[r.numero_requisicao];
              return (
                <TableRow
                  key={r.id}
                  className={cn(
                    'border-l-4',
                    overdue ? 'border-l-destructive' : isOurAction ? 'border-l-primary' : 'border-l-transparent',
                  )}
                >
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-sm font-medium">{r.numero_requisicao}</span>
                      {v ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setVinculoModal(v)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-medium w-fit"
                              >
                                <Link2 className="h-2.5 w-2.5" />{v.protocolo}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Ver solicitação interna</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5">
                            <span>{shortName(r.requisitante)}</span>
                            {isMine && (
                              <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5 bg-primary/10 text-primary border-primary/30">
                                <User className="h-2.5 w-2.5" />Você
                              </Badge>
                            )}
                          </div>
                        </TooltipTrigger>
                        {r.requisitante && <TooltipContent>{r.requisitante}</TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-sm max-w-[120px] truncate">{r.empreendimento || '—'}</TableCell>
                  <TableCell className="text-sm max-w-[160px] truncate">{fornecedorNome(r.cliente_fornecedor)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-center">
                      <Badge className={cn('text-[10px] w-fit', STATUS_COLORS[r.status || ''] || 'bg-muted text-muted-foreground')}>
                        {r.status || '—'}
                      </Badge>
                      {dias != null && (
                        <Badge variant="outline" className={cn('text-[9px] w-fit gap-0.5', agingColor(dias))}>
                          <Clock className="h-2.5 w-2.5" />{dias}d
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            {isOurAction ? (
                              <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]" variant="outline">
                                <Briefcase className="h-2.5 w-2.5 mr-1" />{shortName(r.responsavel)}
                              </Badge>
                            ) : (
                              <span>{shortName(r.responsavel)}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        {r.responsavel && <TooltipContent>{r.responsavel}</TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-xs">{r.data_requisicao ? formatBR(r.data_requisicao, 'dd/MM/yyyy') : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="default" className="h-7 gap-1" onClick={() => setDecisaoRow(r)}>
                      <Sparkles className="h-3 w-3" />Tomar ação
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      <ProjurisDecisaoModal
        row={decisaoRow}
        open={!!decisaoRow}
        onOpenChange={open => { if (!open) setDecisaoRow(null); }}
        statusOptions={statuses}
        onSaved={fetchData}
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