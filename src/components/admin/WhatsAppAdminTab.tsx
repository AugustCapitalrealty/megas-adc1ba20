import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Send, MessageSquare, Wifi, Clock, FlaskConical, CheckCircle2 } from 'lucide-react';

export function WhatsAppAdminTab() {
  const [digestLoading, setDigestLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const handleSendDigest = async () => {
    setDigestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gchat-daily-digest', {
        body: { time: 'manual' },
      });
      if (error) throw error;
      toast.success('Resumo enviado no Google Chat!', {
        description: `Novas: ${data?.stats?.newToday || 0} | Atualizadas: ${data?.stats?.updatedToday || 0}`,
      });
    } catch (err: any) {
      toast.error('Erro ao enviar resumo', { description: err.message });
    } finally {
      setDigestLoading(false);
    }
  };

  const handleTestApi = async () => {
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gchat-send-test');
      if (error) throw error;
      toast.success('Teste enviado com sucesso!', {
        description: `Método: ${data?.method === 'api' ? 'API Autenticada' : 'Webhook'} | API configurada: ${data?.apiConfigured ? 'Sim' : 'Não'}`,
      });
    } catch (err: any) {
      toast.error('Erro no teste', { description: err.message });
    } finally {
      setTestLoading(false);
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
            <CardDescription>API autenticada via Service Account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                API Ativa
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Webhook mantido como fallback</p>
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
            <div className="flex items-center gap-2">
              <Badge variant="outline">Correção</Badge>
              <span className="text-muted-foreground">Tempo real</span>
            </div>
          </CardContent>
        </Card>

        {/* Horários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Resumo Automático
            </CardTitle>
            <CardDescription>Dias úteis (seg-sex)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">09:00</Badge>
              <span className="text-muted-foreground">Radar da Manhã</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">13:00</Badge>
              <span className="text-muted-foreground">Pulso da Tarde</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">18:00</Badge>
              <span className="text-muted-foreground">Fechamento</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Testar Conexão API</CardTitle>
            <CardDescription>
              Envia mensagem de teste para verificar a API autenticada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleTestApi} disabled={testLoading} variant="outline" className="gap-2">
              {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              Testar API
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Info */}
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
            {['09:00 (Manhã)', '13:00 (Tarde)', '18:00 (Noite)'].map((time) => (
              <div key={time} className="flex justify-between items-center p-2 bg-white rounded border border-blue-100">
                <span className="font-medium">{time}</span>
                <Badge variant="outline">Agendado</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ Apenas dias úteis (segunda a sexta)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
