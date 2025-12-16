import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type HistoricoSolicitacao, STATUS_LABELS } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Send,
  RotateCcw,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SolicitacaoTimelineProps {
  solicitacaoId: string;
}

const getStatusIcon = (acao: string, statusNovo: string | null) => {
  if (acao === 'criacao') return <Send className="h-4 w-4" />;
  if (acao === 'reenvio') return <RotateCcw className="h-4 w-4" />;
  
  switch (statusNovo) {
    case 'aprovado': return <CheckCircle className="h-4 w-4" />;
    case 'rejeitado': return <XCircle className="h-4 w-4" />;
    case 'pendente_correcao': return <AlertCircle className="h-4 w-4" />;
    case 'em_analise': return <Clock className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getStatusColor = (acao: string, statusNovo: string | null) => {
  if (acao === 'criacao' || acao === 'reenvio') return 'bg-primary text-primary-foreground';
  
  switch (statusNovo) {
    case 'aprovado': return 'bg-success text-success-foreground';
    case 'rejeitado': return 'bg-destructive text-destructive-foreground';
    case 'pendente_correcao': return 'bg-warning text-warning-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function SolicitacaoTimeline({ solicitacaoId }: SolicitacaoTimelineProps) {
  const [historico, setHistorico] = useState<HistoricoSolicitacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistorico();
  }, [solicitacaoId]);

  const fetchHistorico = async () => {
    const { data, error } = await supabase
      .from('historico_solicitacoes')
      .select('*')
      .eq('solicitacao_id', solicitacaoId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Fetch profiles for each history entry
      const userIds = [...new Set(data.map(h => h.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const historicoWithProfiles = data.map(h => ({
        ...h,
        profile: profileMap.get(h.user_id),
      })) as HistoricoSolicitacao[];

      setHistorico(historicoWithProfiles);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="animate-pulse h-20 bg-muted rounded" />;
  }

  if (historico.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum histórico disponível</p>;
  }

  return (
    <div className="space-y-4">
      {historico.map((item, index) => (
        <div key={item.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              getStatusColor(item.acao, item.status_novo)
            )}>
              {getStatusIcon(item.acao, item.status_novo)}
            </div>
            {index < historico.length - 1 && (
              <div className="w-0.5 h-full bg-border mt-2" />
            )}
          </div>
          
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">
                {item.acao === 'criacao' && 'Solicitação criada'}
                {item.acao === 'reenvio' && 'Solicitação reenviada'}
                {item.acao === 'alteracao_status' && item.status_novo && STATUS_LABELS[item.status_novo]}
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {item.profile?.full_name || item.profile?.email || 'Usuário'}
              {' • '}
              {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            
            {item.motivo && (
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                <span className="font-medium">Motivo: </span>
                {item.motivo}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}