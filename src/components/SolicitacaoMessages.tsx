import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { formatBR } from '@/lib/date-utils';
import { MessageSquare, Send, User, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notifyMessageRecipients } from '@/lib/message-notifications';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


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

interface SolicitacaoMessagesProps {
  solicitacaoId: string;
}

export function SolicitacaoMessages({ solicitacaoId }: SolicitacaoMessagesProps) {
  const { user, isBackofficeOrAdmin } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isInternal, setIsInternal] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [solicitacaoId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('solicitacao_mensagens')
      .select('*')
      .eq('solicitacao_id', solicitacaoId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const messagesWithProfiles = data.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id),
      }));

      setMessages(messagesWithProfiles);
    }
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

      if (!isInternal) {
        notifyMessageRecipients(solicitacaoId, user.id, newMessage.trim());
      }

      setNewMessage('');
      setIsInternal(false);
      fetchMessages();
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

  if (loading) {
    return <div className="animate-pulse h-20 bg-muted rounded" />;
  }

  return (
    <div className="space-y-4">
      {visibleMessages.length > 0 && (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {visibleMessages.map((msg) => {
            const msgIsInternal = !!(msg as any).interno;
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 p-3 rounded-lg border",
                  msgIsInternal
                    ? "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800"
                    : "bg-muted/30 border-border/50"
                )}
              >
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="font-medium">
                      {msg.profile?.full_name || msg.profile?.email || 'Usuário'}
                    </span>
                    {msgIsInternal && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
                        <Lock className="h-2.5 w-2.5 mr-0.5" />
                        Interno
                      </Badge>
                    )}
                    <span>•</span>
                    <span>
                      {formatBR(msg.created_at, "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">{msg.mensagem}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {visibleMessages.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Nenhuma mensagem registrada
        </p>
      )}

      {/* New message input */}
      <div className="space-y-2">
        {isBackofficeOrAdmin && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="interno-toggle-msg"
              checked={isInternal}
              onCheckedChange={(checked) => setIsInternal(!!checked)}
            />
            <label
              htmlFor="interno-toggle-msg"
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
    </div>
  );
}
