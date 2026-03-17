import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, CheckCircle, Download, X } from 'lucide-react';

interface BatchActionBarProps {
  selectedCount: number;
  canBulkAssign: boolean;
  onClear: () => void;
  onBulkAssign: () => void;
  onBulkTransfer: () => void;
  onExport: () => void;
  assignLoading?: boolean;
}

export function BatchActionBar({
  selectedCount,
  canBulkAssign,
  onClear,
  onBulkAssign,
  onBulkTransfer,
  onExport,
  assignLoading,
}: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 px-5 py-3 rounded-xl border bg-background shadow-lg">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {selectedCount} selecionada{selectedCount > 1 ? 's' : ''}
        </Badge>

        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1.5">
          <X className="h-4 w-4" /> Limpar
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
          <Download className="h-4 w-4" /> Exportar
        </Button>

        <Button variant="outline" size="sm" onClick={onBulkTransfer} className="gap-1.5">
          <ArrowRightLeft className="h-4 w-4" /> Transferir
        </Button>

        {canBulkAssign && (
          <Button size="sm" onClick={onBulkAssign} disabled={assignLoading} className="gap-1.5">
            <CheckCircle className="h-4 w-4" /> Assumir Todas
          </Button>
        )}
      </div>
    </div>
  );
}
