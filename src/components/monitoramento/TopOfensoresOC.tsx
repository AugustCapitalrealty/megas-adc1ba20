import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertOctagon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OCGroupRow, OCItem } from '@/hooks/useMonitoramentoOC';

interface TopOfensoresOCProps {
  items: { group: OCGroupRow; oc: OCItem }[];
  onJustificar: (group: OCGroupRow) => void;
}

export function TopOfensoresOC({ items, onJustificar }: TopOfensoresOCProps) {
  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-destructive" />
            Top ofensores
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground py-6 text-center">
          Nenhuma OC pendente de justificativa.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-destructive" />
          Top ofensores
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            sem justificativa
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ul className="divide-y">
          {items.map(({ group, oc }, idx) => (
            <li
              key={oc.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-bold text-muted-foreground tabular-nums w-5">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-mono text-xs font-medium">
                  #{group.protocolo}
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{oc.numero_documento}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {group.fornecedor_razao || 'Sem fornecedor'}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={cn('text-sm font-bold tabular-nums', 'text-destructive')}>
                  {oc.dias_aberto}
                  <span className="text-[10px] font-normal ml-0.5">d</span>
                </div>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7 shrink-0 text-amber-600 border-amber-300 hover:bg-amber-50"
                onClick={() => onJustificar(group)}
                title="Justificar"
              >
                <AlertCircle className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}