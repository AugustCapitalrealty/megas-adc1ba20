import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Send, MessageSquare, Wifi, Clock, Link as LinkIcon } from 'lucide-react';

export function WhatsAppAdminTab() {
  const [digestLoading, setDigestLoading] = useState(false);

  const handleSendDigest = async () => {
    setDigestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gchat-daily-digest', {
        body: { time: 'manual' },
      });
      if (error) throw error;
      toast.success('Resumo enviado no Google Chat!', {
        description: `Novas: ${data?.stats?.newToday || 0} | Atualizadas: ${data?.stats?.updatedToday || 0} | Versao: ${data?.cardVersion || 'desconhecida'}`,
      });
    } catch (err: any) {
      toast.error('Erro ao enviar resumo', { description: err.message });
    } finally {
      setDigestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Canal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-600" />
              Google Chat
            </CardTitle>
            <CardDescription>Webhook configurado no Space</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant="default">Ativo</Badge>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notificações
            </CardTitle>
            <CardDescription>O que é enviado automaticamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Resumo</Badge>
              <span className="text-muted-foreground">3x ao dia</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">OC Emitida</Badge>
              <span className="text-muted-foreground">Tempo real</span>
            </div>
          </CardContent>
        </Card>

        {/* Horários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Resumo Automático</CardTitle>
            <CardDescription>Dias úteis (seg-sex)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">09:00</Badge>
              <span className="text-muted-foreground">Bom dia</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">13:00</Badge>
              <span className="text-muted-foreground">Atualização</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">18:00</Badge>
              <span className="text-muted-foreground">Fechamento</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enviar Resumo Agora</CardTitle>
          <CardDescription>
            Dispara o resumo diário imediatamente no Google Chat Space
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSendDigest} disabled={digestLoading} className="gap-2">
            {digestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Resumo
          </Button>
        </CardContent>
      </Card>

      {/* Setup Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Próximas Execuções Agendadas
          </CardTitle>
          <CardDescription>Os resumos são enviados automaticamente em horários fixos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-white rounded border border-blue-100">
              <span className="font-medium">09:00 (Manhã)</span>
              <Badge variant="outline">Próximo</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded border border-blue-100">
              <span className="font-medium">13:00 (Tarde)</span>
              <Badge variant="outline">Agendado</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded border border-blue-100">
              <span className="font-medium">18:00 (Noite)</span>
              <Badge variant="outline">Agendado</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ Apenas dias úteis (segunda a sexta)
          </p>
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Configuração
          </CardTitle>
          <CardDescription>Como configurar o webhook do Google Chat</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" asChild>
            <a href="/GCHAT_SETUP.md" target="_blank" rel="noopener noreferrer">
              📖 Ver Documentação
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
