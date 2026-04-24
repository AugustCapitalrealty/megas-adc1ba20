import { memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/status-badge';
import { Eye, AlertTriangle, UserCheck, Clock } from 'lucide-react';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import {
  getFornecedorDisplay,
  formatEmpreendimento,
  getSlaTone,
} from '@/lib/solicitacao-display';
import type { SolicitacaoBackoffice } from '@/hooks/useBackofficeSolicitacoes';

interface BackofficeTableProps {
  items: SolicitacaoBackoffice[];
  userId: string | undefined;
  selectedIds: Set<string>;
  focusedId: string | null;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenDetails: (sol: SolicitacaoBackoffice) => void;
  onFocus: (id: string) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const BackofficeTable = memo(function BackofficeTable({
  items,
  userId,
  selectedIds,
  focusedId,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDetails,
  onFocus,
}: BackofficeTableProps) {
  const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));
  const someSelected = items.some(i => selectedIds.has(i.id)) && !allSelected;

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected || (someSelected ? 'indeterminate' : false)}
                onCheckedChange={onToggleSelectAll}
                aria-label="Selecionar todas"
              />
            </TableHead>
            <TableHead className="w-[140px]">Protocolo</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead>Fornecedor / Descrição</TableHead>
            <TableHead className="w-[130px]">Empreend.</TableHead>
            <TableHead className="w-[120px] text-right">Valor</TableHead>
            <TableHead className="w-[90px]">SLA</TableHead>
            <TableHead className="w-[140px]">Responsável</TableHead>
            <TableHead className="w-[60px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((sol) => {
            const sla = getSlaTone(sol.created_at, sol.status, sol.dataAprovacao);
            const isMine = sol.responsavelId === userId;
            const isFocused = focusedId === sol.id;
            const isSelected = selectedIds.has(sol.id);
            const fornecedorNome = getFornecedorDisplay(sol.fornecedor_razao, null);
            return (
              <TableRow
                key={sol.id}
                data-row-id={sol.id}
                onClick={() => onFocus(sol.id)}
                onDoubleClick={() => onOpenDetails(sol)}
                className={cn(
                  'cursor-pointer transition-colors h-14 align-middle',
                  isFocused && 'bg-primary/5 ring-1 ring-inset ring-primary/40',
                  isSelected && !isFocused && 'bg-muted/40',
                )}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(sol.id)}
                    aria-label={`Selecionar ${sol.protocolo}`}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={sol.tipo === 'AC' ? 'default' : 'secondary'} className="h-5 px-1.5 text-[10px]">
                      {sol.tipo}
                    </Badge>
                    <span className="font-semibold">#{sol.protocolo}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {formatBR(sol.created_at, 'dd/MM/yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={sol.status} />
                    {sol.emergencial && (
                      <Badge
                        variant="destructive"
                        className="h-5 px-1 text-[9px] gap-0.5"
                        aria-label="Emergencial"
                      >
                        <AlertTriangle className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-0">
                  <div className="truncate font-medium text-sm">
                    {fornecedorNome ?? (
                      <span className="text-muted-foreground italic">Sem fornecedor</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{sol.descricao}</div>
                </TableCell>
                <TableCell>
                  <span className="text-xs whitespace-nowrap">
                    {formatEmpreendimento(sol.empreendimento)}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium text-sm">
                  {formatCurrency(sol.valor)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1 text-[10px] tabular-nums whitespace-nowrap',
                      sla.atrasado && 'bg-destructive/10 text-destructive border-destructive/30',
                    )}
                  >
                    <Clock className="h-2.5 w-2.5" />
                    {sla.tempo}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {sol.responsavelNome ? (
                    <span className={cn('inline-flex items-center gap-1 truncate', isMine && 'text-primary font-medium')}>
                      {isMine && <UserCheck className="h-3 w-3" />}
                      {sol.responsavelNome}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => onOpenDetails(sol)}
                    aria-label="Abrir detalhes"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});