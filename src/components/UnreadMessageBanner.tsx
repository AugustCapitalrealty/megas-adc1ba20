import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface UnreadMessageInfo {
  solicitacao_id: string;
  count: number;
  last_message: string;
  last_sender_name: string;
  last_created_at: string;
}

interface UnreadMessageBannerProps {
  info: UnreadMessageInfo;
  onViewMessages?: () => void;
}

export function UnreadMessageBanner({ info, onViewMessages }: UnreadMessageBannerProps) {
  const preview = info.last_message.length > 80 
    ? info.last_message.slice(0, 80) + '...' 
    : info.last_message;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-between rounded-t-lg">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {info.count === 1 ? 'NOVA MENSAGEM' : `${info.count} NOVAS MENSAGENS`}
            </span>
            <span className="text-sm opacity-80">— {info.last_sender_name}</span>
          </div>
          <p className="text-sm opacity-90 truncate">&ldquo;{preview}&rdquo;</p>
        </div>
      </div>
      {onViewMessages && (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onViewMessages();
          }}
          className="shrink-0 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0"
        >
          Ver Mensagens
        </Button>
      )}
    </div>
  );
}
