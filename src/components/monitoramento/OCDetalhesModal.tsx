import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSolicitacaoDetalhes } from '@/hooks/useSolicitacaoDetalhes';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';

import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, DollarSign, Building2, User, FileCheck, Receipt, MessageSquare, AlertTriangle, Scale, Clock } from 'lucide-react';
import { StageDurationTimeline } from './StageDurationTimeline';
import { RecentActivitySummary } from '@/components/RecentActivitySummary';
import { formatBR } from '@/lib/date-utils';
import { differenceInDays } from 'date-fns';

interface OCDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacaoId: string | null;
  protocolo: string | null;
  onAction?: (action: string, solicitacaoId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  recebido: 'Em Fila',
  em_analise: 'Em Análise',
  pendente_correcao: 'Correção Necessária',
  aprovado: 'Em Lançamento',
  rejeitado: 'Não Aprovado',
  em_processamento: 'Em Aprovação',
  oc_ac_emitida: 'OC/AC Emitida',
  concluida: 'Finalizada',
  aguardando_aceite: 'Aguardando Aceite',
  aguardando_informacoes: 'Aguardando Info',
  aguardando_nf_boleto: 'Aguardando NF/Boleto',
  nf_boleto_enviados: 'NF/Boleto Enviados',
  enviado_pagamento: 'Enviado Pagamento',
  liberado_fornecedor: 'Liberado Fornecedor',
  enviado_fornecedor: 'Enviado ao Fornecedor',
  cancelado: 'Cancelado',
};

