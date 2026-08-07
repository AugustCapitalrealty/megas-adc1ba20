import React, { memo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';
import { FluigStatusCard } from '@/components/FluigStatusCard';
import { UnreadMessageBanner } from '@/components/UnreadMessageBanner';
import { CorrectionDeadlineBadge } from '@/components/CorrectionDeadlineBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import type { SolicitacaoBackoffice } from '@/hooks/useBackofficeSolicitacoes';
import type { RequestStatus } from '@/types';
import { EMPREENDIMENTO_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { formatBR } from '@/lib/date-utils';
import { differenceInDays, differenceInHours } from 'date-fns';
import {
  Eye,
  Clock,
  AlertTriangle,
  Building2,
  User,
  Calendar,
  DollarSign,
  FileCheck,
  Cog,
  CheckCheck,
  CheckCircle,
  XCircle,
  HelpCircle,
  Send,
  ChevronDown,
  ChevronUp,
  History,
  Receipt,
  Edit,
  UserCheck,
  Package,
  Mail,
  Phone,
  MoreVertical,
  Copy,
  Undo2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────

export interface CardCallbacks {
  openDetails: (sol: SolicitacaoBackoffice) => void;
  openAction: (sol: SolicitacaoBackoffice, type: 'assumir' | 'rejeitar' | 'processar' | 'concluir' | 'solicitar_ajuste') => void;
  openRegistro: (sol: SolicitacaoBackoffice, mode?: 'new' | 'add') => void;
  openEditFluig: (sol: SolicitacaoBackoffice) => void;
  openEditProjuris: (sol: SolicitacaoBackoffice) => void;
  handleRegistrarEnvioFornecedor: (sol: SolicitacaoBackoffice) => void;
  handleConcluirLiberada: (sol: SolicitacaoBackoffice) => void;
  handleSolicitarCadastro: (sol: SolicitacaoBackoffice) => void;
  handleAprovarCancelamento: (sol: SolicitacaoBackoffice) => void;
  handleRejeitarCancelamento: (sol: SolicitacaoBackoffice) => void;
  handleReverterLiberacao: (sol: SolicitacaoBackoffice) => void;
  onToggleExpand: (id: string) => void;
  onTransfer: (sol: SolicitacaoBackoffice) => void;
  onViewNfBoleto: (sol: SolicitacaoBackoffice) => void;
  backofficeMarkAsRead: (id: string) => void;
  onToggleSelect?: (id: string) => void;
}

interface BackofficeSolicitacaoCardProps {
  sol: SolicitacaoBackoffice;
  userId: string | undefined;
  expandedId: string | null;
  cadastroStatus: 'solicitado' | 'concluido' | null | undefined;
  hasCancelamentoPendente: boolean;
  unreadInfo: any;
  actionLoading: boolean;
  cadastroLoading: boolean;
  cancelamentoActionLoading: boolean;
  callbacks: CardCallbacks;
  isSelected?: boolean;
}

// ── Helpers ────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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
  return { diasDesdeAbertura, tempoDesdeAbertura, diasDesdeAprovacao, horasDesdeAprovacao, tempoDesdeAprovacao, atrasadoAnalise, atrasadoEmissao };
}

// ── Component ──────────────────────────────────────────

export const BackofficeSolicitacaoCard = memo(function BackofficeSolicitacaoCard({
  sol,
  userId,
  expandedId,
  cadastroStatus: solCadastroStatus,
  hasCancelamentoPendente,
  unreadInfo,
  actionLoading,
  cadastroLoading,
  cancelamentoActionLoading,
  callbacks,
  isSelected,
}: BackofficeSolicitacaoCardProps) {
  const [emailCopied, setEmailCopied] = useState(false);
  const sla = getSLAInfo(sol);
  const isAtrasado = sla.atrasadoAnalise || sla.atrasadoEmissao;
  const isMyResponsibility = sol.responsavelId === userId;
  const hasFlugNumber = !!sol.numero_chamado_fluig;
  const awaitingOC = (sol.status === 'aprovado' || sol.status === 'em_processamento') && hasFlugNumber;
  const isExpanded = expandedId === sol.id;

  // Detect auto-cancelled by deadline (action contains "prazo" and "expirado")
  const isPrazoExpirado = (sol.status === 'rejeitado' || sol.status === 'cancelado') && sol.ultimaAcao && 
    (sol.ultimaAcao === 'prazo_correção_expirado' || sol.ultimaAcao === 'prazo_resposta_expirado');

  const isUtility = ['agua', 'energia_eletrica', 'telefone', 'taxa_impostos'].includes((sol as any).natureza_orcamentaria ?? '');

  const isFutureExecutionDate = (date: string | null | undefined) => {
    if (!date) return false;
    const today = new Date().toISOString().slice(0, 10);
    return date > today;
  };

  const formatDateOnlyBR = (date: string) => {
    const [year, month, day] = date.split('-');
    if (!year || !month || !day) return date;
    return `${day}/${month}/${year}`;
  };

  const showServicoAgendado = sol.status === 'aguardando_execucao' && !isUtility && isFutureExecutionDate(sol.data_execucao_servico);
  const showServicoExecutado = sol.status === 'aguardando_execucao' && (isUtility || (!!sol.data_execucao_servico && !isFutureExecutionDate(sol.data_execucao_servico)));

  // ── Chips row (condensed banners) ────────────────────
  const chips: React.ReactNode[] = [];
  if (isMyResponsibility) {
    chips.push(
      <Badge key="mine" variant="outline" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/20">
        <UserCheck className="h-3 w-3" /> Minha
      </Badge>
    );
  }
  if (awaitingOC) {
    chips.push(
      <Badge key="oc" variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 cursor-pointer" onClick={() => callbacks.openEditFluig(sol)}>
        <Cog className="h-3 w-3 animate-spin" />
        {sol.numero_chamado_fluig === 'RM' ? 'RM' : `Fluig: ${sol.numero_chamado_fluig}`}
        <Edit className="h-2.5 w-2.5" />
      </Badge>
    );
  }
  const postOCStatuses = ['aprovado','em_processamento','aguardando_aceite','oc_ac_emitida','liberado_fornecedor','enviado_fornecedor','aguardando_execucao','aguardando_nf_boleto','nf_boleto_enviados','enviado_pagamento','concluida'];
  const showProjurisChip = awaitingOC || postOCStatuses.includes(sol.status);
  if (showProjurisChip) {
    if (sol.numero_projuris) {
      chips.push(
        <Badge key="proj" variant="outline" className="text-[10px] gap-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700 cursor-pointer" onClick={() => callbacks.openEditProjuris(sol)}>
          Webdox: {sol.numero_projuris} <Edit className="h-2.5 w-2.5" />
        </Badge>
      );
    } else {
      chips.push(
        <Badge key="proj-add" variant="outline" className="text-[10px] gap-1 cursor-pointer border-dashed text-purple-600 border-purple-200 dark:text-purple-400 dark:border-purple-700" onClick={() => callbacks.openEditProjuris(sol)}>
          + Webdox
        </Badge>
      );
    }
  }
  if (sol.status === 'nf_boleto_enviados') {
    chips.push(
      <Badge key="nf" variant="outline" className="text-[10px] gap-1 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20">
        <Receipt className="h-3 w-3" /> NF Recebida
        {sol.total_docs_fiscais > 0 && <span>({sol.total_docs_fiscais})</span>}
      </Badge>
    );
  }
  if (showServicoAgendado && sol.data_execucao_servico) {
    chips.push(
      <Badge key="agendado" variant="outline" className="text-[10px] gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
        <Calendar className="h-3 w-3" /> Serviço agendado para {formatDateOnlyBR(sol.data_execucao_servico)}
      </Badge>
    );
  }

  if (showServicoExecutado && sol.data_execucao_servico) {
    chips.push(
      <Badge key="executado" variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
        <CheckCircle className="h-3 w-3" /> Serviço já executado em {formatDateOnlyBR(sol.data_execucao_servico)}
      </Badge>
    );
  }

  if (sol.emergencial) {
    chips.push(
      <Badge key="emerg" variant="destructive" className="text-[10px] gap-1">
        <AlertTriangle className="h-3 w-3" /> Emergencial
      </Badge>
    );
  }

  // Deadline badge for pendente_correcao / aguardando_informacoes
  if (['pendente_correcao', 'aguardando_informacoes'].includes(sol.status) && sol.data_pendente_correcao) {
    chips.push(
      <CorrectionDeadlineBadge
        key="deadline"
        dataPendenteCorrecao={sol.data_pendente_correcao}
        status={sol.status}
      />
    );
  }

  // Badge for auto-cancelled by deadline
  if (isPrazoExpirado) {
    chips.push(
      <Badge key="prazo" variant="destructive" className="text-[10px] gap-1">
        <Clock className="h-3 w-3" /> Cancelado por falta de resposta
      </Badge>
    );
  }

  // Badge for "Ajuste pedido pelo solicitante" — when solicitante requested OC adjustment
  if (sol.ultimaAcao === 'ajuste_solicitado' && sol.status === 'recebido') {
    chips.push(
      <Badge key="ajuste" variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
        <AlertTriangle className="h-3 w-3" /> Ajuste pedido pelo solicitante
      </Badge>
    );
  }

  // ── Primary action ───────────────────────────────────
  const renderPrimaryAction = () => {
    if (sol.status === 'recebido' || sol.status === 'em_analise') {
      return (
        <Button size="sm" onClick={() => callbacks.openAction(sol, 'assumir')}>
          <CheckCircle className="h-4 w-4 mr-1" /> Assumir
        </Button>
      );
    }
    if (sol.status === 'aprovado' || sol.status === 'em_processamento') {
      if (!hasFlugNumber) {
        return (
          <Button size="sm" onClick={() => callbacks.openAction(sol, 'processar')}>
            <Cog className="h-4 w-4 mr-1" /> Informar Lançamento
          </Button>
        );
      }
      return (
        <Button size="sm" onClick={() => callbacks.openRegistro(sol)}>
          <FileCheck className="h-4 w-4 mr-1" /> Registrar OC
        </Button>
      );
    }
    if (sol.status === 'liberado_fornecedor') {
      return (
        <Button size="sm" onClick={() => callbacks.handleRegistrarEnvioFornecedor(sol)} disabled={actionLoading}>
          <Send className="h-4 w-4 mr-1" /> Registrar Envio
        </Button>
      );
    }
    if (sol.status === 'aguardando_execucao') {
      return (
        <Button size="sm" onClick={() => callbacks.handleRegistrarEnvioFornecedor(sol)} disabled={actionLoading}>
          <Send className="h-4 w-4 mr-1" /> Registrar Envio
        </Button>
      );
    }
    if (sol.status === 'enviado_fornecedor') {
      return (
        <Button size="sm" onClick={() => callbacks.handleConcluirLiberada(sol)} disabled={actionLoading}>
          <CheckCheck className="h-4 w-4 mr-1" /> Concluir
        </Button>
      );
    }
    if (sol.status === 'nf_boleto_enviados') {
      return (
        <Button size="sm" onClick={() => callbacks.onViewNfBoleto(sol)}>
          <Send className="h-4 w-4 mr-1" /> Dar Baixa
        </Button>
      );
    }
    if (sol.status === 'oc_ac_emitida') {
      return (
        <Button size="sm" onClick={() => callbacks.openAction(sol, 'concluir')}>
          <CheckCheck className="h-4 w-4 mr-1" /> Concluir
        </Button>
      );
    }
    return null;
  };

  // ── Secondary dropdown items ─────────────────────────
  const secondaryItems: React.ReactNode[] = [];

  // Solicitar Ajuste
  if (['recebido', 'em_analise', 'aprovado', 'em_processamento', 'liberado_fornecedor'].includes(sol.status)) {
    secondaryItems.push(
      <DropdownMenuItem key="ajuste" onClick={() => callbacks.openAction(sol, 'solicitar_ajuste')}>
        <HelpCircle className="h-4 w-4 mr-2" /> Solicitar Ajuste
      </DropdownMenuItem>
    );
  }

  // Cadastro Contábil
  if (sol.status === 'aprovado' || sol.status === 'em_processamento') {
    if (solCadastroStatus !== 'concluido') {
      secondaryItems.push(
        <DropdownMenuItem key="cadastro" onClick={() => callbacks.handleSolicitarCadastro(sol)} disabled={cadastroLoading}>
          <Package className="h-4 w-4 mr-2" />
          {solCadastroStatus === 'solicitado' ? 'Cadastro Concluído' : 'Solicitar Cadastro'}
        </DropdownMenuItem>
      );
    }
  }

  // NF/Boleto ver
  if (sol.status === 'nf_boleto_enviados') {
    secondaryItems.push(
      <DropdownMenuItem key="nf" onClick={() => callbacks.onViewNfBoleto(sol)}>
        <Receipt className="h-4 w-4 mr-2" /> Ver NF/Boleto
      </DropdownMenuItem>
    );
  }

  // Transfer
  secondaryItems.push(
    <DropdownMenuItem key="transfer" onClick={() => callbacks.onTransfer(sol)}>
      <UserCheck className="h-4 w-4 mr-2" /> Transferir
    </DropdownMenuItem>
  );

  // Reverter Liberação (somente para solicitações já liberadas pelo solicitante,
  // antes de o backoffice efetivamente enviar ao fornecedor)
  if (sol.status === 'liberado_fornecedor' || sol.status === 'aguardando_execucao') {
    secondaryItems.push(<DropdownMenuSeparator key="sep-revert" />);
    secondaryItems.push(
      <DropdownMenuItem key="revert" onClick={() => callbacks.handleReverterLiberacao(sol)}>
        <Undo2 className="h-4 w-4 mr-2" /> Reverter Liberação
      </DropdownMenuItem>
    );
  }

  // Rejeitar
  if (['recebido', 'em_analise', 'aprovado', 'em_processamento'].includes(sol.status)) {
    secondaryItems.push(<DropdownMenuSeparator key="sep-reject" />);
    secondaryItems.push(
      <DropdownMenuItem key="reject" className="text-destructive focus:text-destructive" onClick={() => callbacks.openAction(sol, 'rejeitar')}>
        <XCircle className="h-4 w-4 mr-2" /> {sol.status === 'aprovado' || sol.status === 'em_processamento' ? 'Reprovar' : 'Rejeitar'}
      </DropdownMenuItem>
    );
  }

  return (
    <Card className={cn(
      'hover:shadow-md transition-shadow relative',
      isAtrasado && 'border-destructive border-2',
      isMyResponsibility && !isAtrasado && 'border-primary border-2 bg-primary/5',
      isSelected && 'ring-2 ring-primary/50'
    )}>
      {/* Selection Checkbox */}
      {callbacks.onToggleSelect && (
        <div className="absolute top-3 right-3 z-10">
          <Checkbox
            checked={!!isSelected}
            onCheckedChange={() => callbacks.onToggleSelect?.(sol.id)}
            aria-label={`Selecionar #${sol.protocolo}`}
          />
        </div>
      )}
      {/* Unread Message Banner */}
      {unreadInfo && (
        <UnreadMessageBanner
          info={unreadInfo}
          onViewMessages={() => {
            callbacks.onToggleExpand(sol.id);
            callbacks.backofficeMarkAsRead(sol.id);
          }}
        />
      )}

      {/* Cancelamento Pendente Banner */}
      {hasCancelamentoPendente && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-1.5 flex items-center gap-2 flex-wrap">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-xs font-medium text-destructive">CANCELAMENTO SOLICITADO</span>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" onClick={() => callbacks.handleAprovarCancelamento(sol)} disabled={cancelamentoActionLoading}>
              <CheckCircle className="h-3 w-3 mr-1" /> Aprovar
            </Button>
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => callbacks.handleRejeitarCancelamento(sol)} disabled={cancelamentoActionLoading}>
              <XCircle className="h-3 w-3 mr-1" /> Rejeitar
            </Button>
          </div>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Badge variant={sol.tipo === 'AC' ? 'default' : 'secondary'}>{sol.tipo}</Badge>
            <CardTitle className="text-lg">#{sol.protocolo}</CardTitle>
            <StatusBadge status={sol.status} />
            {sol.total_docs_emitidos > 0 && (
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                <FileCheck className="h-3 w-3 mr-1" />
                {sol.total_docs_emitidos} OC{sol.total_docs_emitidos > 1 ? 's' : ''}
              </Badge>
            )}
            {sol.responsavelNome && !isMyResponsibility && (
              <Badge variant="outline" className="text-xs">
                <User className="h-3 w-3 mr-1" /> {sol.responsavelNome}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {renderPrimaryAction()}
            {isAtrasado && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" /> SLA
              </Badge>
            )}
          </div>
        </div>

        {/* Chips row - condensed banners */}
        {chips.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1">{chips}</div>
        )}

        {/* Cadastro OK chip */}
        {solCadastroStatus === 'concluido' && (
          <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20 w-fit gap-1 mt-1">
            <CheckCircle className="h-3 w-3" /> Cadastro OK
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {/* Info grid */}
        <div className="grid gap-1.5 text-sm mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{sol.solicitante_nome || sol.solicitante_email || 'Usuário'}</span>
            </div>
            <div className="flex items-center gap-1 font-semibold text-primary">
              <DollarSign className="h-3.5 w-3.5" />
              <span>{formatCurrency(sol.valor)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              <span>{EMPREENDIMENTO_LABELS[sol.empreendimento]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatBR(sol.created_at, "dd/MM/yyyy")}</span>
            </div>
          </div>
        </div>

        {/* SLA badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge variant="outline" className={cn(
            "text-[10px] gap-1",
            sla.atrasadoAnalise
              ? "bg-destructive/10 text-destructive border-destructive/20"
              : sla.diasDesdeAbertura >= 3
                ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700"
                : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700"
          )}>
            <Clock className="h-3 w-3" />
            {sla.tempoDesdeAbertura} desde abertura
          </Badge>
          {sla.tempoDesdeAprovacao !== null && (
            <Badge variant="outline" className={cn(
              "text-[10px] gap-1",
              sla.atrasadoEmissao
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : (sla.diasDesdeAprovacao ?? 0) >= 2
                  ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700"
                  : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700"
            )}>
              <Clock className="h-3 w-3" />
              {sla.tempoDesdeAprovacao} desde assumido
            </Badge>
          )}
        </div>

        {/* Contato do fornecedor (collapsed into expand) */}
        {['liberado_fornecedor', 'enviado_fornecedor'].includes(sol.status) &&
         (sol.fornecedor_email_contato || sol.fornecedor_telefone_contato) && (
          <div className="mb-3 p-2.5 rounded-lg border border-success/30 bg-success/5 text-sm space-y-1">
            <p className="text-[10px] font-semibold text-success flex items-center gap-1">
              <Send className="h-3 w-3" /> Contato para envio
            </p>
            {sol.fornecedor_email_contato && (
              <div className="flex items-center gap-1.5">
                <a href={`mailto:${sol.fornecedor_email_contato}`} className="flex items-center gap-1.5 text-success hover:underline">
                  <Mail className="h-3 w-3" /> {sol.fornecedor_email_contato}
                </a>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-success/10 transition-colors"
                  aria-label="Copiar e-mail do fornecedor"
                  title={emailCopied ? 'Copiado!' : 'Copiar e-mail'}
                  onClick={() => {
                    navigator.clipboard.writeText(sol.fornecedor_email_contato || '');
                    setEmailCopied(true);
                    setTimeout(() => setEmailCopied(false), 2000);
                  }}
                >
                  {emailCopied
                    ? <CheckCircle className="h-3.5 w-3.5 text-success" />
                    : <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-success" />
                  }
                </button>
                {emailCopied && <span className="text-[10px] text-success font-medium">Copiado!</span>}
              </div>
            )}
            {sol.fornecedor_telefone_contato && (
              <a href={`tel:${sol.fornecedor_telefone_contato}`} className="flex items-center gap-1.5 text-success hover:underline">
                <Phone className="h-3 w-3" /> {sol.fornecedor_telefone_contato}
              </a>
            )}
          </div>
        )}

        {/* Action buttons row */}
        <div className="flex gap-2 items-center flex-wrap">
          <Button size="sm" variant="outline" onClick={() => callbacks.openDetails(sol)}>
            <Eye className="h-4 w-4 mr-1" /> Ver Detalhes
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              callbacks.onToggleExpand(sol.id);
              if (!isExpanded && unreadInfo) callbacks.backofficeMarkAsRead(sol.id);
            }}
          >
            <History className="h-4 w-4 mr-1" />
            Histórico
            {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>

          {/* Secondary actions dropdown */}
          {secondaryItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-auto">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {secondaryItems}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Description */}
        <div className="mt-3 pt-3 border-t">
          <ExpandableDescription description={sol.descricao} maxLength={100} className="text-muted-foreground" />
        </div>

        {/* Expanded History */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-6">
            {sol.numero_chamado_fluig && sol.numero_chamado_fluig !== 'RM' && (
              <FluigStatusCard numeroChamadoFluig={sol.numero_chamado_fluig} />
            )}
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Histórico da Solicitação
              </h4>
              <SolicitacaoTimeline solicitacaoId={sol.id} isBackoffice />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}, (prev, next) => {
  return (
    prev.sol.id === next.sol.id &&
    prev.sol.status === next.sol.status &&
    prev.sol.updated_at === next.sol.updated_at &&
    prev.expandedId === next.expandedId &&
    prev.cadastroStatus === next.cadastroStatus &&
    prev.hasCancelamentoPendente === next.hasCancelamentoPendente &&
    prev.unreadInfo === next.unreadInfo &&
    prev.userId === next.userId &&
    prev.isSelected === next.isSelected
  );
});
