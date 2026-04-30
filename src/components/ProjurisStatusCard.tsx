import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scale, Calendar, User, Building2, FileText, Clock, ExternalLink, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ProjurisStatusCardProps {
  numeroProjuris: string;
  className?: string;
  onEdit?: () => void;
}

interface ProjurisData {
  id: string;
  numero_requisicao: string;
  status: string | null;
  responsavel: string | null;
  requisitante: string | null;
  tipo_requisicao: string | null;
  cliente_fornecedor: string | null;
  empreendimento: string | null;
  detalhes: string | null;
  data_requisicao: string | null;
  data_ultima_aprovacao: string | null;
  data_ultimo_envio_aprovacao: string | null;
  data_finalizacao: string | null;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  'EXECUTADA': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'EM REQUISIÇÃO': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'AGUARDANDO APROVAÇÃO': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'AGUARDANDO EXECUÇÃO': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'AGUARDANDO INFORMAÇÕES': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'FINALIZADA': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'CANCELADA': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return '—'; }
}

function getTempoParado(data: ProjurisData): { days: number; color: string } | null {
  if (data.data_finalizacao) return null;
  const ref = data.status === 'AGUARDANDO APROVAÇÃO' && data.data_ultimo_envio_aprovacao
    ? data.data_ultimo_envio_aprovacao
    : data.data_requisicao;
  if (!ref) return null;
  try {
    const days = differenceInDays(new Date(), new Date(ref));
    const color = days < 7
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : days < 14
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    return { days, color };
  } catch { return null; }
}

export function ProjurisStatusCard({ numeroProjuris, className, onEdit }: ProjurisStatusCardProps) {
  const [data, setData] = useState<ProjurisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detalhesOpen, setDetalhesOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: row } = await supabase
        .from('projuris_requisicoes')
        .select('*')
        .eq('numero_requisicao', numeroProjuris)
        .maybeSingle();
      setData(row);
      setLoading(false);
    };
    fetch();
  }, [numeroProjuris]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando dados Projuris...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Requisição Projuris <span className="font-semibold text-foreground">#{numeroProjuris}</span> não encontrada no painel.
        </p>
        {onEdit && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
            <Pencil className="h-3 w-3 mr-1" />
            Corrigir nº
          </Button>
        )}
      </div>
    );
  }

  const statusColor = STATUS_COLORS[data.status?.toUpperCase() || ''] || 'bg-muted text-muted-foreground';
  const aging = getTempoParado(data);

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Projuris #{data.numero_requisicao}</span>
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={onEdit}
                title="Editar número Projuris"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data.status && (
              <Badge className={cn('text-[10px] font-medium', statusColor)} variant="outline">
                {data.status}
              </Badge>
            )}
            {aging && (
              <Badge className={cn('text-[10px]', aging.color)} variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {aging.days}d parado
              </Badge>
            )}
            <Link
              to="/monitoramento-oc"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ver no Painel
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Requisição:</span>
            <span className="text-foreground font-medium">{formatDate(data.data_requisicao)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>Responsável:</span>
            <span className="text-foreground font-medium truncate">{data.responsavel || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Tipo:</span>
            <span className="text-foreground font-medium truncate">{data.tipo_requisicao || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span>Fornecedor:</span>
            <span className="text-foreground font-medium truncate">{data.cliente_fornecedor || '—'}</span>
          </div>
          {data.empreendimento && (
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span>Empreendimento:</span>
              <span className="text-foreground font-medium">{data.empreendimento}</span>
            </div>
          )}
          {data.data_ultima_aprovacao && (
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Última aprovação:</span>
              <span className="text-foreground font-medium">{formatDate(data.data_ultima_aprovacao)}</span>
            </div>
          )}
          {data.data_finalizacao && (
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Finalização:</span>
              <span className="text-foreground font-medium">{formatDate(data.data_finalizacao)}</span>
            </div>
          )}
        </div>

        {/* Detalhes colapsável */}
        {data.detalhes && (
          <Collapsible open={detalhesOpen} onOpenChange={setDetalhesOpen}>
            <CollapsibleTrigger className="text-xs text-primary hover:underline">
              {detalhesOpen ? 'Ocultar detalhes' : 'Ver detalhes'}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap bg-muted/30 rounded p-2">
                {data.detalhes}
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
