import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Send, MessageSquare, Search, Wifi, WifiOff } from 'lucide-react';

export function WhatsAppAdminTab() {
  const [digestLoading, setDigestLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [protocolo, setProtocolo] = useState('');
  const [instanceStatus, setInstanceStatus] = useState<string | null>(null);

  const handleSendDigest = async () => {
    setDigestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-daily-digest', {
        body: { time: 'manual' },
      });
      if (error) throw error;
      toast.success('Resumo enviado com sucesso!', {
        description: `Novas: ${data?.stats?.newToday || 0} | Atualizadas: ${data?.stats?.updatedToday || 0}`,
      });
    } catch (err: any) {
      toast.error('Erro ao enviar resumo', { description: err.message });
    } finally {
      setDigestLoading(false);
    }
  };

  const handleTestQuery = async () => {
    if (!protocolo.trim()) {
      toast.error('Digite um número de protocolo');
      return;
    }
    setQueryLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-webhook', {
        body: {
          event: 'messages.upsert',
          instance: 'WhatsmiauTest_4cca4bbe',
          data: {
            key: {
              remoteJid: '5541998749629@s.whatsapp.net',
              fromMe: false,
              id: 'test_' + Date.now(),
            },
            pushName: 'Admin Test',
            message: { conversation: protocolo.trim() },
            messageType: 'conversation',
            messageTimestamp: Math.floor(Date.now() / 1000),
          },
        },
      });
      if (error) throw error;
      toast.success('Consulta enviada!', {
        description: 'A resposta será enviada via WhatsApp para o número cadastrado.',
      });
    } catch (err: any) {
      toast.error('Erro na consulta', { description: err.message });
    } finally {
      setQueryLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setStatusLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsmiau-setup', {
        body: { action: 'status' },
      });
      if (error) throw error;
      const instance = data?.targetInstance;
      setInstanceStatus(instance?.connectionStatus || instance?.state || 'unknown');
      toast.success('Status verificado');
    } catch (err: any) {
      setInstanceStatus('error');
      toast.error('Erro ao verificar status', { description: err.message });
    } finally {
      setStatusLoading(false);
    }
  };

  const isConnected = instanceStatus === 'open' || instanceStatus === 'connected';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Instance Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              Instância WhatsApp
            </CardTitle>
            <CardDescription>WhatsmiauTest_4cca4bbe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {instanceStatus && (
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? 'Conectada' : instanceStatus}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleCheckStatus}
              disabled={statusLoading}
            >
              {statusLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verificar Status
            </Button>
          </CardContent>
        </Card>

        {/* Destinatários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Destinatários
            </CardTitle>
            <CardDescription>Recebem resumos e notificações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Guilherme Marques</span>
              <Badge variant="outline">5541998749629</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Jonatas Ferreira</span>
              <Badge variant="outline">5541991684980</Badge>
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enviar Resumo Agora</CardTitle>
            <CardDescription>
              Dispara o resumo diário imediatamente para todos os destinatários
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
            <CardTitle className="text-base">Testar Consulta de Protocolo</CardTitle>
            <CardDescription>
              Simula uma consulta via WhatsApp e envia a resposta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="protocolo-test" className="sr-only">Protocolo</Label>
                <Input
                  id="protocolo-test"
                  placeholder="Ex: 2026000312"
                  value={protocolo}
                  onChange={(e) => setProtocolo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTestQuery()}
                />
              </div>
              <Button onClick={handleTestQuery} disabled={queryLoading} className="gap-2">
                {queryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Testar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
