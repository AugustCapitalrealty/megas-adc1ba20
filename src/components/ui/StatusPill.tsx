import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatusIntent = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
export type StatusSize = 'sm' | 'md';

interface StatusPillProps {
  children: ReactNode;
  intent?: StatusIntent;
  size?: StatusSize;
  icon?: ReactNode;
  className?: string;
  /** Quando true, aplica fundo sólido (alta ênfase). Padrão: tom suave. */
  solid?: boolean;
}

const softMap: Record<StatusIntent, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-[hsl(38,92%,38%)] dark:text-[hsl(38,92%,65%)]',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  purple: 'bg-[hsl(280,70%,50%)]/10 text-[hsl(280,70%,40%)] dark:text-[hsl(280,70%,75%)]',
};

const solidMap: Record<StatusIntent, string> = {
  neutral: 'bg-secondary text-secondary-foreground',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  danger: 'bg-destructive text-destructive-foreground',
  info: 'bg-info text-info-foreground',
  purple: 'bg-[hsl(280,70%,50%)] text-white',
};

const sizeMap: Record<StatusSize, string> = {
  sm: 'text-[11px] px-2 py-0.5 gap-1 min-h-[20px]',
  md: 'text-xs px-2.5 py-1 gap-1.5 min-h-[24px]',
};

/**
 * Pílula de status canônica. Usar em vez de Badge cru ou status-* CSS legados.
 */
export function StatusPill({
  children,
  intent = 'neutral',
  size = 'md',
  icon,
  solid = false,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        sizeMap[size],
        solid ? solidMap[intent] : softMap[intent],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}