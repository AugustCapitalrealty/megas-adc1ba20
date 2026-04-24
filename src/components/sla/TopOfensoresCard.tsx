import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertOctagon, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SlaData } from '@/hooks/useSlaDashboard';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface TopOfensoresCardProps {
  items: SlaData[];
}

export function TopOfensoresCard({ items }: TopOfensoresCardProps) {
  const navigate = useNavigate();
  const { isBackofficeOrAdmin } = useAuth();

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-destructive" />
            Top ofensores
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground py-6 text-center">
          Nenhum caso encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-destructive" />
          Top ofensores
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            por tempo de atendimento
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ul className="divide-y">
          {items.map((item, idx) => {
            const tone =
              item.status_sla === 'estourado'
                ? 'text-destructive'
                : item.status_sla === 'atencao'
                ? 'text-warning'
                : 'text-success';
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() =>
                  navigate(
                    isBackofficeOrAdmin
                      ? `/backoffice?search=${item.protocolo}`
                      : `/minhas-solicitacoes?search=${item.protocolo}`,
                  )
                }
              >
                <span className="text-xs font-bold text-muted-foreground tabular-nums w-5">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-medium">
                    {item.protocolo}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.solicitante_nome || item.solicitante_email}
                  </div>
                </div>
                <div className={cn('text-sm font-bold tabular-nums', tone)}>
                  {item.dias_uteis_backoffice.toFixed(1)}
                  <span className="text-[10px] font-normal ml-0.5">d</span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}