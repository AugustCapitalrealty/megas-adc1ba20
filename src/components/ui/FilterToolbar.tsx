import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { FilterBar, type FilterBarProps } from '@/components/ui/FilterBar';
import { cn } from '@/lib/utils';

export interface ActiveFilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface FilterToolbarProps extends FilterBarProps {
  /** Chips de filtros ativos, exibidos abaixo da toolbar. */
  activeChips?: ActiveFilterChip[];
  onClearAll?: () => void;
  /** Slot livre logo abaixo da barra (ex.: contagem de resultados). */
  footer?: ReactNode;
  containerClassName?: string;
}

/**
 * Toolbar de filtros canônica.
 * Combina FilterBar + chips de filtros ativos + ação "limpar tudo".
 */
export function FilterToolbar({ activeChips = [], onClearAll, footer, containerClassName, ...barProps }: FilterToolbarProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-3 sm:p-4 space-y-3', containerClassName)}>
      <FilterBar {...barProps} />
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
          <span className="ds-text-label">Filtros ativos:</span>
          {activeChips.map((chip) => (
            <Badge key={chip.id} variant="secondary" className="gap-1 pr-1">
              {chip.label}
              <button
                type="button"
                aria-label={`Remover filtro ${chip.label}`}
                onClick={chip.onRemove}
                className="rounded-full hover:bg-background p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {onClearAll && (
            <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={onClearAll}>
              Limpar tudo
            </Button>
          )}
        </div>
      )}
      {footer}
    </div>
  );
}