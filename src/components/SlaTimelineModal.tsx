import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  StopCircle, 
  ArrowRight,
  Clock,
  User,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlaBadge, SlaStatus } from './SlaBadge';
import { STATUS_LABELS } from '@/types';

interface TimelineEvent {
  created_at: string;
  acao: string;
  status_anterior: string | null;
  status_novo: string | null;
  usuario_nome: string | null;
  conta_tempo: boolean;
  tipo_evento: string;
}

interface SlaTimelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacaoId: string;
  protocolo: string;
  diasUteis: number;
  statusSla: SlaStatus;
}

const tipoEventoConfig: Record<string, { 
  Icon: React.ElementType; 
  className: string; 
  label: string;
}> = {
  inicio: { 
    Icon: Play, 
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
    label: 'Início' 
  },
  pausa: { 
    Icon: Pause, 
    className: 'bg-amber-100 text-amber-700 border-amber-200', 
    label: 'Pausa' 
  },
  retomada: { 
    Icon: RotateCcw, 
    className: 'bg-blue-100 text-blue-700 border-blue-200', 
    label: 'Retomada' 
  },
  fim: { 
    Icon: StopCircle, 
    className: 'bg-slate-100 text-slate-700 border-slate-200', 
    label: 'Fim' 
  },
  andamento: { 
    Icon: ArrowRight, 
    className: 'bg-slate-50 text-slate-600 border-slate-200', 
    label: 'Andamento' 
  },
};

const acaoLabels: Record<string, string> = {
  'solicitacao_criada': 'Solicitação Criada',
  'status_alterado': 'Status Alterado',
  'numero_fluig_adicionado': 'Nº Fluig/RM Adicionado',
  'numero_fluig_alterado': 'Nº Fluig/RM Alterado',
  'anexo_adicionado': 'Anexo Adicionado',
  'solicitacao_corrigida': 'Solicitação Corrigida',
  'resposta_informacoes': 'Resposta às Informações',
};

export function SlaTimelineModal({
  open,
  onOpenChange,
  solicitacaoId,
  protocolo,
  diasUteis,
  statusSla,
}: SlaTimelineModalProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && solicitacaoId) {
      fetchTimeline();
    }
  }, [open, solicitacaoId]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_sla_timeline', {
        p_solicitacao_id: solicitacaoId,
      });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Erro ao buscar timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            Timeline de SLA - {protocolo}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4 pt-2">
            <span>Detalhamento do cálculo de tempo do backoffice</span>
            <SlaBadge status={statusSla} diasUteis={diasUteis} />
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <div className="text-xs text-emerald-600 font-medium">Meta SLA</div>
            <div className="text-2xl font-bold text-emerald-700">3 dias</div>
            <div className="text-xs text-emerald-500">úteis</div>
          </div>
          <div className={cn(
            "border rounded-lg p-3 text-center",
            diasUteis <= 2 ? "bg-emerald-50 border-emerald-200" :
            diasUteis === 3 ? "bg-amber-50 border-amber-200" :
            "bg-red-50 border-red-200"
          )}>
            <div className={cn(
              "text-xs font-medium",
              diasUteis <= 2 ? "text-emerald-600" :
              diasUteis === 3 ? "text-amber-600" :
              "text-red-600"
            )}>Tempo Utilizado</div>
            <div className={cn(
              "text-2xl font-bold",
              diasUteis <= 2 ? "text-emerald-700" :
              diasUteis === 3 ? "text-amber-700" :
              "text-red-700"
            )}>{diasUteis} {diasUteis === 1 ? 'dia' : 'dias'}</div>
            <div className={cn(
              "text-xs",
              diasUteis <= 2 ? "text-emerald-500" :
              diasUteis === 3 ? "text-amber-500" :
              "text-red-500"
            )}>úteis</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-600 font-medium">Total de Eventos</div>
            <div className="text-2xl font-bold text-slate-700">{events.length}</div>
            <div className="text-xs text-slate-500">movimentações</div>
          </div>
        </div>

        <Separator />

        <ScrollArea className="h-[350px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Nenhum evento encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event, index) => {
                const config = tipoEventoConfig[event.tipo_evento] || tipoEventoConfig.andamento;
                const { Icon } = config;
                
                return (
                  <div key={index} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full border-2",
                        config.className
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {index < events.length - 1 && (
                        <div className={cn(
                          "w-0.5 flex-1 min-h-[24px]",
                          event.conta_tempo ? "bg-emerald-300" : "bg-slate-200"
                        )} />
                      )}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {acaoLabels[event.acao] || event.acao}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            event.conta_tempo 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          )}
                        >
                          {event.conta_tempo ? '✅ Conta tempo' : '⏸️ Não conta'}
                        </Badge>
                      </div>

                      {/* Status change */}
                      {event.status_anterior && event.status_novo && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{STATUS_LABELS[event.status_anterior as keyof typeof STATUS_LABELS] || event.status_anterior}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium">{STATUS_LABELS[event.status_novo as keyof typeof STATUS_LABELS] || event.status_novo}</span>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {event.usuario_nome && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {event.usuario_nome}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-300" />
              Conta para o SLA
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-slate-200" />
              Pausado (aguardando solicitante)
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
