import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSolicitacaoDetalhes } from '@/hooks/useSolicitacaoDetalhes';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { Loader2, FileText, DollarSign, Building2, User, FileCheck, Receipt } from 'lucide-react';
import { formatBR } from '@/lib/date-utils';

interface OCDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacaoId: string | null;
  protocolo: string | null;
}

export function OCDetalhesModal({ open, onOpenChange, solicitacaoId, protocolo }: OCDetalhesModalProps) {
  const { detalhes, loading, fetchDetalhes, clearDetalhes } = useSolicitacaoDetalhes();

  useEffect(() => {
    if (open && solicitacaoId) {
      fetchDetalhes(solicitacaoId);
    } else if (!open) {
      clearDetalhes();
    }
  }, [open, solicitacaoId]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes da Solicitação #{protocolo}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !detalhes ? (
          <p className="text-sm text-muted-foreground text-center py-8">Não foi possível carregar os detalhes.</p>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="text-sm font-semibold">{formatCurrency(detalhes.solicitacao.valor)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Empreendimento</p>
                      <p className="text-sm font-semibold">{EMPREENDIMENTO_LABELS[detalhes.solicitacao.empreendimento as Empreendimento] || detalhes.solicitacao.empreendimento}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
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
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="documentos">
                  Documentos ({(detalhes.documentos_emitidos?.length || 0) + (detalhes.documentos_fiscais?.length || 0)})
                </TabsTrigger>
                <TabsTrigger value="info">Informações</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-4">
                <SolicitacaoTimeline solicitacaoId={solicitacaoId!} showMessages={false} />
              </TabsContent>

              <TabsContent value="documentos" className="mt-4 space-y-4">
                {/* Documentos Emitidos */}
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
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                          <div>
                            <span className="font-medium">{doc.tipo_documento} — {doc.numero_documento}</span>
                            <span className="text-muted-foreground ml-2">
                              {formatBR(doc.created_at, 'dd/MM/yy')}
                            </span>
                          </div>
                          {doc.emitido_por_nome && <span className="text-xs text-muted-foreground">{doc.emitido_por_nome}</span>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Documentos Fiscais */}
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

              <TabsContent value="info" className="mt-4">
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
                        <p className="font-medium">{format(new Date(detalhes.solicitacao.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
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
