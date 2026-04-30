import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmModal } from '@/components/ui/ActionModal';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { AnexoCard } from '@/components/AnexoCard';
import { FornecedorCard } from '@/components/FornecedorCard';
import { GarantiaExpiracaoInfo } from '@/components/GarantiaExpiracaoInfo';
import { CNAECompatibilityBadge } from '@/components/CNAECompatibilityBadge';
import { DescriptionQualityBadge } from '@/components/DescriptionQualityBadge';
import { MEIAlertBadge } from '@/components/MEIAlertBadge';
import { EscopoMinutaCard } from '@/components/EscopoMinutaCard';
import { InstrumentoJuridicoBadge } from '@/components/InstrumentoJuridicoBadge';
import { ProjurisStatusCard } from '@/components/ProjurisStatusCard';
import { JuridicoTracker } from '@/components/JuridicoTracker';
import { RateioCard } from '@/components/RateioCard';
import { FluigStatusCard } from '@/components/FluigStatusCard';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';

import { StageDurationTimeline } from '@/components/monitoramento/StageDurationTimeline';
import type { SolicitacaoBackoffice } from '@/hooks/useBackofficeSolicitacoes';
import type { RequestStatus, DocumentoEmitido, DocumentoFiscal, Fornecedor, CNAESecundario } from '@/types';
import {
  EMPREENDIMENTO_LABELS,
  NATUREZA_ORCAMENTARIA_LABELS,
  TIPO_GARANTIA_LABELS,
  ANEXO_LABELS,
} from '@/types';
import { formatBR } from '@/lib/date-utils';
import { differenceInDays, differenceInHours } from 'date-fns';
import {
  Loader2, CheckCircle, XCircle, Clock, AlertTriangle, Building2, User, Calendar,
  FileText, Package, Truck, Download, Archive, FileCheck, Upload, HelpCircle,
  ChevronDown, History, Receipt, CreditCard, Send, Banknote, Edit, ShieldAlert,
  Shield, Mail, Phone, Plus, MessageSquare, RefreshCw, CheckCheck,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────

interface PdfValidationResult {
  match: boolean;
  valorPdf: number | null;
  valorEsperado: number;
  diferenca: number | null;
}

interface DocumentoOCRow {
  numero: string;
  file: File | null;
  pdfValidation: PdfValidationResult | null;
  validating: boolean;
  confirmarDivergencia: boolean;
}

export interface BackofficeModalsProps {
  // Details Modal
  detailsOpen: boolean;
  setDetailsOpen: (open: boolean) => void;
  selectedSolicitacao: SolicitacaoBackoffice | null;
  detalhes: any;
  detalhesLoading: boolean;
  downloadingZip: boolean;
  downloadAnexosZip: (id: string, anexos: any[], protocolo: string) => void;
  downloadDocumentoEmitido: (doc: DocumentoEmitido) => void;
  downloadDocumentoFiscal: (doc: DocumentoFiscal) => void;
  buildFornecedorFromDetalhes: (sol: any) => Fornecedor;
  buildConcorrenteFromDetalhes: (sol: any, n: 1 | 2) => Fornecedor | null;
  formatCurrency: (v: number) => string;
  formatCNPJ: (v: string) => string;
  openAction: (sol: SolicitacaoBackoffice, type: 'assumir' | 'rejeitar' | 'processar' | 'concluir' | 'solicitar_ajuste') => void;
  openRegistro: (sol: SolicitacaoBackoffice, mode?: 'new' | 'add') => void;

  // Action Modal
  actionOpen: boolean;
  setActionOpen: (open: boolean) => void;
  actionType: 'assumir' | 'rejeitar' | 'processar' | 'concluir' | 'solicitar_ajuste';
  motivo: string;
  setMotivo: (m: string) => void;
  actionLoading: boolean;
  handleAction: () => void;
  numeroChamadoFluig: string;
  setNumeroChamadoFluig: (v: string) => void;
  anexosDisponiveis: Array<{ tipo: string; nome_arquivo: string }>;
  anexosComProblema: string[];
  setAnexosComProblema: React.Dispatch<React.SetStateAction<string[]>>;

  // Registro OC Modal
  registroOpen: boolean;
  handleRegistroModalClose: (open: boolean) => void;
  registroMode: 'new' | 'add';
  documentosOC: DocumentoOCRow[];
  setDocumentosOC: React.Dispatch<React.SetStateAction<DocumentoOCRow[]>>;
  observacao: string;
  setObservacao: (v: string) => void;
  registroLoading: boolean;
  canSubmitOC: boolean;
  handleRegistrarOCAC: () => void;
  addOCRow: () => void;
  removeOCRow: (index: number) => void;
  handlePdfFileSelectForOC: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;

  // NF/Boleto Modal
  nfBoletoViewOpen: boolean;
  setNfBoletoViewOpen: (open: boolean) => void;
  baixaLoading: boolean;

  // Edit Fluig Modal
  editFluigOpen: boolean;
  setEditFluigOpen: (open: boolean) => void;
  editFluigValue: string;
  setEditFluigValue: (v: string) => void;
  editFluigLoading: boolean;
  handleSaveFluig: () => void;

  // Edit Fluig Cadastro Modal
  editFluigCadastroOpen: boolean;
  setEditFluigCadastroOpen: (open: boolean) => void;
  editFluigCadastroValue: string;
  setEditFluigCadastroValue: (v: string) => void;
  editFluigCadastroLoading: boolean;
  handleSaveFluigCadastro: () => void;

  // Edit Projuris Modal
  editProjurisOpen: boolean;
  setEditProjurisOpen: (open: boolean) => void;
  editProjurisValue: string;
  setEditProjurisValue: (v: string) => void;
  editProjurisLoading: boolean;
  handleSaveProjuris: () => void;

  // Edit Natureza Orçamentária Modal
  editNaturezaOpen: boolean;
  setEditNaturezaOpen: (open: boolean) => void;
  editNaturezaValue: string;
  setEditNaturezaValue: (v: string) => void;
  editNaturezaLoading: boolean;
  handleSaveNatureza: () => void;

  // Confirmation Modal (baixa only now)
  confirmAction: { type: string; sol: SolicitacaoBackoffice; title: string; description: string } | null;
  setConfirmAction: (v: any) => void;
  handleDarBaixaConfirmed: () => Promise<void>;

  // Concluir Modal
  concluirModal: SolicitacaoBackoffice | null;
  setConcluirModal: (v: SolicitacaoBackoffice | null) => void;
  handleConcluirLiberadaConfirmed: (sol: SolicitacaoBackoffice, numeroFluigPagamento: string) => Promise<void>;

  // Envio Fornecedor Modal
  envioFornecedorModal: SolicitacaoBackoffice | null;
  setEnvioFornecedorModal: (v: SolicitacaoBackoffice | null) => void;
  handleRegistrarEnvioFornecedorConfirmed: (sol: SolicitacaoBackoffice, meioEnvio: string, observacaoEnvio?: string) => Promise<void>;
}

// ── Helper ─────────────────────────────────────────────

function getSLAInfo(sol: SolicitacaoBackoffice) {
  const diasDesdeAbertura = differenceInDays(new Date(), new Date(sol.created_at));
  const horasDesdeAbertura = differenceInHours(new Date(), new Date(sol.created_at));
  const tempoDesdeAbertura = diasDesdeAbertura === 0 ? `${horasDesdeAbertura}h` : `${diasDesdeAbertura}d`;
  const diasDesdeAprovacao = sol.dataAprovacao ? differenceInDays(new Date(), new Date(sol.dataAprovacao)) : null;
  const horasDesdeAprovacao = sol.dataAprovacao ? differenceInHours(new Date(), new Date(sol.dataAprovacao)) : null;
  const tempoDesdeAprovacao = sol.dataAprovacao
    ? (diasDesdeAprovacao === 0 ? `${horasDesdeAprovacao}h` : `${diasDesdeAprovacao}d`)
    : null;
  const atrasadoAnalise = diasDesdeAbertura > 5 && ['recebido', 'em_analise'].includes(sol.status);
  const atrasadoEmissao = diasDesdeAprovacao !== null && diasDesdeAprovacao > 3 && ['aprovado', 'em_processamento'].includes(sol.status);
  return { tempoDesdeAbertura, tempoDesdeAprovacao, atrasadoAnalise, atrasadoEmissao };
}

// ── Concluir Solicitação Modal ─────────────────────────

function ConcluirSolicitacaoModal({
  sol,
  onClose,
  onConfirm,
}: {
  sol: SolicitacaoBackoffice | null;
  onClose: () => void;
  onConfirm: (sol: SolicitacaoBackoffice, numeroFluigPagamento: string) => Promise<void>;
}) {
  const [checkNF, setCheckNF] = useState(false);
  const [checkFluig, setCheckFluig] = useState(false);
  const [numeroFluigPagamento, setNumeroFluigPagamento] = useState('');
  const [loading, setLoading] = useState(false);

  const fluigTrimmed = numeroFluigPagamento.trim();
  const isReady = checkNF && checkFluig && fluigTrimmed.length > 0;

  const handleConfirm = async () => {
    if (!sol || !isReady) return;
    setLoading(true);
    try {
      await onConfirm(sol, fluigTrimmed);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCheckNF(false);
      setCheckFluig(false);
      setNumeroFluigPagamento('');
      onClose();
    }
  };

  return (
    <Dialog open={!!sol} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Concluir Solicitação
          </DialogTitle>
          {sol && (
            <DialogDescription>
              Solicitação #{sol.protocolo}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-2 space-y-4">
          <p className="text-sm text-muted-foreground">Confirme antes de concluir:</p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={checkNF}
                onCheckedChange={(v) => setCheckNF(v === true)}
              />
              <span className="text-sm font-medium">NF recebida e conferida</span>
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={checkFluig}
                  onCheckedChange={(v) => setCheckFluig(v === true)}
                />
                <span className="text-sm font-medium">Pagamento lançado no Fluig</span>
              </label>
              {checkFluig && (
                <div className="pl-7 space-y-1">
                  <Input
                    autoFocus
                    inputMode="numeric"
                    placeholder="Nº do Fluig de pagamento (ex: 123456)"
                    value={numeroFluigPagamento}
                    onChange={(e) => setNumeroFluigPagamento(e.target.value)}
                    className="h-9"
                  />
                  {fluigTrimmed.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Informe o nº Fluig para concluir.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isReady || loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Component ──────────────────────────────────────────

export function BackofficeModals(props: BackofficeModalsProps) {
  const {
    detailsOpen, setDetailsOpen, selectedSolicitacao, detalhes, detalhesLoading,
    downloadingZip, downloadAnexosZip, downloadDocumentoEmitido, downloadDocumentoFiscal,
    buildFornecedorFromDetalhes, buildConcorrenteFromDetalhes, formatCurrency, formatCNPJ,
    openAction, openRegistro,
    actionOpen, setActionOpen, actionType, motivo, setMotivo, actionLoading, handleAction,
    numeroChamadoFluig, setNumeroChamadoFluig, anexosDisponiveis, anexosComProblema, setAnexosComProblema,
    registroOpen, handleRegistroModalClose, registroMode, documentosOC, setDocumentosOC,
    observacao, setObservacao, registroLoading, canSubmitOC, handleRegistrarOCAC, addOCRow, removeOCRow, handlePdfFileSelectForOC,
    nfBoletoViewOpen, setNfBoletoViewOpen, baixaLoading,
    editFluigOpen, setEditFluigOpen, editFluigValue, setEditFluigValue, editFluigLoading, handleSaveFluig,
    editFluigCadastroOpen, setEditFluigCadastroOpen, editFluigCadastroValue, setEditFluigCadastroValue, editFluigCadastroLoading, handleSaveFluigCadastro,
    editProjurisOpen, setEditProjurisOpen, editProjurisValue, setEditProjurisValue, editProjurisLoading, handleSaveProjuris,
    editNaturezaOpen, setEditNaturezaOpen, editNaturezaValue, setEditNaturezaValue, editNaturezaLoading, handleSaveNatureza,
    confirmAction, setConfirmAction, handleDarBaixaConfirmed,
    concluirModal, setConcluirModal, handleConcluirLiberadaConfirmed,
    envioFornecedorModal, setEnvioFornecedorModal, handleRegistrarEnvioFornecedorConfirmed,
  } = props;

  return (
    <>
      {/* ═══════════════ Details Modal ═══════════════ */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="flex-shrink-0 border-b px-6 py-4 bg-background">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-3 flex-wrap">
                <Badge variant={selectedSolicitacao?.tipo === 'AC' ? 'default' : 'secondary'} className="text-sm">
                  {selectedSolicitacao?.tipo}
                </Badge>
                <span className="font-mono text-lg">#{selectedSolicitacao?.protocolo}</span>
                {selectedSolicitacao && <StatusBadge status={selectedSolicitacao.status} />}
                {detalhes?.solicitacao?.emergencial && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> Emergencial
                  </Badge>
                )}
              </DialogTitle>
              <span className="text-2xl font-bold text-primary whitespace-nowrap pr-8">
                {selectedSolicitacao?.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            {selectedSolicitacao && (() => {
              const sla = getSLAInfo(selectedSolicitacao);
              return (
                <div className="flex gap-2 text-xs mt-2">
                  <Badge variant={sla.atrasadoAnalise ? "destructive" : "outline"}>
                    <Clock className="h-3 w-3 mr-1" />
                    {sla.tempoDesdeAbertura} desde abertura
                  </Badge>
                  {sla.tempoDesdeAprovacao !== null && (
                    <Badge variant={sla.atrasadoEmissao ? "destructive" : "outline"}>
                      {sla.tempoDesdeAprovacao} desde assumido
                    </Badge>
                  )}
                </div>
              );
            })()}
          </DialogHeader>

          {detalhesLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : detalhes?.solicitacao ? (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <TooltipProvider>
              <div className="space-y-6">

                {/* Documento Emitido */}
                {detalhes.documentos_emitidos && detalhes.documentos_emitidos.length > 0 && (
                  <>
                    <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-success">
                        <FileCheck className="h-4 w-4" /> Documento Emitido
                      </h4>
                      {detalhes.documentos_emitidos.map((doc: DocumentoEmitido) => (
                        <div key={doc.id} className="grid grid-cols-2 gap-4 text-sm mb-2">
                          <div>
                            <Label className="text-muted-foreground">Tipo</Label>
                            <p className="font-medium">{doc.tipo_documento}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Número</Label>
                            <p className="font-medium">{doc.numero_documento}</p>
                          </div>
                          <Button size="sm" variant="outline" className="col-span-2" onClick={() => downloadDocumentoEmitido(doc)}>
                            <Download className="h-4 w-4 mr-1" /> Baixar {doc.tipo_documento}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Separator />
                  </>
                )}

                {/* Contato do Fornecedor */}
                {(['liberado_fornecedor', 'enviado_fornecedor'].includes(detalhes.solicitacao.status)) &&
                 ((detalhes.solicitacao as any).fornecedor_email_contato || (detalhes.solicitacao as any).fornecedor_telefone_contato) && (
                  <>
                    <Card className="border-2 border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-green-800 dark:text-green-200">
                          <Send className="h-4 w-4" /> Contato do Fornecedor (para envio da OC)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 pb-3">
                        {(detalhes.solicitacao as any).fornecedor_email_contato && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{(detalhes.solicitacao as any).fornecedor_email_contato}</span>
                          </div>
                        )}
                        {(detalhes.solicitacao as any).fornecedor_telefone_contato && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{(detalhes.solicitacao as any).fornecedor_telefone_contato}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <Separator />
                  </>
                )}

                {/* Solicitante */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" /> Solicitante
                  </h4>
                  <p>{detalhes.solicitante?.full_name || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{detalhes.solicitante?.email}</p>
                </div>

                <Separator />

                {/* Fluig Status Card */}
                {detalhes.solicitacao.numero_chamado_fluig && detalhes.solicitacao.numero_chamado_fluig !== 'RM' && (
                  <>
                    <FluigStatusCard numeroChamadoFluig={detalhes.solicitacao.numero_chamado_fluig} />
                    <Separator />
                  </>
                )}

                {/* Descrição */}
                <Card className="bg-slate-50 dark:bg-slate-900/50 border-l-4 border-l-primary shadow-sm">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4" /> Resumo da Solicitação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ExpandableDescription description={detalhes.solicitacao.descricao} maxLength={200} className="text-base" />
                  </CardContent>
                </Card>

                {/* Instrumento Jurídico */}
                {(detalhes.solicitacao as any).instrumento_juridico && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">Instrumento Jurídico</Label>
                    <InstrumentoJuridicoBadge instrumento={(detalhes.solicitacao as any).instrumento_juridico} />
                  </div>
                )}

                {/* Status Projuris */}
                {(detalhes.solicitacao as any).numero_projuris ? (
                  <ProjurisStatusCard
                    numeroProjuris={(detalhes.solicitacao as any).numero_projuris}
                    onEdit={() => {
                      setEditProjurisValue((detalhes.solicitacao as any).numero_projuris || '');
                      setEditProjurisOpen(true);
                    }}
                  />
                ) : (((detalhes.solicitacao as any).instrumento_juridico && (detalhes.solicitacao as any).instrumento_juridico !== 'oc') && (
                  <div className="space-y-2">
                    <JuridicoTracker solicitacaoId={detalhes.solicitacao.id} />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditProjurisValue('');
                          setEditProjurisOpen(true);
                        }}
                      >
                        Adicionar nº Projuris
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Escopo Detalhado para Minuta */}
                {(detalhes.solicitacao as any).escopo_detalhado_minuta && (
                  <EscopoMinutaCard
                    escopo={(detalhes.solicitacao as any).escopo_detalhado_minuta}
                    protocolo={detalhes.solicitacao.protocolo}
                    onSolicitarAjuste={() => openAction(selectedSolicitacao!, 'solicitar_ajuste')}
                  />
                )}

                {/* Due Diligence */}
                {detalhes.solicitacao.valor >= 50000 && (
                  <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
                        <Shield className="h-5 w-5" /> Due Diligence Obrigatória (R$ 50k+)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Ciência do Solicitante</Label>
                          <p className="font-medium">
                            {(detalhes.solicitacao as any).due_diligence_confirmada 
                              ? <span className="text-success flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Confirmada</span>
                              : <span className="text-warning flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Pendente</span>}
                          </p>
                        </div>
                        {(detalhes.solicitacao as any).due_diligence_numero_projuris && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Número Projuris Informado</Label>
                            <p className="font-medium font-mono bg-background px-2 py-1 rounded inline-block">
                              {(detalhes.solicitacao as any).due_diligence_numero_projuris}
                            </p>
                          </div>
                        )}
                      </div>
                      <Alert className="bg-amber-100/50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-sm">Verificação Necessária</AlertTitle>
                        <AlertDescription className="text-xs">
                          Verifique com o Jurídico da Capital Realty se a Due Diligence do fornecedor está válida antes de aprovar a emissão da OC.
                        </AlertDescription>
                      </Alert>
                      <p className="text-xs text-muted-foreground italic">
                        💡 Registre no Projuris e utilize o campo "Observação" ao emitir a OC para documentar a verificação de Due Diligence.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Informações Gerais */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Empreendimento</Label>
                    <p className="font-medium mt-1">{EMPREENDIMENTO_LABELS[detalhes.solicitacao.empreendimento]}</p>
                  </div>

                  {detalhes.solicitacao.empreendimento === 'todos' && (detalhes.solicitacao as any).rateio_valores && (
                    <div className="col-span-2">
                      <RateioCard
                        tipoRateio={(detalhes.solicitacao as any).tipo_rateio || 'por_area'}
                        rateioValores={(detalhes.solicitacao as any).rateio_valores}
                        protocolo={detalhes.solicitacao.protocolo || undefined}
                        valorTotal={detalhes.solicitacao.valor}
                      />
                    </div>
                  )}

                  <div className="col-span-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Classificação Orçamentária</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                        onClick={() => {
                          setEditNaturezaValue(detalhes.solicitacao.natureza_orcamentaria || '');
                          setEditNaturezaOpen(true);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                    </div>
                    <Badge variant="secondary" className="mt-2 px-3 py-1.5 text-sm font-medium whitespace-normal text-left bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700">
                      {NATUREZA_ORCAMENTARIA_LABELS[detalhes.solicitacao.natureza_orcamentaria]}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1.5">Define centro de custo e fluxo de aprovação</p>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Quem Paga?</Label>
                    <p className="font-medium mt-1">
                      {detalhes.solicitacao.origem_custo === 'empreendimento' ? 'Área comum' : 'Cliente'}
                      {detalhes.cliente && <span className="text-primary"> ({detalhes.cliente.nome})</span>}
                    </p>
                  </div>

                  {detalhes.solicitacao.faturamento_direto ? (
                    <div className="col-span-2 p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Valores (Faturamento Direto)</Label>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor Material</Label>
                          <p className="font-semibold text-lg">{formatCurrency(detalhes.solicitacao.valor_material || 0)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor Serviço</Label>
                          <p className="font-semibold text-lg">{formatCurrency(detalhes.solicitacao.valor_servico || 0)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor Total</Label>
                          <p className="font-bold text-xl text-primary">
                            {formatCurrency((detalhes.solicitacao.valor_servico || 0) + (detalhes.solicitacao.valor_material || 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Valor Total</Label>
                      <p className="font-bold text-xl text-primary mt-1">{formatCurrency(detalhes.solicitacao.valor)}</p>
                    </div>
                  )}

                  {(detalhes.solicitacao.data_inicio || detalhes.solicitacao.data_fim) && (
                    <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Data Início do Serviço
                        </Label>
                        <p className="font-medium mt-1">
                          {detalhes.solicitacao.data_inicio ? formatBR(detalhes.solicitacao.data_inicio + 'T12:00:00', 'dd/MM/yyyy') : '—'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Data Fim do Serviço
                        </Label>
                        <p className="font-medium mt-1">
                          {detalhes.solicitacao.data_fim ? formatBR(detalhes.solicitacao.data_fim + 'T12:00:00', 'dd/MM/yyyy') : '—'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(detalhes.solicitacao as any).fornecimento_exclusivo && (
                    <div className="col-span-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <Label className="text-muted-foreground font-medium flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-purple-600" /> Fornecimento Exclusivo
                      </Label>
                      <p className="mt-2 text-sm">{(detalhes.solicitacao as any).justificativa_exclusividade || 'Sem justificativa informada'}</p>
                    </div>
                  )}
                </div>

                {/* Justificativas */}
                {(detalhes.solicitacao as any).justificativa_sem_chamado && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <Label className="text-muted-foreground font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" /> Justificativa - Sem Chamado Infraspeak
                    </Label>
                    <p className="mt-2 text-sm">{(detalhes.solicitacao as any).justificativa_sem_chamado}</p>
                  </div>
                )}
                {(detalhes.solicitacao as any).justificativa_sem_memorial && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <Label className="text-muted-foreground font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" /> Justificativa - Sem Memorial/Escopo
                    </Label>
                    <p className="mt-2 text-sm">{(detalhes.solicitacao as any).justificativa_sem_memorial}</p>
                  </div>
                )}

                <Separator />

                {/* Anexos */}
                {detalhes.anexos && detalhes.anexos.length > 0 && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
                          <Archive className="h-4 w-4" /> Anexos <Badge variant="secondary" className="ml-1">{detalhes.anexos.length}</Badge>
                        </h4>
                        <Button size="sm" onClick={() => downloadAnexosZip(detalhes.solicitacao.id, detalhes.anexos, detalhes.solicitacao.protocolo)} disabled={downloadingZip} className="gap-1.5">
                          {downloadingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          Baixar Todos (ZIP)
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        {detalhes.anexos.map((anexo: any) => <AnexoCard key={anexo.id} anexo={anexo} />)}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Fornecedor */}
                {detalhes.solicitacao.fornecedor_cnpj && (
                  <>
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2"><Truck className="h-4 w-4" /> Fornecedor</h4>
                      <FornecedorCard fornecedor={buildFornecedorFromDetalhes(detalhes.solicitacao)} showClearButton={false} compact={false} formatCNPJ={formatCNPJ} />
                      {buildFornecedorFromDetalhes(detalhes.solicitacao)?.is_mei && (
                        <MEIAlertBadge showInlineAlert valorTotal={detalhes.solicitacao.valor} />
                      )}
                      {buildFornecedorFromDetalhes(detalhes.solicitacao)?.cnae_principal_codigo && (
                        <CNAECompatibilityBadge
                          descricao={detalhes.solicitacao.descricao}
                          fornecedor={buildFornecedorFromDetalhes(detalhes.solicitacao)}
                          enabled={detalhes.solicitacao.descricao.length >= 20}
                          cachedResult={detalhes.solicitacao.ia_cnae_status ? { status: detalhes.solicitacao.ia_cnae_status, justificativa: detalhes.solicitacao.ia_cnae_justificativa || '' } : null}
                        />
                      )}
                      <DescriptionQualityBadge isVague={detalhes.solicitacao.ia_descricao_vaga} suggestion={detalhes.solicitacao.ia_descricao_sugestao} />
                    </div>

                    {(buildConcorrenteFromDetalhes(detalhes.solicitacao, 1) || buildConcorrenteFromDetalhes(detalhes.solicitacao, 2)) && (
                      <div className="mt-4 space-y-3">
                        <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4" /> Fornecedores Concorrentes
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {buildConcorrenteFromDetalhes(detalhes.solicitacao, 1) && (
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs mb-1">Concorrente 1</Badge>
                              <FornecedorCard fornecedor={buildConcorrenteFromDetalhes(detalhes.solicitacao, 1)!} showClearButton={false} compact formatCNPJ={formatCNPJ} />
                            </div>
                          )}
                          {buildConcorrenteFromDetalhes(detalhes.solicitacao, 2) && (
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs mb-1">Concorrente 2</Badge>
                              <FornecedorCard fornecedor={buildConcorrenteFromDetalhes(detalhes.solicitacao, 2)!} showClearButton={false} compact formatCNPJ={formatCNPJ} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <Separator />
                  </>
                )}

                {/* Justificativa Fornecedor Único */}
                {detalhes.solicitacao.justificativa_fornecedores && (
                  <>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <Label className="text-muted-foreground font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" /> Justificativa para Fornecedor Único
                      </Label>
                      <p className="mt-2 text-sm">{detalhes.solicitacao.justificativa_fornecedores}</p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Flags */}
                <div className="flex flex-wrap gap-2">
                  {detalhes.solicitacao.contrato_mensal && <Badge variant="outline">Contrato Mensal</Badge>}
                  {detalhes.solicitacao.faturamento_direto && <Badge variant="outline">Faturamento Direto</Badge>}
                  {detalhes.solicitacao.retencao_6_porcento && <Badge variant="outline">Retenção 6%</Badge>}
                  {detalhes.solicitacao.custo_cliente && <Badge variant="outline">Custo Cliente</Badge>}
                </div>

                {/* Garantia */}
                {detalhes.solicitacao.tipo_garantia && detalhes.solicitacao.tipo_garantia !== 'nenhuma' && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" /> Garantia Contratada
                    </Label>
                    <div className="mt-2 space-y-1">
                      <p className="font-medium text-green-800 dark:text-green-200">
                        {TIPO_GARANTIA_LABELS[detalhes.solicitacao.tipo_garantia]}
                      </p>
                      {detalhes.solicitacao.tipo_garantia === 'ambos' ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="text-sm"><span className="text-muted-foreground">Serviço:</span> <span className="font-semibold">{detalhes.solicitacao.dias_garantia_servico || '—'} dias</span></div>
                          <div className="text-sm"><span className="text-muted-foreground">Produto:</span> <span className="font-semibold">{detalhes.solicitacao.dias_garantia_produto || '—'} dias</span></div>
                        </div>
                      ) : (
                        <p className="text-sm"><span className="text-muted-foreground">Duração:</span> <span className="font-semibold">{detalhes.solicitacao.dias_garantia || '—'} dias</span></p>
                      )}
                      {detalhes.solicitacao.status === 'concluida' && detalhes.solicitacao.data_conclusao && (
                        <GarantiaExpiracaoInfo
                          dataConclusao={detalhes.solicitacao.data_conclusao}
                          tipoGarantia={detalhes.solicitacao.tipo_garantia}
                          diasGarantia={detalhes.solicitacao.dias_garantia}
                          diasGarantiaServico={detalhes.solicitacao.dias_garantia_servico}
                          diasGarantiaProduto={detalhes.solicitacao.dias_garantia_produto}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Tempo por Etapa */}
                <StageDurationTimeline
                  historico={detalhes.historico}
                  createdAt={detalhes.solicitacao.created_at}
                  currentStatus={detalhes.solicitacao.status}
                />

                {/* Histórico */}
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                      <span className="font-semibold flex items-center gap-2"><History className="h-4 w-4" /> Histórico</span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>svg&]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <SolicitacaoTimeline solicitacaoId={detalhes.solicitacao.id} isBackoffice />
                  </CollapsibleContent>
                </Collapsible>

                {/* Mensagens */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                      <span className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Mensagens</span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>svg&]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <SolicitacaoTimeline solicitacaoId={detalhes.solicitacao.id} showHistorico={false} showMessages />
                  </CollapsibleContent>
                </Collapsible>

                <Separator />

                {/* Datas */}
                <div className="text-sm text-muted-foreground">
                  <p>Criado em: {formatBR(detalhes.solicitacao.created_at, "dd/MM/yyyy 'às' HH:mm")}</p>
                  <p>Atualizado em: {formatBR(detalhes.solicitacao.updated_at, "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
              </div>
              </TooltipProvider>
            </div>
          ) : null}

          {/* Footer */}
          <DialogFooter className="flex-shrink-0 border-t px-6 py-4 bg-background">
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => setDetailsOpen(false)}>Fechar</Button>
              <div className="flex gap-2 flex-wrap">
                {selectedSolicitacao && (
                  <>
                    {(selectedSolicitacao.status === 'recebido' || selectedSolicitacao.status === 'em_analise') && (
                      <>
                        <Button variant="destructive" size="sm" onClick={() => { setDetailsOpen(false); openAction(selectedSolicitacao, 'rejeitar'); }}>
                          <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setDetailsOpen(false); openAction(selectedSolicitacao, 'solicitar_ajuste'); }}>
                          <HelpCircle className="h-4 w-4 mr-1" /> Solicitar Ajuste
                        </Button>
                        <Button onClick={() => { setDetailsOpen(false); openAction(selectedSolicitacao, 'assumir'); }}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Assumir
                        </Button>
                      </>
                    )}
                    {(selectedSolicitacao.status === 'aprovado' || selectedSolicitacao.status === 'em_processamento') && (
                      <Button onClick={() => { setDetailsOpen(false); openRegistro(selectedSolicitacao); }}>
                        <FileCheck className="h-4 w-4 mr-1" /> Registrar OC
                      </Button>
                    )}
                    {['aguardando_aceite', 'liberado_fornecedor', 'enviado_fornecedor', 'aguardando_nf_boleto'].includes(selectedSolicitacao.status) && (
                      <Button variant="outline" onClick={() => { setDetailsOpen(false); openRegistro(selectedSolicitacao, 'add'); }}>
                        <Plus className="h-4 w-4 mr-1" /> Adicionar OC
                      </Button>
                    )}
                    {selectedSolicitacao.status === 'oc_ac_emitida' && (
                      <Button onClick={() => { setDetailsOpen(false); openAction(selectedSolicitacao, 'concluir'); }}>
                        <CheckCheck className="h-4 w-4 mr-1" /> Concluir
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ Action Sheet (side panel) ═══════════════ */}
      <Sheet open={actionOpen} onOpenChange={setActionOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>
              {actionType === 'assumir' && 'Assumir Solicitação'}
              {actionType === 'rejeitar' && 'Rejeitar Solicitação'}
              {actionType === 'processar' && 'Enviar para Processamento'}
              {actionType === 'concluir' && 'Concluir Solicitação'}
              {actionType === 'solicitar_ajuste' && 'Solicitar Ajuste'}
            </SheetTitle>
            <SheetDescription>
              {actionType === 'assumir' && 'A solicitação será assumida e seguirá para processamento.'}
              {actionType === 'rejeitar' && 'Informe o motivo da rejeição.'}
              {actionType === 'processar' && 'A solicitação será marcada como em processamento no Fluig/RM.'}
              {actionType === 'concluir' && 'A solicitação será marcada como concluída.'}
              {actionType === 'solicitar_ajuste' && 'Informe o ajuste ou informação necessária ao solicitante.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {(actionType === 'rejeitar' || actionType === 'solicitar_ajuste') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="motivo">
                  {actionType === 'solicitar_ajuste' ? 'Informações solicitadas *' : 'Motivo *'}
                </Label>
                <Textarea id="motivo" autoFocus placeholder={actionType === 'solicitar_ajuste' ? "Descreva as informações ou ajustes necessários..." : "Descreva o motivo..."} value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={5} />
              </div>

              {actionType === 'solicitar_ajuste' && anexosDisponiveis.length > 0 && (
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Sinalizar anexos que precisam correção (opcional)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">Marque os anexos que estão com problema para que o solicitante saiba quais substituir.</p>
                  <div className="space-y-2">
                    {anexosDisponiveis.map((anexo, idx) => (
                      <div key={`${anexo.tipo}-${idx}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`anexo-${anexo.tipo}-${idx}`}
                          checked={anexosComProblema.includes(anexo.tipo)}
                          onCheckedChange={(checked) => {
                            if (checked) setAnexosComProblema(prev => [...prev, anexo.tipo]);
                            else setAnexosComProblema(prev => prev.filter(t => t !== anexo.tipo));
                          }}
                        />
                        <Label htmlFor={`anexo-${anexo.tipo}-${idx}`} className="cursor-pointer text-sm flex items-center gap-2">
                          <span>{ANEXO_LABELS[anexo.tipo] || anexo.tipo}</span>
                          <span className="text-xs text-muted-foreground">({anexo.nome_arquivo})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                  {anexosComProblema.length > 0 && (
                    <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {anexosComProblema.length} anexo(s) sinalizado(s) como problemático(s)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {actionType === 'processar' && (
            <div className="space-y-3">
              <Label>Número do Chamado Fluig / RM (opcional)</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="rm-flag" checked={numeroChamadoFluig === 'RM'} onCheckedChange={(checked) => setNumeroChamadoFluig(checked ? 'RM' : '')} />
                  <Label htmlFor="rm-flag" className="cursor-pointer text-sm font-medium">RM (sem Fluig)</Label>
                </div>
              </div>
              {numeroChamadoFluig !== 'RM' && (
                <Input id="fluig" placeholder="Ex: CHM-2024-001234" value={numeroChamadoFluig} onChange={(e) => setNumeroChamadoFluig(e.target.value)} />
              )}
              <p className="text-xs text-muted-foreground">Marque "RM" se não houver chamado Fluig, ou informe o número para rastreabilidade.</p>
            </div>
          )}
          </div>

          <SheetFooter className="px-6 py-4 border-t flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setActionOpen(false)} disabled={actionLoading}>Cancelar</Button>
            <Button onClick={handleAction} disabled={actionLoading || ((actionType === 'rejeitar' || actionType === 'solicitar_ajuste') && !motivo.trim())} variant={actionType === 'rejeitar' ? 'destructive' : 'default'}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══════════════ Registro OC Modal ═══════════════ */}
      <Dialog open={registroOpen} onOpenChange={handleRegistroModalClose}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{registroMode === 'add' ? 'Adicionar OC' : 'Registrar OC Emitida'}</DialogTitle>
            <DialogDescription>
              {registroMode === 'add' ? `Adicione mais OCs para a solicitação #${selectedSolicitacao?.protocolo}` : `Registre os dados da OC emitida para a solicitação #${selectedSolicitacao?.protocolo}`}
              {selectedSolicitacao && (
                <span className="block mt-1 text-sm font-medium text-foreground">
                  Valor da solicitação: R$ {selectedSolicitacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {documentosOC.map((doc, index) => (
              <Card key={index} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">OC #{index + 1}</Label>
                  {documentosOC.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" onClick={() => removeOCRow(index)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <Label htmlFor={`numero-${index}`}>Número da OC *</Label>
                  <Input id={`numero-${index}`} placeholder="Ex: 2024001234" value={doc.numero} onChange={(e) => setDocumentosOC(prev => prev.map((d, i) => i === index ? { ...d, numero: e.target.value } : d))} />
                </div>
                <div>
                  <Label htmlFor={`doc-file-${index}`}>Documento (PDF) *</Label>
                  <Input id={`doc-file-${index}`} type="file" accept=".pdf" onChange={(e) => handlePdfFileSelectForOC(e, index)} />
                  {doc.validating && (
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Validando valor do documento...</span>
                    </div>
                  )}
                  {doc.pdfValidation && !doc.validating && (
                    <>
                      {doc.pdfValidation.match ? (
                        <Alert className="mt-3 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <AlertTitle className="text-green-800 dark:text-green-200">Valor confere!</AlertTitle>
                          <AlertDescription className="text-green-700 dark:text-green-300">
                            R$ {doc.pdfValidation.valorPdf?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </AlertDescription>
                        </Alert>
                      ) : doc.pdfValidation.valorPdf !== null ? (
                        <Alert variant="destructive" className="mt-3">
                          <ShieldAlert className="h-4 w-4" />
                          <AlertTitle>Valor divergente!</AlertTitle>
                          <AlertDescription className="space-y-1">
                            <div>Solicitação: R$ {doc.pdfValidation.valorEsperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <div>PDF: R$ {doc.pdfValidation.valorPdf.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <div className="font-bold">Diferença: R$ {Math.abs(doc.pdfValidation.diferenca!).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="mt-3 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
                          <HelpCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          <AlertTitle className="text-yellow-800 dark:text-yellow-200">Verificação manual necessária</AlertTitle>
                          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                            Não foi possível identificar o valor automaticamente no PDF.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                  {doc.pdfValidation && !doc.pdfValidation.match && doc.pdfValidation.valorPdf !== null && (
                    <div className="flex items-start gap-3 p-3 mt-3 border border-red-200 rounded-lg bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                      <Checkbox id={`confirm-divergence-${index}`} checked={doc.confirmarDivergencia} onCheckedChange={(checked) => setDocumentosOC(prev => prev.map((d, i) => i === index ? { ...d, confirmarDivergencia: checked === true } : d))} className="mt-0.5" />
                      <Label htmlFor={`confirm-divergence-${index}`} className="text-red-800 dark:text-red-200 text-sm cursor-pointer">
                        Confirmo que verifiquei os valores e desejo prosseguir mesmo com a divergência
                      </Label>
                    </div>
                  )}
                </div>
              </Card>
            ))}

            <Button variant="outline" className="w-full gap-2" onClick={addOCRow}>
              <Plus className="h-4 w-4" /> Adicionar outra OC
            </Button>

            <div>
              <Label htmlFor="obs">Observação (opcional)</Label>
              <Textarea id="obs" placeholder="Observações adicionais..." value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleRegistroModalClose(false)} disabled={registroLoading}>Cancelar</Button>
            <Button onClick={handleRegistrarOCAC} disabled={registroLoading || !canSubmitOC}>
              {registroLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {documentosOC.filter(d => d.numero && d.file).length > 1 ? `Registrar ${documentosOC.filter(d => d.numero && d.file).length} OCs` : 'Registrar OC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ NF/Boleto View Modal ═══════════════ */}
      <Dialog open={nfBoletoViewOpen} onOpenChange={setNfBoletoViewOpen}>
        <DialogContent className="max-w-2xl w-[80vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-cyan-600" /> NF e Boleto - #{selectedSolicitacao?.protocolo}
            </DialogTitle>
            <DialogDescription>Documentos fiscais enviados pelo solicitante</DialogDescription>
          </DialogHeader>
          {selectedSolicitacao && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Solicitante</p>
                <p className="font-medium">{selectedSolicitacao.solicitante_nome || selectedSolicitacao.solicitante_email}</p>
              </div>
              {detalhes?.documentos_fiscais && detalhes.documentos_fiscais.length > 0 ? (
                <div className="space-y-3">
                  {detalhes.documentos_fiscais.map((doc: DocumentoFiscal) => (
                    <div key={doc.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {doc.tipo === 'nota_fiscal' ? <Receipt className="h-5 w-5 text-green-600" /> : <CreditCard className="h-5 w-5 text-blue-600" />}
                          <span className="font-medium">{doc.tipo === 'nota_fiscal' ? 'Nota Fiscal' : 'Boleto'}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => downloadDocumentoFiscal(doc)}>
                          <Download className="h-4 w-4 mr-1" /> Baixar
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.nome_arquivo}</p>
                      {doc.tipo === 'nota_fiscal' && doc.data_emissao_nf && (
                        <p className="text-sm"><span className="text-muted-foreground">Emissão:</span> {formatBR(doc.data_emissao_nf, "dd/MM/yyyy")}</p>
                      )}
                      {doc.tipo === 'boleto' && doc.data_vencimento_boleto && (
                        <p className="text-sm"><span className="text-muted-foreground">Vencimento:</span> {formatBR(doc.data_vencimento_boleto, "dd/MM/yyyy")}</p>
                      )}
                      {doc.pagamento_antecipado && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Pagamento Antecipado
                        </Badge>
                      )}
                      {doc.justificativa_antecipado && (
                        <p className="text-sm text-muted-foreground italic">Justificativa: {doc.justificativa_antecipado}</p>
                      )}
                      {doc.baixa_financeiro_em && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" /> Baixa em {formatBR(doc.baixa_financeiro_em, "dd/MM/yyyy HH:mm")}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Nenhum documento fiscal encontrado</p>
              )}
              {selectedSolicitacao.status === 'nf_boleto_enviados' && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">Ao dar baixa, os documentos serão marcados como enviados para pagamento.</p>
                  <Button className="w-full" onClick={() => setConfirmAction({ type: 'baixa', sol: selectedSolicitacao, title: 'Dar Baixa para Pagamento', description: `Confirma a baixa da solicitação #${selectedSolicitacao.protocolo}?` })} disabled={baixaLoading}>
                    {baixaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Banknote className="h-4 w-4 mr-2" />}
                    Dar Baixa - Enviar para Pagamento
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════ Edit Fluig/RM Modal ═══════════════ */}
      <Dialog open={editFluigOpen} onOpenChange={setEditFluigOpen}>
        <DialogContent className="max-w-lg w-[80vw]">
          <DialogHeader>
            <DialogTitle>Fluig/RM — Aprovação</DialogTitle>
            <DialogDescription>Atualize o número do chamado Fluig ou marque como RM</DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 flex items-start gap-2 text-sm text-blue-800">
            <RefreshCw className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Este é o Fluig/RM de <strong>aprovação da solicitação</strong> (separado do Fluig de cadastro contábil).</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="edit-rm-flag" checked={editFluigValue === 'RM'} onCheckedChange={(checked) => setEditFluigValue(checked ? 'RM' : '')} />
                <Label htmlFor="edit-rm-flag" className="cursor-pointer text-sm font-medium">RM (sem Fluig)</Label>
              </div>
            </div>
            {editFluigValue !== 'RM' && (
              <div className="space-y-2">
                <Label htmlFor="edit-fluig">Número do Chamado Fluig</Label>
                <Input id="edit-fluig" placeholder="Ex: CHM-2024-001234" value={editFluigValue} onChange={(e) => setEditFluigValue(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFluigOpen(false)} disabled={editFluigLoading}>Cancelar</Button>
            <Button onClick={handleSaveFluig} disabled={editFluigLoading}>
              {editFluigLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ Edit Fluig Cadastro Modal ═══════════════ */}
      <Dialog open={editFluigCadastroOpen} onOpenChange={setEditFluigCadastroOpen}>
        <DialogContent className="max-w-lg w-[80vw]">
          <DialogHeader>
            <DialogTitle>Fluig — Cadastro Contábil</DialogTitle>
            <DialogDescription>Informe o número do Fluig para a solicitação de cadastro contábil</DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2 text-sm text-emerald-800">
            <Package className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Este é o Fluig do <strong>cadastro contábil</strong> (separado do Fluig de aprovação).</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-fluig-cadastro">Número do Fluig de Cadastro</Label>
            <Input id="edit-fluig-cadastro" placeholder="Ex: CHM-2024-001234" value={editFluigCadastroValue} onChange={(e) => setEditFluigCadastroValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFluigCadastroOpen(false)} disabled={editFluigCadastroLoading}>Pular</Button>
            <Button onClick={handleSaveFluigCadastro} disabled={editFluigCadastroLoading || !editFluigCadastroValue.trim()}>
              {editFluigCadastroLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ Edit Projuris Modal ═══════════════ */}
      <Dialog open={editProjurisOpen} onOpenChange={setEditProjurisOpen}>
        <DialogContent className="max-w-lg w-[80vw]">
          <DialogHeader>
            <DialogTitle>Editar Número Projuris</DialogTitle>
            <DialogDescription>
              Informe o número do processo no Projuris. Para remover, use o botão "Remover número".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-projuris">Número do Projuris</Label>
              <Input id="edit-projuris" placeholder="Ex: PROJ-2024-001234" value={editProjurisValue} onChange={(e) => setEditProjurisValue(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => { setEditProjurisValue(''); handleSaveProjuris(); }}
              disabled={editProjurisLoading}
            >
              Remover número
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditProjurisOpen(false)} disabled={editProjurisLoading}>Cancelar</Button>
              <Button onClick={handleSaveProjuris} disabled={editProjurisLoading}>
                {editProjurisLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ Edit Natureza Orçamentária Modal ═══════════════ */}
      <Dialog open={editNaturezaOpen} onOpenChange={setEditNaturezaOpen}>
        <DialogContent className="max-w-lg w-[80vw]">
          <DialogHeader>
            <DialogTitle>Corrigir Classificação Orçamentária</DialogTitle>
            <DialogDescription>
              A alteração será registrada no histórico da solicitação e ficará visível para o solicitante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-natureza">Nova Classificação</Label>
              <Select value={editNaturezaValue} onValueChange={setEditNaturezaValue}>
                <SelectTrigger id="edit-natureza">
                  <SelectValue placeholder="Selecione a classificação" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NATUREZA_ORCAMENTARIA_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNaturezaOpen(false)} disabled={editNaturezaLoading}>Cancelar</Button>
            <Button onClick={handleSaveNatureza} disabled={editNaturezaLoading || !editNaturezaValue}>
              {editNaturezaLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ Confirmation Modal (baixa only) ═══════════════ */}
      <ConfirmModal
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmText="Confirmar"
        onConfirm={async () => {
          if (!confirmAction) return;
          setConfirmAction(null);
          if (confirmAction.type === 'baixa') await handleDarBaixaConfirmed();
        }}
      />

      {/* ═══════════════ Concluir Solicitação Modal ═══════════════ */}
      <ConcluirSolicitacaoModal
        sol={concluirModal}
        onClose={() => setConcluirModal(null)}
        onConfirm={handleConcluirLiberadaConfirmed}
      />

      {/* ═══════════════ Envio Fornecedor Modal ═══════════════ */}
      <EnvioFornecedorModal
        sol={envioFornecedorModal}
        onClose={() => setEnvioFornecedorModal(null)}
        onConfirm={handleRegistrarEnvioFornecedorConfirmed}
      />
    </>
  );
}

// ── Envio Fornecedor Modal ─────────────────────────────

function EnvioFornecedorModal({
  sol,
  onClose,
  onConfirm,
}: {
  sol: SolicitacaoBackoffice | null;
  onClose: () => void;
  onConfirm: (sol: SolicitacaoBackoffice, meioEnvio: string, observacaoEnvio?: string) => Promise<void>;
}) {
  const [meioEnvio, setMeioEnvio] = React.useState('');
  const [observacao, setObservacao] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Reset on open
  React.useEffect(() => {
    if (sol) {
      setMeioEnvio('');
      setObservacao('');
    }
  }, [sol]);

  const handleConfirm = async () => {
    if (!sol || !meioEnvio) return;
    setLoading(true);
    try {
      await onConfirm(sol, meioEnvio, observacao.trim() || undefined);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!sol} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Registrar Envio ao Fornecedor
          </DialogTitle>
          {sol && (
            <DialogDescription>
              Solicitação #{sol.protocolo}
            </DialogDescription>
          )}
        </DialogHeader>

        {sol && (sol.fornecedor_email_contato || sol.fornecedor_telefone_contato) && (
          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Contato do fornecedor</p>
            {sol.fornecedor_email_contato && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{sol.fornecedor_email_contato}</span>
              </div>
            )}
            {sol.fornecedor_telefone_contato && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{sol.fornecedor_telefone_contato}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Por onde a OC foi enviada? <span className="text-destructive">*</span></Label>
            <Select value={meioEnvio} onValueChange={setMeioEnvio}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o meio de envio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="E-mail">E-mail</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Correios">Correios</SelectItem>
                <SelectItem value="Entrega presencial">Entrega presencial</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              placeholder="Informações adicionais sobre o envio..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !meioEnvio}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar Envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