function ContextualActions({ status, userId, currentUserId, cancelamentoPendente, onAction, solicitacaoId }: {
  status: string;
  userId: string;
  currentUserId: string | undefined;
  cancelamentoPendente?: boolean;
  onAction?: (action: string, solicitacaoId: string) => void;
  solicitacaoId: string;
}) {
  const isOwner = userId === currentUserId;
  if (!onAction) return null;

  const actions: { label: string; action: string; variant?: 'default' | 'destructive' | 'outline' | 'secondary' }[] = [];

  if (cancelamentoPendente) {
    return (
      <Badge variant="destructive" className="text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Cancelamento Pendente
      </Badge>
    );
  }

  if (isOwner) {
    if (status === 'pendente_correcao') {
      actions.push({ label: 'Corrigir e Reenviar', action: 'corrigir', variant: 'default' });
    }
    if (status === 'aguardando_aceite') {
      actions.push({ label: 'Aceitar OC', action: 'aceitar', variant: 'default' });
    }
    if (status === 'aguardando_nf_boleto') {
      actions.push({ label: 'Enviar NF/Boleto', action: 'enviar_nf', variant: 'default' });
    }
    if (status === 'oc_ac_emitida') {
      actions.push({ label: 'Justificar', action: 'justificar', variant: 'outline' });
    }
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {actions.map((a) => (
        <Button
          key={a.action}
          size="sm"
          variant={a.variant || 'default'}
          onClick={() => onAction(a.action, solicitacaoId)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}

export function OCDetalhesModal({ open, onOpenChange, solicitacaoId, protocolo, onAction }: OCDetalhesModalProps) {
  const { detalhes, loading, fetchDetalhes, clearDetalhes } = useSolicitacaoDetalhes();
  const { user } = useAuth();
  const [projurisData, setProjurisData] = useState<any>(null);
  const [projurisLoading, setProjurisLoading] = useState(false);

  useEffect(() => {
    if (open && solicitacaoId) {
      fetchDetalhes(solicitacaoId);
    } else if (!open) {
      clearDetalhes();
      setProjurisData(null);
    }
  }, [open, solicitacaoId]);

  // Fetch Projuris data when detalhes loads and has numero_projuris
  useEffect(() => {
    const numProjuris = (detalhes?.solicitacao as any)?.numero_projuris;
    if (!numProjuris) {
      setProjurisData(null);
      return;
    }
    setProjurisLoading(true);
    supabase
      .from('projuris_requisicoes')
      .select('*')
      .eq('numero_requisicao', numProjuris)
      .maybeSingle()
      .then(({ data }) => {
        setProjurisData(data);
        setProjurisLoading(false);
      });
  }, [(detalhes?.solicitacao as any)?.numero_projuris]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes da Solicitação #{protocolo}
            </DialogTitle>
            {detalhes && solicitacaoId && (
              <ContextualActions
                status={detalhes.solicitacao.status}
                userId={detalhes.solicitacao.user_id}
                currentUserId={user?.id}
                cancelamentoPendente={(detalhes.solicitacao as any).cancelamento_pendente}
                onAction={onAction}
                solicitacaoId={solicitacaoId}
              />
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !detalhes ? (
          <p className="text-sm text-muted-foreground text-center py-8">Não foi possível carregar os detalhes.</p>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-4">
            {/* Recent Activity Summary */}
            <RecentActivitySummary historico={detalhes.historico} />
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="text-sm font-semibold truncate">{formatCurrency(detalhes.solicitacao.valor)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Empreendimento</p>
                      <p className="text-sm font-semibold truncate">{EMPREENDIMENTO_LABELS[detalhes.solicitacao.empreendimento as Empreendimento] || detalhes.solicitacao.empreendimento}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Fornecedor</p>
                      <p className="text-sm font-semibold truncate">{detalhes.solicitacao.fornecedor_nome_fantasia || detalhes.solicitacao.fornecedor_razao || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={detalhes.solicitacao.status === 'cancelado' ? 'destructive' : 'default'} className="text-xs">
                      {STATUS_LABELS[detalhes.solicitacao.status] || detalhes.solicitacao.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="documentos">
                  Docs ({(detalhes.documentos_emitidos?.length || 0) + (detalhes.documentos_fiscais?.length || 0)})
                </TabsTrigger>
                <TabsTrigger value="mensagens" className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Mensagens
                </TabsTrigger>
                <TabsTrigger value="info">Informações</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-4">
                <SolicitacaoTimeline solicitacaoId={solicitacaoId!} showMessages={false} />
              </TabsContent>

              <TabsContent value="documentos" className="mt-4 space-y-4">
                {detalhes.documentos_emitidos && detalhes.documentos_emitidos.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        Documentos Emitidos (OC/AC)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {detalhes.documentos_emitidos.map((doc: any) => (
                        <div key={doc.id} className="p-2 rounded-md bg-muted/50 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{doc.tipo_documento} — {doc.numero_documento}</span>
                              <span className="text-muted-foreground ml-2">
                                {formatBR(doc.created_at, 'dd/MM/yy')}
                              </span>
                            </div>
                            {doc.emitido_por_nome && <span className="text-xs text-muted-foreground">{doc.emitido_por_nome}</span>}
                          </div>
                          {doc.observacao && (
                            <p className="text-xs text-muted-foreground pl-0.5">
                              <span className="font-medium text-foreground">Obs:</span> {doc.observacao}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {detalhes.documentos_fiscais && detalhes.documentos_fiscais.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Documentos Fiscais (NF/Boleto)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {detalhes.documentos_fiscais.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                          <div>
                            <span className="font-medium">{doc.tipo === 'nota_fiscal' ? 'NF' : 'Boleto'} — {doc.nome_arquivo}</span>
                            <span className="text-muted-foreground ml-2">
                              {formatBR(doc.created_at, 'dd/MM/yy')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {(!detalhes.documentos_emitidos?.length && !detalhes.documentos_fiscais?.length) && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento registrado.</p>
                )}
              </TabsContent>

              <TabsContent value="mensagens" className="mt-4">
                {solicitacaoId && <SolicitacaoTimeline solicitacaoId={solicitacaoId} showHistorico={false} showMessages />}
              </TabsContent>

              <TabsContent value="info" className="mt-4 space-y-4">
                <StageDurationTimeline
                  historico={detalhes.historico}
                  createdAt={detalhes.solicitacao.created_at}
                  currentStatus={detalhes.solicitacao.status}
                />
                <Card>
                  <CardContent className="pt-4 space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-muted-foreground text-xs">Solicitante</p>
                        <p className="font-medium">{detalhes.solicitante?.full_name || detalhes.solicitante?.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Tipo</p>
                        <p className="font-medium">{detalhes.solicitacao.tipo}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Cliente</p>
                        <p className="font-medium">{detalhes.cliente?.nome || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Criado em</p>
                        <p className="font-medium">{formatBR(detalhes.solicitacao.created_at, 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Descrição</p>
                      <p className="text-sm whitespace-pre-wrap">{detalhes.solicitacao.descricao}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
