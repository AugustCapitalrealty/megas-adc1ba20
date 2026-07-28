import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HubApp } from '@/lib/hub-apps';

interface AppCardProps {
  app: HubApp;
  /** Indicador ao vivo (ex.: "3 pendências") */
  badge?: string | null;
  badgeTone?: 'default' | 'warning';
  className?: string;
}

export function AppCard({ app, badge, badgeTone = 'default', className }: AppCardProps) {
  const Icon = app.icon;

  if (app.soon) {
    return (
      <Card
        aria-disabled="true"
        className={cn(
          'p-5 border-dashed bg-muted/20 opacity-70 cursor-default select-none',
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-10 w-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{app.name}</h3>
              <Badge variant="outline" className="text-[10px] font-medium">Em breve</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{app.description}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'group p-5 transition-all hover:shadow-lg hover:border-primary/40 focus-within:border-primary/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-base leading-tight">
              {app.href ? (
                <Link to={app.href} className="after:absolute hover:text-primary transition-colors">
                  {app.name}
                </Link>
              ) : (
                app.name
              )}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{app.description}</p>
          </div>
        </div>
        {badge && (
          <Badge
            variant={badgeTone === 'warning' ? 'destructive' : 'secondary'}
            className="shrink-0 whitespace-nowrap"
          >
            {badge}
          </Badge>
        )}
      </div>

      {app.links.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {app.links.map((link) => {
            const LinkIcon = link.icon;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  link.primary
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-foreground/80 hover:bg-accent hover:text-primary',
                )}
              >
                <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}

      {app.href && (
        <Link
          to={app.href}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          Abrir {app.name}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </Card>
  );
}