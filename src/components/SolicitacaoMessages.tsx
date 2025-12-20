import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Send, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  mensagem: string;
  created_at: string;
  user_id: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

interface SolicitacaoMessagesProps {
  solicitacaoId: string;
}

export function SolicitacaoMessages({ solicitacaoId }: SolicitacaoMessagesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

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
      // Fetch profiles for messages
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
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages();
      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi registrada no histórico.',
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

  if (loading) {
    return <div className="animate-pulse h-20 bg-muted rounded" />;
  }

  return (
    <div className="space-y-4">
      {/* Message list */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="font-medium">
                    {msg.profile?.full_name || msg.profile?.email || 'Usuário'}
                  </span>
                  <span>•</span>
                  <span>
                    {format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap break-words">{msg.mensagem}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Nenhuma mensagem registrada
        </p>
      )}

      {/* New message input */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Digite sua mensagem..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="min-h-[60px] resize-none"
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
          className="shrink-0 h-[60px] w-[60px]"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
