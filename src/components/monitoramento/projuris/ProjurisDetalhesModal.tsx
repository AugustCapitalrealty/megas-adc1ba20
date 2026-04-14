import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  updated_at: string;
}

interface Props {
  row: ProjurisRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'EXECUTADA': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'EM REQUISIÇÃO': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'AGUARDANDO APROVAÇÃO': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'AGUARDANDO EXECUÇÃO': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'AGUARDANDO INFORMAÇÕES': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'FINALIZADA': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'CANCELADA': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'REPROVADA': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function fmt(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return '—'; }
}

function fmtDt(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm'); } catch { return '—'; }
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

export function ProjurisDetalhesModal({ row, open, onOpenChange }: Props) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Requisição {row.numero_requisicao}</span>
            <Badge className={cn('text-xs', STATUS_COLORS[row.status || ''] || 'bg-muted text-muted-foreground')}>
              {row.status || '—'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Nº Requisição" value={row.numero_requisicao} />
              <Field label="Nº Fluig" value={row.numero_fluig} />
              <Field label="Tipo Requisição" value={row.tipo_requisicao} />
              <Field label="Responsável" value={row.responsavel} />
              <Field label="Requisitante" value={row.requisitante} />
              <Field label="Empreendimento" value={row.empreendimento} />
              <Field label="Cliente/Fornecedor" value={row.cliente_fornecedor} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t pt-4">
              <Field label="Data Requisição" value={fmt(row.data_requisicao)} />
              <Field label="Últ. Aprovação" value={fmt(row.data_ultima_aprovacao)} />
              <Field label="Últ. Envio Aprov." value={fmt(row.data_ultimo_envio_aprovacao)} />
              <Field label="Data Finalização" value={fmt(row.data_finalizacao)} />
            </div>

            <div className="border-t pt-4">
              <Field label="Última Atualização" value={fmtDt(row.updated_at)} />
            </div>

            {row.detalhes && (
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-1">Detalhes</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3">{row.detalhes}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
