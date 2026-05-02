import { useMemo } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Eye, Building2, Wallet, User, Inbox, CalendarRange,
  ChevronLeft, ChevronRight, Copy, AlertTriangle,
} from 'lucide-react';
import { EMPREENDIMENTO_LABELS } from '@/types';
import type { ServicoCalendario } from '@/hooks/useCalendarioServicos';
import { VISUAL_BG, VISUAL_LABEL, ordenarServicos } from './ServicoChip';
import { cn } from '@/lib/utils';
import { formatBR } from '@/lib/date-utils';
import { toast } from '@/hooks/use-toast';

interface DiaServicosSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: Date | null;
  servicos: ServicoCalendario[];
  onOpenDetalhes: (s: ServicoCalendario) => void;
  onNavigate?: (newDate: Date) => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getShortName = (n: string | null) => {
  if (!n) return '—';
  return n.trim().split(/\s+/).slice(0, 2).join(' ');
};

const RISCO = new Set(['previsao_sem_oc_risco', 'atrasado']);

type Grupo = 'iniciando' | 'andamento' | 'encerrando' | 'pontual';

function classificar(s: ServicoCalendario, dayKey: string): Grupo {
  const hasRange = !!(s.data_inicio && s.data_fim);
  if (!hasRange) return 'pontual';
  if (s.data_inicio === dayKey && s.data_fim === dayKey) return 'pontual';
  if (s.data_inicio === dayKey) return 'iniciando';
  if (s.data_fim === dayKey) return 'encerrando';
  return 'andamento';
}

const GRUPO_LABEL: Record<Grupo, string> = {
  iniciando: 'Iniciando hoje',
  andamento: 'Em andamento',
  encerrando: 'Encerrando hoje',
  pontual: 'Pontuais / data única',
};

export function DiaServicosSheet({
  open,
  onOpenChange,
  date,
  servicos,
  onOpenDetalhes,
  onNavigate,
}: DiaServicosSheetProps) {
  const unique = useMemo(
    () => ordenarServicos(Array.from(new Map(servicos.map(s => [s.id, s])).values())),
    [servicos],
  );

  const dayKey = date ? format(date, 'yyyy-MM-dd') : '';
  const total = unique.reduce((acc, s) => acc + (s.valor || 0), 0);
  const emRisco = unique.filter(s => RISCO.has(s.visual)).length;

  const grupos = useMemo(() => {
    const map = new Map<Grupo, ServicoCalendario[]>();
    unique.forEach(s => {
      const g = classificar(s, dayKey);
      const arr = map.get(g) || [];
      arr.push(s);
      map.set(g, arr);
    });
    return (['iniciando', 'andamento', 'encerrando', 'pontual'] as Grupo[])
      .map(g => ({ key: g, items: map.get(g) || [] }))
      .filter(x => x.items.length > 0);
  }, [unique, dayKey]);

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt).then(() => {
      toast({ title: 'Copiado', description: txt });
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-3 border-b space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!date || !onNavigate}
              onClick={() => date && onNavigate?.(subDays(date, 1))}
              aria-label="Dia anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <SheetTitle className="capitalize text-center flex-1">
              {date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'Dia'}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!date || !onNavigate}
              onClick={() => date && onNavigate?.(addDays(date, 1))}
              aria-label="Próximo dia"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {unique.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Serviços</p>
                <p className="text-lg font-bold tabular-nums">{unique.length}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Valor</p>
                <p className="text-sm font-bold tabular-nums">{formatCurrency(total)}</p>
              </div>
              <div
                className={cn(
                  'rounded-md border p-2 text-center',
                  emRisco > 0 ? 'border-destructive/40 bg-destructive/10' : 'bg-muted/30',
                )}
              >
                <p className="text-[10px] uppercase text-muted-foreground flex items-center justify-center gap-1">
                  {emRisco > 0 && <AlertTriangle className="h-3 w-3 text-destructive" />}
                  Em risco
                </p>
                <p className={cn('text-lg font-bold tabular-nums', emRisco > 0 && 'text-destructive')}>
                  {emRisco}
                </p>
              </div>
            </div>
          )}
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {unique.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Inbox className="h-10 w-10 opacity-40" />
                <p className="text-sm">Sem serviços neste dia</p>
              </div>
            ) : (
              grupos.map(({ key, items }) => (
                <div key={key} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {GRUPO_LABEL[key]} <span className="text-muted-foreground/60">({items.length})</span>
                  </p>
                  {items.map(s => (
                    <div key={s.id} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => copy(s.protocolo)}
                            className="group flex items-center gap-1 font-semibold tabular-nums text-sm hover:text-primary"
                            title="Copiar protocolo"
                          >
                            #{s.protocolo}
                            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-60" />
                          </button>
                          <p className="text-xs text-muted-foreground truncate">
                            {s.fornecedor_razao || 'Sem fornecedor'}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px] border-transparent', VISUAL_BG[s.visual])}>
                          {VISUAL_LABEL[s.visual]}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {EMPREENDIMENTO_LABELS[s.empreendimento]}
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Wallet className="h-3 w-3 shrink-0" />
                          {formatCurrency(s.valor)}
                          {s.contrato_mensal && (
                            <span className="text-[10px] text-muted-foreground/80">/mês</span>
                          )}
                        </div>
                        {s.contrato_mensal && s.valor_total !== s.valor && (
                          <div className="flex items-center gap-1 truncate col-span-2 text-muted-foreground/80">
                            <Wallet className="h-3 w-3 shrink-0 opacity-60" />
                            Total contrato: {formatCurrency(s.valor_total)}
                            {s.valor_mensal == null && (
                              <span className="ml-1 text-[10px] italic">(mensal estimado)</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1 truncate col-span-2">
                          <User className="h-3 w-3 shrink-0" />
                          {getShortName(s.solicitante_nome)}
                        </div>
                        {s.data_inicio && s.data_fim && (
                          <div className="flex items-center gap-1 truncate col-span-2">
                            <CalendarRange className="h-3 w-3 shrink-0" />
                            {s.contrato_mensal ? 'Contrato mensal' : 'Período'}: {formatBR(s.data_inicio + 'T12:00:00', 'dd/MM/yyyy')} – {formatBR(s.data_fim + 'T12:00:00', 'dd/MM/yyyy')}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={() => onOpenDetalhes(s)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
