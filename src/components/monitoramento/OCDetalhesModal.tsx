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
import { Loader2, FileText, DollarSign, Building2, User, FileCheck, Receipt, MessageSquare, AlertTriangle, Scale, Clock, Paperclip, Copy, CalendarRange, Pencil, Check, X, Wand2 } from 'lucide-react';
import { StageDurationTimeline } from './StageDurationTimeline';
import { RecentActivitySummary } from '@/components/RecentActivitySummary';
import { formatBR } from '@/lib/date-utils';
import { differenceInCalendarMonths, differenceInDays, parseISO } from 'date-fns';
import { AnexoCard } from '@/components/AnexoCard';
import { ANEXO_LABELS } from '@/types';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

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
  const { user, isBackofficeOrAdmin } = useAuth();
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
              {protocolo && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    navigator.clipboard.writeText(protocolo);
                    toast({ title: 'Copiado', description: protocolo });
                  }}
                  title="Copiar protocolo"
                  aria-label="Copiar protocolo"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
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
                      <p className="text-xs text-muted-foreground">
                        {(detalhes.solicitacao as any).contrato_mensal ? 'Valor total contrato' : 'Valor'}
                      </p>
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

            {/* Valor mensal — apenas para contratos mensais */}
            {(detalhes.solicitacao as any).contrato_mensal && (
              <ValorMensalCard
                solicitacaoId={solicitacaoId!}
                valorTotal={Number(detalhes.solicitacao.valor) || 0}
                valorMensal={(detalhes.solicitacao as any).valor_mensal != null ? Number((detalhes.solicitacao as any).valor_mensal) : null}
                dataInicio={(detalhes.solicitacao as any).data_inicio}
                dataFim={(detalhes.solicitacao as any).data_fim}
                canEdit={isBackofficeOrAdmin}
                onSaved={() => fetchDetalhes(solicitacaoId!)}
              />
            )}

            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="w-full grid grid-cols-6">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="documentos">
                  Docs ({(detalhes.documentos_emitidos?.length || 0) + (detalhes.documentos_fiscais?.length || 0)})
                </TabsTrigger>
                <TabsTrigger value="anexos" className="flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5" />
                  Anexos ({detalhes.anexos?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="mensagens" className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Msgs
                </TabsTrigger>
                <TabsTrigger value="projuris" className="flex items-center gap-1" disabled={!projurisData && !projurisLoading && !(detalhes.solicitacao as any)?.numero_projuris}>
                  <Scale className="h-3.5 w-3.5" />
                  Projuris
                </TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
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

              <TabsContent value="anexos" className="mt-4 space-y-4">
                {detalhes.anexos && detalhes.anexos.length > 0 ? (
                  Array.from(
                    detalhes.anexos.reduce((map, a) => {
                      const arr = map.get(a.tipo) || [];
                      arr.push(a);
                      map.set(a.tipo, arr);
                      return map;
                    }, new Map<string, typeof detalhes.anexos>()).entries()
                  ).map(([tipo, items]) => (
                    <Card key={tipo}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          {ANEXO_LABELS[tipo] || tipo}
                          <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {items.map((a) => (
                          <AnexoCard key={a.id} anexo={a} showTipo={false} />
                        ))}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <Paperclip className="h-10 w-10 opacity-40" />
                    <p className="text-sm">Nenhum anexo nesta solicitação.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="mensagens" className="mt-4">
                {solicitacaoId && <SolicitacaoTimeline solicitacaoId={solicitacaoId} showHistorico={false} showMessages />}
              </TabsContent>

              <TabsContent value="projuris" className="mt-4 space-y-4">
                {projurisLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : projurisData ? (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          Requisição Projuris #{projurisData.numero_requisicao}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <p className="text-muted-foreground text-xs">Status Projuris</p>
                            <Badge variant="outline" className="mt-0.5 text-xs">{projurisData.status || '—'}</Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Tipo Requisição</p>
                            <p className="font-medium">{projurisData.tipo_requisicao || '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Responsável</p>
                            <p className="font-medium">{projurisData.responsavel || '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Fornecedor / Cliente</p>
                            <p className="font-medium">{projurisData.cliente_fornecedor || '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Empreendimento</p>
                            <p className="font-medium">{projurisData.empreendimento || '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Nº Fluig</p>
                            <p className="font-medium">{projurisData.numero_fluig || '—'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                          <div>
                            <p className="text-muted-foreground text-xs">Data Requisição</p>
                            <p className="font-medium">{projurisData.data_requisicao ? formatBR(projurisData.data_requisicao, 'dd/MM/yyyy') : '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Últ. Envio Aprovação</p>
                            <p className="font-medium">{projurisData.data_ultimo_envio_aprovacao ? formatBR(projurisData.data_ultimo_envio_aprovacao, 'dd/MM/yyyy') : '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Últ. Aprovação</p>
                            <p className="font-medium">{projurisData.data_ultima_aprovacao ? formatBR(projurisData.data_ultima_aprovacao, 'dd/MM/yyyy') : '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Finalização</p>
                            <p className="font-medium">{projurisData.data_finalizacao ? formatBR(projurisData.data_finalizacao, 'dd/MM/yyyy') : '—'}</p>
                          </div>
                        </div>

                        {projurisData.data_requisicao && !projurisData.data_finalizacao && (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Tempo parado:</span>
                            <Badge variant="secondary" className="text-xs">
                              {differenceInDays(new Date(), new Date(projurisData.data_ultimo_envio_aprovacao || projurisData.data_requisicao))} dias
                            </Badge>
                          </div>
                        )}

                        {projurisData.detalhes && (
                          <div className="pt-2 border-t">
                            <p className="text-muted-foreground text-xs mb-1">Detalhes</p>
                            <p className="text-sm whitespace-pre-wrap">{projurisData.detalhes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (detalhes.solicitacao as any)?.numero_projuris ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nº Projuris {(detalhes.solicitacao as any).numero_projuris} não encontrado na base importada.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Esta solicitação não possui número Projuris vinculado.
                  </p>
                )}
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

interface ValorMensalCardProps {
  solicitacaoId: string;
  valorTotal: number;
  valorMensal: number | null;
  dataInicio: string | null;
  dataFim: string | null;
  canEdit: boolean;
  onSaved: () => void;
}

function ValorMensalCard({
  solicitacaoId,
  valorTotal,
  valorMensal,
  dataInicio,
  dataFim,
  canEdit,
  onSaved,
}: ValorMensalCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [valueStr, setValueStr] = useState<string>(''); // centavos

  // Calcula meses do período
  const periodoMeses = (() => {
    if (!dataInicio || !dataFim) return null;
    try {
      return Math.max(1, differenceInCalendarMonths(parseISO(dataFim), parseISO(dataInicio)) + 1);
    } catch {
      return null;
    }
  })();
  const mesesBase = periodoMeses ?? 12;
  const sugerido = valorTotal / mesesBase;
  const efetivo = valorMensal ?? sugerido;
  const isEstimado = valorMensal == null;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const beginEdit = () => {
    const startVal = valorMensal != null ? Math.round(valorMensal * 100) : Math.round(sugerido * 100);
    setValueStr(String(startVal));
    setEditing(true);
  };

  const formatBRL = (cents: string) => {
    const n = (parseInt(cents || '0', 10) || 0) / 100;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const numericValue = (parseInt(valueStr || '0', 10) || 0) / 100;

  const save = async () => {
    if (numericValue <= 0) {
      toast({ title: 'Valor inválido', description: 'Informe um valor mensal maior que zero.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('solicitacoes')
      .update({ valor_mensal: numericValue })
      .eq('id', solicitacaoId);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Valor mensal atualizado', description: fmt(numericValue) });
    setEditing(false);
    onSaved();
  };

  const clear = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('solicitacoes')
      .update({ valor_mensal: null })
      .eq('id', solicitacaoId);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao limpar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Valor mensal removido', description: 'O calendário voltará a estimar a partir do total.' });
    setEditing(false);
    onSaved();
  };

  const mesesInferidos = numericValue > 0 ? valorTotal / numericValue : 0;

  return (
    <Card className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarRange className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" />
            <div className="min-w-0">
              <p className="text-xs text-blue-900/80 dark:text-blue-200/80">
                Valor mensal {isEstimado && <span className="italic">(estimado)</span>}
              </p>
              {!editing && (
                <p className="text-base font-bold text-blue-900 dark:text-blue-100 tabular-nums">
                  {fmt(efetivo)}
                  <span className="text-xs font-normal text-muted-foreground"> /mês</span>
                </p>
              )}
            </div>
          </div>
          {!editing && canEdit && (
            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={beginEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {valorMensal == null ? 'Definir' : 'Editar'}
            </Button>
          )}
        </div>

        {editing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                className="bg-background h-8"
                placeholder="R$ 0,00"
                value={valueStr ? formatBRL(valueStr) : ''}
                onChange={(e) => setValueStr(e.target.value.replace(/\D/g, ''))}
                disabled={saving}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 shrink-0"
                onClick={() => setValueStr(String(Math.round(sugerido * 100)))}
                disabled={saving}
                title="Aplicar valor sugerido"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Sugerido
              </Button>
              <Button size="sm" className="h-8 gap-1 shrink-0" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 shrink-0"
                onClick={() => setEditing(false)}
                disabled={saving}
                aria-label="Cancelar"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sugerido: <strong>{fmt(sugerido)}</strong>
              {periodoMeses === null
                ? ' (estimativa de 12 meses — defina datas)'
                : ` (total ÷ ${periodoMeses} ${periodoMeses === 1 ? 'mês' : 'meses'} do período)`}
              {numericValue > 0 && (
                <> · Equivale a ≈ <strong>{mesesInferidos.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong> meses</>
              )}
            </p>
            {valorMensal != null && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={clear}
                disabled={saving}
              >
                Limpar valor manual
              </Button>
            )}
          </div>
        )}

        {!editing && (
          <p className="text-[11px] text-muted-foreground">
            Total: {fmt(valorTotal)} · {periodoMeses ?? '?'} {periodoMeses === 1 ? 'mês' : 'meses'}
            {isEstimado && (
              <> · <span className="italic">aparece no calendário como estimativa enquanto não for definido</span></>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
