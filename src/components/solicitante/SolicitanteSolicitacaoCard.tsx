import React from 'react';
import { Button } from '@/components/ui/button';
import { SolicitacaoCard, type SolicitacaoWithDetails } from '@/components/ui/SolicitacaoCard';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';
import { JuridicoTracker } from '@/components/JuridicoTracker';
import { FluigStatusCard } from '@/components/FluigStatusCard';
import { AnexoCard } from '@/components/AnexoCard';
import { CNAECompatibilityBadge } from '@/components/CNAECompatibilityBadge';
import { DescriptionQualityBadge } from '@/components/DescriptionQualityBadge';
import { UnreadMessageBanner } from '@/components/UnreadMessageBanner';
import type { DocumentoEmitido, DocumentoFiscal } from '@/types';
import {
  FileText, Edit, AlertTriangle, Copy, XCircle, Download,
  FileCheck, CheckCircle, MessageSquare, Receipt, Upload, UserCheck,
} from 'lucide-react';
import type { SolicitacaoComFornecedor, RejectionInfo, InfoRequest } from './types';

interface SolicitanteSolicitacaoCardProps {
  sol: SolicitacaoComFornecedor;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isOwner: boolean;
  viewMode: 'minhas' | 'empreendimento';
  effectiveUserId?: string;
  // Unread
  unreadInfo?: { count: number; lastSenderName?: string | null } | null;
  // Rejection/Info data
  rejectionReasons: Record<string, RejectionInfo>;
  infoRequests: Record<string, InfoRequest>;
  // Anexos
  anexosExpanded: Record<string, Array<{ id: string; tipo: string; nome_arquivo: string; storage_path: string; mime_type: string | null; tamanho_bytes: number | null }>>;
  fetchAnexosSolicitacao: (id: string) => void;
  // Handlers
  openEditModal: (sol: any) => void;
  openCancelModal: (sol: any) => void;
  openAceiteModal: (sol: SolicitacaoComFornecedor) => void;
  openNfBoletoModal: (sol: SolicitacaoComFornecedor) => void;
  handleDuplicate: (sol: SolicitacaoComFornecedor) => void;
  downloadDocumentoEmitido: (doc: DocumentoEmitido) => void;
  downloadDocumentoFiscal: (doc: DocumentoFiscal) => void;
  setAnexosViewSolicitacao: (sol: SolicitacaoComFornecedor) => void;
  setTransferSolicitacao: (sol: SolicitacaoComFornecedor) => void;
  setTransferOpen: (open: boolean) => void;
}

