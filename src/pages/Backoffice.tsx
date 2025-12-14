import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { EMPREENDIMENTO_LABELS, type Solicitacao, type RequestStatus } from '@/types';
import { Loader2, CheckCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Backoffice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSolicitacoes();
  }, []);

  const fetchSolicitacoes = async () => {
    const { data, error } = await supabase
      .from('solicitacoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSolicitacoes(data as unknown as Solicitacao[]);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: RequestStatus, motivo?: string) => {
    const sol = solicitacoes.find(s => s.id === id);
    
    const { error } = await supabase
      .from('solicitacoes')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: id,
        user_id: user!.id,
        acao: newStatus === 'aprovado' ? 'Aprovação' : 'Devolução',
        status_anterior: sol?.status,
        status_novo: newStatus,
        motivo,
      });
      toast({ title: 'Status atualizado!' });
      fetchSolicitacoes();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Backoffice</h1>
          <p className="text-muted-foreground">Gerencie as solicitações</p>
        </div>

        <div className="space-y-4">
          {solicitacoes.map((sol) => (
            <Card key={sol.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">#{sol.protocolo}</CardTitle>
                  <StatusBadge status={sol.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-medium">{sol.tipo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Empreendimento</span>
                    <span>{EMPREENDIMENTO_LABELS[sol.empreendimento]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor</span>
                    <span>{formatCurrency(sol.valor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data</span>
                    <span>{format(new Date(sol.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                </div>

                {(sol.status === 'recebido' || sol.status === 'em_analise') && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus(sol.id, 'aprovado')}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(sol.id, 'pendente_correcao', 'Pendências identificadas')}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Devolver
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}