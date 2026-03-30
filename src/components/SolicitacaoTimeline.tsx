import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notifyMessageRecipients } from '@/lib/message-notifications';
import { type HistoricoSolicitacao, STATUS_LABELS } from '@/types';
import { formatBR } from '@/lib/date-utils';
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
  HelpCircle,
  RefreshCw,
  Loader2,
  Package,
  Lock,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Checkbox } from '@/components/ui/checkbox';

interface SolicitacaoTimelineProps {
  solicitacaoId: string;
  showMessages?: boolean;
  showHistorico?: boolean;
  isBackoffice?: boolean;
}

interface Message {
  id: string;
  mensagem: string;
  created_at: string;
  user_id: string;
  interno?: boolean;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

interface TimelineItem {
  id: string;
  type: 'historico' | 'mensagem';
  created_at: string;
  data: HistoricoSolicitacao | Message;
}

const getActionDetails = (acao: string, statusNovo: string | null, isBackoffice?: boolean): { icon: JSX.Element; label: string; color: string } => {
  // Handle Fluig cadastro actions
  if (acao === 'fluig_cadastro_adicionado') return { 
    icon: <Package className="h-4 w-4" />, 
    label: isBackoffice ? 'Fluig de cadastro contábil adicionado' : 'Cadastro solicitado à Contabilidade', 
    color: 'bg-emerald-600 text-white' 
  };
  
  // Handle Fluig number actions
  if (acao === 'numero_fluig_adicionado') return { 
    icon: <RefreshCw className="h-4 w-4" />, 
    label: 'Fluig de aprovação adicionado', 
    color: 'bg-blue-500 text-white' 
  };
  if (acao === 'numero_fluig_alterado') return { 
    icon: <RefreshCw className="h-4 w-4" />, 
    label: 'Fluig de aprovação alterado', 
    color: 'bg-blue-500 text-white' 
  };
  if (acao === 'numero_fluig_removido') return { 
    icon: <RefreshCw className="h-4 w-4" />, 
    label: 'Número Fluig/RM removido', 
    color: 'bg-orange-500 text-white' 
  };
  
  // Handle Fluig integration updates
  if (acao === 'atualizacao_fluig') return { 
    icon: <RefreshCw className="h-4 w-4" />, 
    label: 'Atualização Fluig', 
    color: 'bg-blue-500 text-white' 
  };
  
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
  if (acao === 'liberacao_fornecedor') return { 
    icon: <CheckCircle className="h-4 w-4" />, 
    label: 'Solicitante liberou envio ao fornecedor', 
    color: 'bg-success text-success-foreground' 
  };
  if (acao === 'oc_enviada_fornecedor') return { 
    icon: <CheckCircle className="h-4 w-4" />, 
    label: 'OC enviada ao fornecedor', 
    color: 'bg-success text-success-foreground' 
  };
  if (acao === 'ajuste_solicitado') return { 
    icon: <HelpCircle className="h-4 w-4" />, 
    label: 'Solicitante pediu ajuste na OC', 
    color: 'bg-warning text-warning-foreground' 
  };
  if (acao === 'transferencia_titularidade') return { 
    icon: <UserCheck className="h-4 w-4" />, 
    label: 'Titularidade transferida', 
    color: 'bg-primary text-primary-foreground' 
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
    label: 'Backoffice assumiu a solicitação', 
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
  if (acao === 'ciencia_cancelamento') return { 
    icon: <Eye className="h-4 w-4" />, 
    label: 'Ciência de cancelamento confirmada', 
    color: 'bg-muted text-muted-foreground' 
  };
  if (acao === 'prazo_resposta_expirado' || acao === 'prazo_correcao_expirado') return { 
    icon: <XCircle className="h-4 w-4" />, 
    label: 'Cancelado automaticamente — prazo de resposta expirado', 
    color: 'bg-destructive text-destructive-foreground' 
  };
  
  // Fall back to status-based display
  switch (statusNovo) {
    case 'aprovado': return { 
      icon: <CheckCircle className="h-4 w-4" />, 
      label: 'Em Lançamento', 
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
    case 'liberado_fornecedor': return { 
      icon: <FileCheck className="h-4 w-4" />, 
      label: 'Liberada para fornecedor', 
      color: 'bg-[hsl(200,70%,50%)] text-white' 
    };
    case 'enviado_fornecedor': return { 
      icon: <CheckCircle className="h-4 w-4" />, 
      label: 'OC enviada ao fornecedor', 
      color: 'bg-[hsl(160,70%,40%)] text-white' 
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

export function SolicitacaoTimeline({ solicitacaoId, showMessages = true, showHistorico = true, isBackoffice = false }: SolicitacaoTimelineProps) {
  const { user, isBackofficeOrAdmin } = useAuth();
  const { toast } = useToast();
  const [historico, setHistorico] = useState<HistoricoSolicitacao[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isInternal, setIsInternal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [solicitacaoId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch historico and messages in parallel
    const [historicoResult, messagesResult] = await Promise.all([
      supabase
        .from('historico_solicitacoes')
        .select('*')
        .eq('solicitacao_id', solicitacaoId)
        .order('created_at', { ascending: true }),
      showMessages ? supabase
        .from('solicitacao_mensagens')
        .select('*')
        .eq('solicitacao_id', solicitacaoId)
        .order('created_at', { ascending: true }) : Promise.resolve({ data: [], error: null })
    ]);

    // Get all unique user IDs from both sources
    const historicoData = historicoResult.data || [];
    const messagesData = messagesResult.data || [];
    
    const allUserIds = [...new Set([
      ...historicoData.map(h => h.user_id),
      ...messagesData.map(m => m.user_id)
    ])];

    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', allUserIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    // Map historico with profiles
    const historicoWithProfiles = historicoData.map(h => ({
      ...h,
      profile: profileMap.get(h.user_id),
    })) as HistoricoSolicitacao[];

    // Map messages with profiles
    const messagesWithProfiles = messagesData.map(m => ({
      ...m,
      profile: profileMap.get(m.user_id),
    }));

    setHistorico(historicoWithProfiles);
    setMessages(messagesWithProfiles);
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('solicitacao_mensagens')
        .insert({
          solicitacao_id: solicitacaoId,
          user_id: user.id,
          mensagem: newMessage.trim(),
          interno: isInternal,
        } as any);

      if (error) throw error;

      // Don't notify for internal messages
      if (!isInternal) {
        notifyMessageRecipients(solicitacaoId, user.id, newMessage.trim());
      }

      setNewMessage('');
      setIsInternal(false);
      fetchData();
      toast({
        title: isInternal ? 'Nota interna salva' : 'Mensagem enviada',
        description: isInternal ? 'Sua nota interna foi registrada.' : 'Sua mensagem foi registrada no histórico.',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Filter internal messages for non-backoffice users
  const visibleMessages = isBackofficeOrAdmin 
    ? messages 
    : messages.filter(m => !(m as any).interno);

  // Merge historico and messages into a single timeline
  const timelineItems: TimelineItem[] = [
    ...(showHistorico ? historico.map(h => ({
      id: h.id,
      type: 'historico' as const,
      created_at: h.created_at,
      data: h
    })) : []),
    ...visibleMessages.map(m => ({
      id: m.id,
      type: 'mensagem' as const,
      created_at: m.created_at,
      data: m
    }))
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (loading) {
    return <div className="animate-pulse h-20 bg-muted rounded" />;
  }

  if (timelineItems.length === 0 && !showMessages) {
    return <p className="text-sm text-muted-foreground">{showHistorico ? 'Nenhum histórico disponível' : 'Nenhuma mensagem registrada'}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Combined Timeline */}
      <div className="space-y-1">
        {timelineItems.map((item, index) => {
          const isLast = index === timelineItems.length - 1;

          if (item.type === 'mensagem') {
            const msg = item.data as Message;
            const msgIsInternal = !!(msg as any).interno;
            return (
              <div key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msgIsInternal 
                      ? "bg-amber-100 dark:bg-amber-900/30" 
                      : "bg-primary/10"
                  )}>
                    {msgIsInternal 
                      ? <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      : <MessageSquare className="h-4 w-4 text-primary" />
                    }
                  </div>
                  {!isLast && (
                    <div className="w-0.5 flex-1 bg-border min-h-[24px]" />
                  )}
                </div>
                
                <div className={cn("flex-1", !isLast && "pb-4")}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {msg.profile?.full_name || msg.profile?.email || 'Usuário'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {msgIsInternal ? 'anotou internamente' : 'comentou'}
                    </span>
                    {msgIsInternal ? (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
                        <Lock className="h-3 w-3 mr-1" />
                        Interno
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                        Mensagem
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    {formatBR(msg.created_at, "dd/MM/yyyy HH:mm:ss")}
                  </p>
                  
                  <div className={cn(
                    "mt-2 p-3 rounded-lg border-l-4",
                    msgIsInternal 
                      ? "bg-amber-50/50 border-amber-400 dark:bg-amber-900/10 dark:border-amber-600" 
                      : "bg-muted/30 border-primary/40"
                  )}>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.mensagem}</p>
                  </div>
                </div>
              </div>
            );
          }

          // Historico item
          const hist = item.data as HistoricoSolicitacao;
          const { icon, label, color } = getActionDetails(hist.acao, hist.status_novo, isBackoffice);
          const isFluigUpdate = hist.acao === 'atualizacao_fluig';
          const isFluigNumberAction = hist.acao.startsWith('numero_fluig_');
          const isFluigCadastroAction = hist.acao === 'fluig_cadastro_adicionado';
          const displayLabel = (isFluigUpdate || isFluigNumberAction) && hist.motivo ? hist.motivo : 
                               (isFluigCadastroAction && isBackoffice && hist.motivo) ? hist.motivo : label;
          
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
                  <span className="font-medium text-sm">{displayLabel}</span>
                  {(isFluigUpdate || isFluigNumberAction) && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      Fluig Aprovação
                    </Badge>
                  )}
                  {isFluigCadastroAction && (
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      Cadastro Contábil
                    </Badge>
                  )}
                  {hist.status_novo && !isFluigUpdate && !isFluigNumberAction && !isFluigCadastroAction && (
                    <Badge variant="outline" className="text-xs">
                      {STATUS_LABELS[hist.status_novo]}
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <User className="h-3 w-3" />
                  {hist.profile?.full_name || hist.profile?.email || 'Usuário'}
                  {' • '}
                  {formatBR(hist.created_at, "dd/MM/yyyy HH:mm:ss")}
                </p>
                
                {hist.motivo && !isFluigUpdate && !isFluigNumberAction && !isFluigCadastroAction && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-sm border-l-2 border-primary/30">
                    <span className="text-muted-foreground">Observação: </span>
                    {hist.motivo}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Message input */}
      {showMessages && (
        <div className="pt-4 border-t">
          {isBackofficeOrAdmin && (
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="interno-toggle"
                checked={isInternal}
                onCheckedChange={(checked) => setIsInternal(!!checked)}
              />
              <label
                htmlFor="interno-toggle"
                className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none"
              >
                <Lock className="h-3 w-3" />
                Nota interna (visível apenas para o backoffice)
              </label>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder={isInternal ? "Escreva uma nota interna..." : "Digite sua mensagem..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className={cn(
                "min-h-[60px] resize-none",
                isInternal && "border-amber-300 dark:border-amber-700 focus-visible:ring-amber-400"
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className={cn(
                "shrink-0 h-[60px] w-[60px]",
                isInternal && "bg-amber-500 hover:bg-amber-600"
              )}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isInternal ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