export const SolicitanteSolicitacaoCard = React.memo(function SolicitanteSolicitacaoCard({
  sol, isExpanded, onToggleExpand, isOwner, viewMode, effectiveUserId,
  unreadInfo, rejectionReasons, infoRequests, anexosExpanded, fetchAnexosSolicitacao,
  openEditModal, openCancelModal, openAceiteModal, openNfBoletoModal, handleDuplicate,
  downloadDocumentoEmitido, downloadDocumentoFiscal, setAnexosViewSolicitacao,
  setTransferSolicitacao, setTransferOpen,
}: SolicitanteSolicitacaoCardProps) {

  const canTakeAction = isOwner;
  const showOwnerBadge = viewMode === 'empreendimento' && !isOwner;

  // ---- Action Banner ----
  const renderActionBanner = () => {
    if (unreadInfo) {
      return <UnreadMessageBanner info={unreadInfo} onViewMessages={onToggleExpand} />;
    }
    if (!canTakeAction) return null;

    if (sol.status === 'aguardando_nf_boleto') {
      return (
        <div className="bg-[hsl(260,70%,50%)] text-white px-4 py-2 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <span className="font-semibold">INCLUIR NF E BOLETO</span>
            <span className="text-sm opacity-90">- Anexe a Nota Fiscal e o Boleto</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => openNfBoletoModal(sol)}
            className="bg-background hover:bg-background/90 text-foreground">
            <Upload className="h-4 w-4 mr-1" /> Incluir Documentos
          </Button>
        </div>
      );
    }

    if (sol.status === 'pendente_correcao') {
      return (
        <div className="bg-warning text-warning-foreground px-4 py-2 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">AÇÃO NECESSÁRIA</span>
            <span className="text-sm opacity-90">- Esta solicitação precisa de correção</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => openCancelModal(sol)}
              className="bg-white/80 text-destructive hover:bg-white/90 border border-destructive/30 shadow-sm">
              <XCircle className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => openEditModal(sol)}
              className="bg-white text-orange-700 hover:bg-white/90 border border-orange-300 shadow-sm">
              <Edit className="h-4 w-4 mr-1" /> Corrigir Agora
            </Button>
          </div>
        </div>
      );
    }

    if (sol.status === 'aguardando_aceite') {
      return (
        <div className="bg-success text-success-foreground px-4 py-2 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">OC DISPONÍVEL</span>
            <span className="text-sm opacity-90">- Visualize e libere para o fornecedor</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => openAceiteModal(sol)}
            className="bg-white text-green-700 hover:bg-white/90 border border-green-300 shadow-sm">
            <FileText className="h-4 w-4 mr-1" /> Visualizar OC
          </Button>
        </div>
      );
    }

    if (sol.status === 'aguardando_informacoes') {
      return (
        <div className="bg-info text-info-foreground px-4 py-2 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span className="font-semibold">INFORMAÇÕES SOLICITADAS</span>
            <span className="text-sm opacity-90">- O backoffice precisa de mais informações</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => openCancelModal(sol)}
              className="bg-white/80 text-destructive hover:bg-white/90 border border-destructive/30 shadow-sm">
              <XCircle className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => openEditModal(sol)}
              className="bg-white text-blue-700 hover:bg-white/90 border border-blue-300 shadow-sm">
              <Edit className="h-4 w-4 mr-1" /> Corrigir e Reenviar
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ---- Info Alert ----
  const renderInfoAlert = () => {
    const rejectionInfo = rejectionReasons[sol.id];
    const infoRequest = infoRequests[sol.id];

    if (sol.status === 'rejeitado' && rejectionInfo?.motivo) {
      return (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-destructive">Motivo da Reprovação:</p>
              <p className="text-sm text-muted-foreground mt-1">{rejectionInfo.motivo}</p>
            </div>
          </div>
        </div>
      );
    }

    if (sol.status === 'aguardando_informacoes' && infoRequest?.motivo) {
      return (
        <div className="mb-4 p-3 bg-info/10 border border-info/20 rounded-lg">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-5 w-5 text-info mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-info">Informações solicitadas:</p>
              <p className="text-sm text-muted-foreground mt-1">{infoRequest.motivo}</p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ---- Header Actions ----
  const renderHeaderActions = () => {
    const actions: React.ReactNode[] = [];

    actions.push(
      <Button key="anexos" variant="ghost" size="sm"
        onClick={() => {
          setAnexosViewSolicitacao(sol);
          if (!anexosExpanded[sol.id]) fetchAnexosSolicitacao(sol.id);
        }}
        className="text-muted-foreground">
        <FileText className="h-4 w-4 mr-1" /> Anexos
      </Button>
    );

    if (sol.status === 'rejeitado') {
      actions.push(
        <Button key="duplicar" variant="outline" size="sm" onClick={() => handleDuplicate(sol)} className="text-primary">
          <Copy className="h-4 w-4 mr-1" /> Duplicar
        </Button>
      );
    }

    if (viewMode === 'empreendimento' || sol.user_id === effectiveUserId) {
      actions.push(
        <Button key="transferir" variant="ghost" size="sm"
          onClick={() => { setTransferSolicitacao(sol); setTransferOpen(true); }}
          className="text-muted-foreground">
          <UserCheck className="h-4 w-4 mr-1" /> Transferir
        </Button>
      );
    }

    return <>{actions}</>;
  };

  // ---- Expanded Content ----
  const renderExpandedContent = () => {
    const fiscalNf = sol.documentosFiscais?.find(d => d.tipo === 'nota_fiscal');
    const fiscalBoleto = sol.documentosFiscais?.find(d => d.tipo === 'boleto');
    const solAnexos = anexosExpanded[sol.id];

    if (!solAnexos) fetchAnexosSolicitacao(sol.id);

    return (
      <>
        {sol.documentosEmitidos && sol.documentosEmitidos.length > 0 && (
          <div className="space-y-2">
            {sol.documentosEmitidos.map((doc: DocumentoEmitido) => (
              <div key={doc.id} className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-success" />
                    <span className="font-medium">{doc.tipo_documento} #{doc.numero_documento}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadDocumentoEmitido(doc)}>
                    <Download className="h-4 w-4 mr-1" /> Baixar
                  </Button>
                </div>
                {doc.observacao && (
                  <p className="text-sm text-muted-foreground mt-2 pl-7">
                    <span className="font-medium text-foreground">Obs:</span> {doc.observacao}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {(((sol as any).instrumento_juridico && (sol as any).instrumento_juridico !== 'oc') || (sol as any).numero_projuris) && (
          <JuridicoTracker solicitacaoId={sol.id} readOnly />
        )}

        {((sol as any).ia_cnae_status || (sol as any).ia_descricao_vaga !== null) && (
          <div className="space-y-2">
            <p className="font-medium text-sm text-muted-foreground">Validações IA</p>
            {(sol as any).ia_cnae_status && (sol as any).fornecedor_id && (
              <CNAECompatibilityBadge
                descricao={sol.descricao}
                fornecedor={sol.fornecedor ? {
                  cnae_principal_codigo: (sol.fornecedor as any).cnae_principal_codigo,
                  cnae_principal_descricao: (sol.fornecedor as any).cnae_principal_descricao,
                } as any : null}
                enabled={false}
                cachedResult={{
                  status: (sol as any).ia_cnae_status,
                  justificativa: (sol as any).ia_cnae_justificativa || ''
                }}
              />
            )}
            <DescriptionQualityBadge
              isVague={(sol as any).ia_descricao_vaga}
              suggestion={(sol as any).ia_descricao_sugestao}
            />
          </div>
        )}

        {solAnexos && solAnexos.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> Anexos da Solicitação ({solAnexos.length})
            </p>
            <div className="grid gap-2">
              {solAnexos.map((anexo) => <AnexoCard key={anexo.id} anexo={anexo} showTipo />)}
            </div>
          </div>
        )}

        {(fiscalNf || fiscalBoleto) && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <p className="font-medium text-sm">Documentos Fiscais Enviados:</p>
            {fiscalNf && (
              <div className="flex items-center justify-between text-sm">
                <span>Nota Fiscal: {fiscalNf.nome_arquivo}</span>
                <Button size="sm" variant="ghost" onClick={() => downloadDocumentoFiscal(fiscalNf)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
            {fiscalBoleto && (
              <div className="flex items-center justify-between text-sm">
                <span>Boleto: {fiscalBoleto.nome_arquivo}</span>
                <Button size="sm" variant="ghost" onClick={() => downloadDocumentoFiscal(fiscalBoleto)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        <SolicitacaoTimeline solicitacaoId={sol.id} />

        {sol.numero_chamado_fluig && sol.numero_chamado_fluig !== 'RM' && (
          <FluigStatusCard numeroChamadoFluig={sol.numero_chamado_fluig} />
        )}

        {sol.user_id === effectiveUserId && !['concluida', 'rejeitado', 'cancelado'].includes(sol.status) && (
          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => openCancelModal(sol)}>
              <XCircle className="h-4 w-4 mr-1" /> Cancelar Solicitação
            </Button>
          </div>
        )}
      </>
    );
  };

  // ---- Card className ----
  const getCardClassName = () => {
    if (sol.status === 'pendente_correcao' && canTakeAction) return 'border-2 border-warning bg-warning/5 shadow-lg';
    if (sol.status === 'rejeitado') return 'border-destructive/50';
    if (sol.status === 'aguardando_aceite' && canTakeAction) return 'border-2 border-success bg-success/5 shadow-lg';
    if (sol.status === 'aguardando_informacoes' && canTakeAction) return 'border-2 border-info bg-info/5 shadow-lg';
    if (sol.status === 'aguardando_nf_boleto' && canTakeAction) return 'border-2 border-[hsl(260,70%,50%)] bg-[hsl(260,70%,50%)]/5 shadow-lg';
    if (!isOwner && viewMode === 'empreendimento') return 'opacity-90';
    return '';
  };

  return (
    <SolicitacaoCard
      solicitacao={sol as SolicitacaoWithDetails}
      variant="detailed"
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      showOwnerBadge={showOwnerBadge}
      actionBanner={renderActionBanner()}
      headerActions={renderHeaderActions()}
      infoAlert={renderInfoAlert()}
      expandedContent={renderExpandedContent()}
      className={getCardClassName()}
    />
  );
});
