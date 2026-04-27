import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Slot direito: botões/ações primárias */
  actions?: ReactNode;
  /** Slot acima do título (breadcrumbs, etc.) */
  breadcrumb?: ReactNode;
  /** Slot abaixo (filtros, tabs, kpis horizontais) */
  children?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho canônico de página.
 * Padroniza ícone, título, descrição e ações em todas as telas.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  breadcrumb,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('space-y-3', className)}>
      {breadcrumb}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className="shrink-0 mt-1 h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="ds-text-h1 truncate">{title}</h1>
            {description && (
              <p className="ds-text-body text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </header>
  );
}