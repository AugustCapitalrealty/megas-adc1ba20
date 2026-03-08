import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays } from 'date-fns';

interface TimeInStatusBadgeProps {
  updatedAt: string;
  status: string;
  className?: string;
}

const TERMINAL_STATUSES = ['concluida', 'cancelado', 'rejeitado'];

export function TimeInStatusBadge({ updatedAt, status, className }: TimeInStatusBadgeProps) {
  if (TERMINAL_STATUSES.includes(status)) return null;

  const days = differenceInCalendarDays(new Date(), new Date(updatedAt));
  if (days < 1) return null;

  const variant = days <= 3 ? 'on_time' : days <= 5 ? 'warning' : 'overdue';

  const config = {
    on_time: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    overdue: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  };

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-xs font-medium', config[variant], className)}
    >
      <Clock className="h-3 w-3" />
      {days}d neste status
    </Badge>
  );
}
