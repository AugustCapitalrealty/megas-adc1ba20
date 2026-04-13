import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock, AlertTriangle, Inbox, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface ReqFluxo {
  id: string;
  numero_requisicao: string;
  empreendimento: string | null;
  cliente_fornecedor: string | null;
  status: string | null;
  data_requisicao: string | null;
  data_ultimo_envio_aprovacao: string | null;
  data_ultima_aprovacao: string | null;
  data_finalizacao: string | null;
  dias_total: number;
}

interface EtapaTimeline {
  label: string;
  data: string | null;
  dias: number;
}

function buildTimeline(req: ReqFluxo): EtapaTimeline[] {
  const etapas: EtapaTimeline[] = [];
  const dates: { label: string; date: string | null }[] = [
    { label: 'Requisição', date: req.data_requisicao },
    { label: 'Envio p/ Aprovação', date: req.data_ultimo_envio_aprovacao },
    { label: 'Aprovação', date: req.data_ultima_aprovacao },
    { label: 'Finalização', date: req.data_finalizacao },
  ];

  for (let i = 0; i < dates.length; i++) {
    const curr = dates[i];
    if (!curr.date) continue;
    const nextDate = dates.slice(i + 1).find(d => d.date)?.date;
    const dias = nextDate
      ? differenceInDays(new Date(nextDate), new Date(curr.date))
      : differenceInDays(new Date(), new Date(curr.date));
    etapas.push({ label: curr.label, data: curr.date, dias });
  }
  return etapas;
}

export function ProjurisFluxoAprovacoes() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReqFluxo[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projuris_requisicoes')
      .select('id, numero_requisicao, empreendimento, cliente_fornecedor, status, data_requisicao, data_ultimo_envio_aprovacao, data_ultima_aprovacao, data_finalizacao')
      .not('status', 'in', '(FINALIZADA,CANCELADA,REPROVADA)');

    if (data) {
      const mapped: ReqFluxo[] = data.map(r => ({
        ...r,
        dias_total: r.data_requisicao ? differenceInDays(new Date(), new Date(r.data_requisicao)) : 0,
      })).sort((a, b) => b.dias_total - a.dias_total);
      setRows(mapped);
    }
    setLoading(false);
  };

  const gargalo = useMemo(() => {
    const etapaTotals: Record<string, { total: number; count: number }> = {};
    rows.forEach(r => {
      const tl = buildTimeline(r);
      tl.forEach(e => {
        if (!etapaTotals[e.label]) etapaTotals[e.label] = { total: 0, count: 0 };
        etapaTotals[e.label].total += e.dias;
        etapaTotals[e.label].count += 1;
      });
    });
    let maxAvg = 0;
    let maxLabel: string | null = null;
    Object.entries(etapaTotals).forEach(([label, { total, count }]) => {
      const avg = total / count;
      if (avg > maxAvg) { maxAvg = avg; maxLabel = label; }
    });
    return maxLabel ? { etapa: maxLabel, media: Math.round(maxAvg) } : null;
  }, [rows]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {gargalo && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-sm font-medium">Etapa com maior tempo médio (gargalo)</p>
                <p className="text-lg font-bold">{gargalo.etapa} — {gargalo.media} dias em média</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card><CardContent className="py-16"><div className="flex flex-col items-center gap-2 text-muted-foreground"><Inbox className="h-10 w-10 opacity-40" /><p className="text-sm font-medium">Nenhuma requisição ativa com fluxo registrado</p></div></CardContent></Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {rows.map(req => {
              const isExpanded = expandedId === req.id;
              const timeline = buildTimeline(req);
              return (
                <Card key={req.id} className="overflow-hidden">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-medium">#{req.numero_requisicao}</span>
                      <Badge variant="outline" className="text-xs">{req.empreendimento || '—'}</Badge>
                      <span className="text-sm text-muted-foreground truncate max-w-[200px]">{req.cliente_fornecedor || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">{req.status}</Badge>
                      <span className="text-xs text-muted-foreground">{req.dias_total}d total</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <CardContent className="pt-0 pb-4">
                      <div className="flex items-start gap-2 flex-wrap">
                        {timeline.map((etapa, i) => {
                          const isLast = i === timeline.length - 1;
                          const isSlow = etapa.dias > 7;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className={cn(
                                'rounded-lg border p-3 text-xs space-y-1 min-w-[140px]',
                                isLast && 'border-primary bg-primary/5',
                                isSlow && !isLast && 'border-destructive/30 bg-destructive/5',
                              )}>
                                <p className="font-medium">{etapa.label}</p>
                                <p className="text-muted-foreground">{etapa.data ? formatBR(etapa.data, 'dd/MM/yyyy') : '—'}</p>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span className={cn(isSlow && 'text-destructive font-medium')}>{etapa.dias}d</span>
                                </div>
                              </div>
                              {!isLast && <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
