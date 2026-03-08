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
    on_time: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    overdue: 'bg-destructive/10 text-destructive border-destructive/20',
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
