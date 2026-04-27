import { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** Render célula. Recebe row + index. */
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  loading?: boolean;
  loadingRows?: number;
  empty?: ReactNode;
  error?: ReactNode;
  onRowClick?: (row: T) => void;
  rowKey: (row: T, index: number) => string | number;
  /** density: compacto (32px), normal (40px), confortável (48px). */
  density?: 'compact' | 'normal' | 'comfortable';
  className?: string;
  stickyHeader?: boolean;
}

const densityRow: Record<NonNullable<DataTableProps<unknown>['density']>, string> = {
  compact: 'h-8',
  normal: 'h-10',
  comfortable: 'h-12',
};

const alignClass = (a?: 'left' | 'center' | 'right') =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

/**
 * Wrapper canônico de tabela.
 * - Estados padronizados (loading/empty/error)
 * - Zebra + hover consistentes
 * - Sticky header opcional
 */
export function DataTable<T>({
  columns,
  rows,
  loading,
  loadingRows = 6,
  empty,
  error,
  onRowClick,
  rowKey,
  density = 'normal',
  className,
  stickyHeader = false,
}: DataTableProps<T>) {
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center ds-text-body text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      <div className={cn('overflow-x-auto', stickyHeader && 'max-h-[70vh] overflow-y-auto')}>
        <Table>
          <TableHeader className={cn(stickyHeader && 'sticky top-0 z-10 bg-card')}>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn('ds-text-label py-2', alignClass(col.align), col.headerClassName)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: loadingRows }).map((_, i) => (
                <TableRow key={`sk-${i}`} className={densityRow[density]}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn(alignClass(col.align), col.className)}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-10 ds-text-body text-muted-foreground">
                  {empty ?? 'Nenhum item encontrado.'}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((row, i) => (
                <TableRow
                  key={rowKey(row, i)}
                  className={cn(
                    densityRow[density],
                    'odd:bg-muted/30 hover:bg-accent/40 transition-colors',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn('ds-text-body', alignClass(col.align), col.className)}>
                      {col.cell(row, i)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}