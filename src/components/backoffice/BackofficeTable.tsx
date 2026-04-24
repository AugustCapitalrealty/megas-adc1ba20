import { memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/status-badge';
import { Eye, AlertTriangle, UserCheck, Clock } from 'lucide-react';
import { differenceInDays, differenceInHours } from 'date-fns';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
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

function getSlaTone(sol: SolicitacaoBackoffice) {
  const dias = differenceInDays(new Date(), new Date(sol.created_at));
  const horas = differenceInHours(new Date(), new Date(sol.created_at));
  const tempo = dias === 0 ? `${horas}h` : `${dias}d`;
  const atrasadoAnalise = dias > 5 && ['recebido', 'em_analise'].includes(sol.status);
  let diasApr: number | null = null;
  if (sol.dataAprovacao) diasApr = differenceInDays(new Date(), new Date(sol.dataAprovacao));
  const atrasadoEmissao = diasApr !== null && diasApr > 3 && ['aprovado', 'em_processamento'].includes(sol.status);
  const atrasado = atrasadoAnalise || atrasadoEmissao;
  return { tempo, atrasado };
}

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
            <TableHead className="w-[110px]">Status</TableHead>
            <TableHead>Fornecedor / Descrição</TableHead>
            <TableHead className="w-[110px]">Empreend.</TableHead>
            <TableHead className="w-[120px] text-right">Valor</TableHead>
            <TableHead className="w-[90px]">SLA</TableHead>
            <TableHead className="w-[140px]">Responsável</TableHead>
            <TableHead className="w-[60px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((sol) => {
            const sla = getSlaTone(sol);
            const isMine = sol.responsavelId === userId;
            const isFocused = focusedId === sol.id;
            const isSelected = selectedIds.has(sol.id);
            return (
              <TableRow
                key={sol.id}
                data-row-id={sol.id}
                onClick={() => onFocus(sol.id)}
                onDoubleClick={() => onOpenDetails(sol)}
                className={cn(
                  'cursor-pointer transition-colors',
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
                    {formatBR(new Date(sol.created_at))}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={sol.status} />
                  {sol.emergencial && (
                    <Badge variant="destructive" className="ml-1 h-4 px-1 text-[9px]">
                      <AlertTriangle className="h-2.5 w-2.5" />
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-0">
                  <div className="truncate font-medium text-sm">
                    {sol.fornecedor_razao || <span className="text-muted-foreground italic">Sem fornecedor</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{sol.descricao}</div>
                </TableCell>
                <TableCell>
                  <span className="text-xs">{sol.empreendimento.replace('mega_', 'Mega ').replace(/^./, c => c.toUpperCase())}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium text-sm">
                  {formatCurrency(sol.valor)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1 text-[10px] tabular-nums',
                      sla.atrasado && 'bg-destructive/10 text-destructive border-destructive/30',
                    )}
                  >
                    <Clock className="h-2.5 w-2.5" />
                    {sla.tempo}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {sol.responsavelNome ? (
                    <span className={cn('inline-flex items-center gap-1', isMine && 'text-primary font-medium')}>
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