import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Building2, Wallet, User, Inbox, CalendarRange } from 'lucide-react';
import { EMPREENDIMENTO_LABELS } from '@/types';
import type { ServicoCalendario } from '@/hooks/useCalendarioServicos';
import { VISUAL_BG, VISUAL_LABEL } from './ServicoChip';
import { cn } from '@/lib/utils';
import { formatBR } from '@/lib/date-utils';

interface DiaServicosSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: Date | null;
  servicos: ServicoCalendario[];
  onOpenDetalhes: (s: ServicoCalendario) => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getShortName = (n: string | null) => {
  if (!n) return '—';
  return n.trim().split(/\s+/).slice(0, 2).join(' ');
};

export function DiaServicosSheet({
  open,
  onOpenChange,
  date,
  servicos,
  onOpenDetalhes,
}: DiaServicosSheetProps) {
  const unique = Array.from(new Map(servicos.map(s => [s.id, s])).values());
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-3 border-b">
          <SheetTitle className="capitalize">
            {date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'Dia'}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {unique.length} {unique.length === 1 ? 'serviço' : 'serviços'} previstos / executados
          </p>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {unique.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Inbox className="h-10 w-10 opacity-40" />
                <p className="text-sm">Sem serviços neste dia</p>
              </div>
            ) : (
              unique.map(s => (
                <div key={s.id} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold tabular-nums text-sm">#{s.protocolo}</p>
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
                    </div>
                    <div className="flex items-center gap-1 truncate col-span-2">
                      <User className="h-3 w-3 shrink-0" />
                      {getShortName(s.solicitante_nome)}
                    </div>
                    {s.data_inicio && s.data_fim && (
                      <div className="flex items-center gap-1 truncate col-span-2">
                        <CalendarRange className="h-3 w-3 shrink-0" />
                        Período: {formatBR(s.data_inicio + 'T12:00:00', 'dd/MM/yyyy')} – {formatBR(s.data_fim + 'T12:00:00', 'dd/MM/yyyy')}
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
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}