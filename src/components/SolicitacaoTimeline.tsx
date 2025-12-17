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
  User,
  FileCheck,
  MessageSquare,
  Cog,
  UserCheck,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SolicitacaoTimelineProps {
  solicitacaoId: string;
}

const getActionDetails = (acao: string, statusNovo: string | null): { icon: JSX.Element; label: string; color: string } => {
  // Handle specific action types first
  if (acao === 'criacao') return { 
    icon: <Send className="h-4 w-4" />, 
    label: 'Solicitação criada', 
    color: 'bg-primary text-primary-foreground' 
  };
  if (acao === 'reenvio') return { 
    icon: <RotateCcw className="h-4 w-4" />, 
    label: 'Solicitação reenviada após correção', 
    color: 'bg-primary text-primary-foreground' 
  };
  if (acao === 'aceite_oc') return { 
    icon: <CheckCircle className="h-4 w-4" />, 
    label: 'Solicitante aceitou a OC', 
    color: 'bg-success text-success-foreground' 
  };
  if (acao === 'ajuste_solicitado') return { 
    icon: <HelpCircle className="h-4 w-4" />, 
    label: 'Solicitante pediu ajuste na OC', 
    color: 'bg-warning text-warning-foreground' 
  };
  if (acao === 'resposta_informacoes') return { 
    icon: <MessageSquare className="h-4 w-4" />, 
    label: 'Solicitante respondeu às informações', 
    color: 'bg-info text-info-foreground' 
  };
  if (acao === 'nf_boleto_enviado' || acao === 'nf_boleto_enviado_antecipado') return { 
    icon: <FileCheck className="h-4 w-4" />, 
    label: acao === 'nf_boleto_enviado_antecipado' ? 'NF/Boleto enviados (pagamento antecipado)' : 'NF/Boleto enviados', 
    color: 'bg-info text-info-foreground' 
  };
  if (acao === 'baixa_financeiro') return { 
    icon: <CheckCircle className="h-4 w-4" />, 
    label: 'Baixa pelo financeiro - Enviado para pagamento', 
    color: 'bg-success text-success-foreground' 
  };
  if (acao.includes('OC nº') || acao.includes('AC nº')) return { 
    icon: <FileCheck className="h-4 w-4" />, 
    label: acao, 
    color: 'bg-success text-success-foreground' 
  };
  if (acao === 'Assumido pelo backoffice') return { 
    icon: <UserCheck className="h-4 w-4" />, 
    label: 'Backoffice assumiu a análise', 
    color: 'bg-primary text-primary-foreground' 
  };
  if (acao === 'Envio para processamento') return { 
    icon: <Cog className="h-4 w-4" />, 
    label: 'Enviado para processamento no Fluig/RM', 
    color: 'bg-primary text-primary-foreground' 
  };
  if (acao === 'Solicitação de informações') return { 
    icon: <MessageSquare className="h-4 w-4" />, 
    label: 'Backoffice solicitou informações', 
    color: 'bg-info text-info-foreground' 
  };
  if (acao === 'Devolução para correção') return { 
    icon: <AlertCircle className="h-4 w-4" />, 
    label: 'Solicitação devolvida para correção', 
    color: 'bg-warning text-warning-foreground' 
  };
  
  // Fall back to status-based display
  switch (statusNovo) {
    case 'aprovado': return { 
      icon: <CheckCircle className="h-4 w-4" />, 
      label: 'Aprovado', 
      color: 'bg-success text-success-foreground' 
    };
    case 'rejeitado': return { 
      icon: <XCircle className="h-4 w-4" />, 
      label: 'Reprovado', 
      color: 'bg-destructive text-destructive-foreground' 
    };
    case 'pendente_correcao': return { 
      icon: <AlertCircle className="h-4 w-4" />, 
      label: 'Devolvido para correção', 
      color: 'bg-warning text-warning-foreground' 
    };
    case 'em_analise': return { 
      icon: <Clock className="h-4 w-4" />, 
      label: 'Em análise', 
      color: 'bg-muted text-muted-foreground' 
    };
    case 'em_processamento': return { 
      icon: <Cog className="h-4 w-4" />, 
      label: 'Em processamento', 
      color: 'bg-primary text-primary-foreground' 
    };
    case 'aguardando_informacoes': return { 
      icon: <MessageSquare className="h-4 w-4" />, 
      label: 'Aguardando informações', 
      color: 'bg-info text-info-foreground' 
    };
    case 'aguardando_aceite': return { 
      icon: <FileCheck className="h-4 w-4" />, 
      label: 'OC emitida - Aguardando aceite', 
      color: 'bg-success text-success-foreground' 
    };
    case 'concluida': return { 
      icon: <CheckCircle className="h-4 w-4" />, 
      label: 'Concluída', 
      color: 'bg-success text-success-foreground' 
    };
    case 'aguardando_nf_boleto': return { 
      icon: <FileCheck className="h-4 w-4" />, 
      label: 'Aguardando NF/Boleto', 
      color: 'bg-[hsl(260,70%,50%)] text-white' 
    };
    case 'nf_boleto_enviados': return { 
      icon: <FileCheck className="h-4 w-4" />, 
      label: 'NF/Boleto enviados', 
      color: 'bg-info text-info-foreground' 
    };
    case 'enviado_pagamento': return { 
      icon: <CheckCircle className="h-4 w-4" />, 
      label: 'Enviado para pagamento', 
      color: 'bg-success text-success-foreground' 
    };
    default: return { 
      icon: <Clock className="h-4 w-4" />, 
      label: acao || STATUS_LABELS[statusNovo as keyof typeof STATUS_LABELS] || 'Atualização', 
      color: 'bg-muted text-muted-foreground' 
    };
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
    <div className="space-y-1">
      {historico.map((item, index) => {
        const { icon, label, color } = getActionDetails(item.acao, item.status_novo);
        const isLast = index === historico.length - 1;
        
        return (
          <div key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                color
              )}>
                {icon}
              </div>
              {!isLast && (
                <div className="w-0.5 flex-1 bg-border min-h-[24px]" />
              )}
            </div>
            
            <div className={cn("flex-1", !isLast && "pb-4")}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{label}</span>
                {item.status_novo && (
                  <Badge variant="outline" className="text-xs">
                    {STATUS_LABELS[item.status_novo]}
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <User className="h-3 w-3" />
                {item.profile?.full_name || item.profile?.email || 'Usuário'}
                {' • '}
                {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              
              {item.motivo && (
                <div className="mt-2 p-2 bg-muted/50 rounded text-sm border-l-2 border-primary/30">
                  <span className="text-muted-foreground">Observação: </span>
                  {item.motivo}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}