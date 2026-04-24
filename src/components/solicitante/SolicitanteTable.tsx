import { memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { FavoriteButton } from '@/components/FavoriteButton';
import { Eye, AlertTriangle, Clock, Edit, Receipt, Send, MessageSquare } from 'lucide-react';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import {
  getFornecedorDisplay,
  formatEmpreendimento,
  getSlaTone,
} from '@/lib/solicitacao-display';
import type { SolicitacaoComFornecedor } from './types';

interface SolicitanteTableProps {
  items: SolicitacaoComFornecedor[];
  effectiveUserId?: string;
  focusedId: string | null;
  favoriteSet: Set<string>;
  onFocus: (id: string) => void;
  onOpenDetails: (sol: SolicitacaoComFornecedor) => void;
  onToggleFavorite: (id: string) => void;
  onEdit?: (sol: SolicitacaoComFornecedor) => void;
  onAceiteOC?: (sol: SolicitacaoComFornecedor) => void;
  onNfBoleto?: (sol: SolicitacaoComFornecedor) => void;
  unreadMap?: Record<string, unknown>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/** Returns the user-facing pending action chip for a solicitação, if any. */
function getPendencia(sol: SolicitacaoComFornecedor) {
  switch (sol.status) {
    case 'pendente_correcao':
      return { label: 'Corrigir', tone: 'warning' as const, Icon: AlertTriangle };
    case 'aguardando_informacoes':
      return { label: 'Responder', tone: 'warning' as const, Icon: MessageSquare };
    case 'aguardando_aceite':
    case 'oc_ac_emitida':
      return { label: 'Aceitar OC', tone: 'success' as const, Icon: Send };
    case 'aguardando_nf_boleto':
      return { label: 'Enviar NF', tone: 'purple' as const, Icon: Receipt };
    default:
      return null;
  }
}

const toneClass = (tone: 'warning' | 'success' | 'purple') => {
  if (tone === 'warning') return 'bg-warning/15 text-warning border-warning/30';
  if (tone === 'success') return 'bg-success/15 text-success border-success/30';
  return 'bg-[hsl(260,70%,50%)]/15 text-[hsl(260,70%,50%)] border-[hsl(260,70%,50%)]/30';
};

export const SolicitanteTable = memo(function SolicitanteTable({
  items,
  focusedId,
  favoriteSet,
  onFocus,
  onOpenDetails,
  onToggleFavorite,
  onEdit,
  onAceiteOC,
  onNfBoleto,
  unreadMap,
}: SolicitanteTableProps) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[170px]">Protocolo</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead>Fornecedor / Descrição</TableHead>
            <TableHead className="w-[130px]">Empreend.</TableHead>
            <TableHead className="w-[120px] text-right">Valor</TableHead>
            <TableHead className="w-[80px]">Idade</TableHead>
            <TableHead className="w-[140px]">Pendência</TableHead>
            <TableHead className="w-[80px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((sol) => {
            const sla = getSlaTone(sol.created_at, sol.status);
            const isFocused = focusedId === sol.id;
            const pendencia = getPendencia(sol);
            const fornecedorNome = getFornecedorDisplay(
              sol.fornecedor?.razao_social,
              sol.fornecedor?.nome_fantasia,
            );
            const isFav = favoriteSet.has(sol.id);
            const hasUnread = !!unreadMap?.[sol.id];
            const canEdit = ['pendente_correcao', 'aguardando_informacoes'].includes(sol.status);

            return (
              <TableRow
                key={sol.id}
                data-row-id={sol.id}
                onClick={() => onFocus(sol.id)}
                onDoubleClick={() => onOpenDetails(sol)}
                className={cn(
                  'cursor-pointer transition-colors h-14 align-middle',
                  isFocused && 'bg-primary/5 ring-1 ring-inset ring-primary/40',
                )}
              >
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-1.5">
                    <FavoriteButton
                      isFavorite={isFav}
                      onToggle={() => onToggleFavorite(sol.id)}
                      size="sm"
                    />
                    <Badge
                      variant={sol.tipo === 'AC' ? 'default' : 'secondary'}
                      className="h-5 px-1.5 text-[10px]"
                    >
                      {sol.tipo}
                    </Badge>
                    <span className="font-semibold">#{sol.protocolo}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 ml-6">
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
                    {hasUnread && (
                      <span
                        className="ml-0.5 h-2 w-2 rounded-full bg-primary"
                        aria-label="Mensagens não lidas"
                      />
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
                <TableCell>
                  {pendencia ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (pendencia.label === 'Corrigir' || pendencia.label === 'Responder') {
                          onEdit?.(sol);
                        } else if (pendencia.label === 'Aceitar OC') {
                          onAceiteOC?.(sol);
                        } else if (pendencia.label === 'Enviar NF') {
                          onNfBoleto?.(sol);
                        } else {
                          onOpenDetails(sol);
                        }
                      }}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80 whitespace-nowrap',
                        toneClass(pendencia.tone),
                      )}
                    >
                      <pendencia.Icon className="h-3 w-3" />
                      {pendencia.label}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-0.5">
                    {canEdit && onEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => onEdit(sol)}
                        aria-label="Editar / Corrigir"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => onOpenDetails(sol)}
                      aria-label="Abrir detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});
