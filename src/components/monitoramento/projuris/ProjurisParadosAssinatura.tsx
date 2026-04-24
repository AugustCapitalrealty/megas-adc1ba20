import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock, AlertTriangle, Inbox } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { canViewEmpreendimentoLivre } from '@/lib/empreendimento-match';

interface ParadoRow {
  id: string;
  numero_requisicao: string;
  empreendimento: string | null;
  cliente_fornecedor: string | null;
  responsavel: string | null;
  data_ultimo_envio_aprovacao: string | null;
  dias_parado: number;
}

export function ProjurisParadosAssinatura() {
  const { user, effectiveProfile, isImpersonating } = useAuth();
  const effectiveUserId = isImpersonating ? effectiveProfile?.id : user?.id;
  const { empreendimentos: userEmpreendimentos, hasAllAccess, loading: loadingEmps } = useUserEmpreendimentos(effectiveUserId);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ParadoRow[]>([]);

  useEffect(() => { if (!loadingEmps) fetchData(); }, [loadingEmps, userEmpreendimentos, hasAllAccess]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projuris_requisicoes')
      .select('id, numero_requisicao, empreendimento, cliente_fornecedor, responsavel, data_ultimo_envio_aprovacao, status')
      .eq('status', 'AGUARDANDO APROVAÇÃO');

    if (data) {
      const visibleData = data.filter(r => canViewEmpreendimentoLivre(r.empreendimento, userEmpreendimentos, hasAllAccess));
      const mapped: ParadoRow[] = visibleData
        .map(r => ({
          id: r.id,
          numero_requisicao: r.numero_requisicao,
          empreendimento: r.empreendimento,
          cliente_fornecedor: r.cliente_fornecedor,
          responsavel: r.responsavel,
          data_ultimo_envio_aprovacao: r.data_ultimo_envio_aprovacao,
          dias_parado: r.data_ultimo_envio_aprovacao
            ? differenceInDays(new Date(), new Date(r.data_ultimo_envio_aprovacao))
            : 0,
        }))
        .sort((a, b) => b.dias_parado - a.dias_parado);
      setRows(mapped);
    }
    setLoading(false);
  };

  const kpis = useMemo(() => ({
    total: rows.length,
    critico: rows.filter(r => r.dias_parado > 7).length,
    atencao: rows.filter(r => r.dias_parado >= 3 && r.dias_parado <= 7).length,
  }), [rows]);

  const getDiasBadge = (dias: number) => {
    if (dias > 7) return <Badge variant="destructive" className="text-xs">{dias}d</Badge>;
    if (dias >= 3) return <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{dias}d</Badge>;
    return <Badge variant="secondary" className="text-xs">{dias}d</Badge>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Total Aguardando</span></div>
            <p className="text-2xl font-bold mt-1">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Crítico (&gt;7d)</span></div>
            <p className="text-2xl font-bold mt-1 text-destructive">{kpis.critico}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><span className="text-xs text-muted-foreground">Atenção (3-7d)</span></div>
            <p className="text-2xl font-bold mt-1 text-amber-600">{kpis.atencao}</p>
          </CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="py-16"><div className="flex flex-col items-center gap-2 text-muted-foreground"><Inbox className="h-10 w-10 opacity-40" /><p className="text-sm font-medium">Nenhuma requisição aguardando aprovação</p></div></CardContent></Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Req.</TableHead>
                <TableHead>Cliente/Fornecedor</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Empreendimento</TableHead>
                <TableHead>Data Envio</TableHead>
                <TableHead>Dias Parado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id} className={cn(row.dias_parado > 7 && 'bg-destructive/5')}>
                  <TableCell className="font-mono text-sm font-medium">{row.numero_requisicao}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{row.cliente_fornecedor || '—'}</TableCell>
                  <TableCell className="text-sm max-w-[180px] truncate">{row.responsavel || '—'}</TableCell>
                  <TableCell className="text-sm">{row.empreendimento || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.data_ultimo_envio_aprovacao ? formatBR(row.data_ultimo_envio_aprovacao, 'dd/MM/yyyy') : '—'}</TableCell>
                  <TableCell>{getDiasBadge(row.dias_parado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
}
