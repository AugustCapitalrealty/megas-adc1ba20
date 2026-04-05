import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterBar } from '@/components/ui/FilterBar';
import { type Fornecedor, type CNAESecundario } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useBackofficeSolicitacoes, type SolicitacaoBackoffice } from '@/hooks/useBackofficeSolicitacoes';
import { useSolicitacaoDetalhes } from '@/hooks/useSolicitacaoDetalhes';
import { notifyOwnerOCEmitido } from '@/hooks/useNotificationEmail';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  EMPREENDIMENTO_LABELS, 
  NATUREZA_ORCAMENTARIA_LABELS,
  STATUS_LABELS,
  ANEXO_LABELS,
  type RequestStatus,
  type DocumentoEmitido,
  type DocumentoFiscal
} from '@/types';
import { 
  Loader2, CheckCircle, XCircle, Search, AlertTriangle, Download, Filter, ArrowUpDown,
} from 'lucide-react';
import { differenceInDays, differenceInHours } from 'date-fns';
import { formatBR } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { TransferOwnershipModal } from '@/components/TransferOwnershipModal';
import { exportToExcel } from '@/lib/export-utils';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

import { BackofficeSolicitacaoCard, type CardCallbacks } from '@/components/backoffice/BackofficeSolicitacaoCard';
import { BackofficeModals } from '@/components/backoffice/BackofficeModals';
import { BatchActionBar } from '@/components/backoffice/BatchActionBar';
import { ContextualEmptyState } from '@/components/ui/ContextualEmptyState';

// PDF validation types
interface PdfValidationResult {
  match: boolean;
  valorPdf: number | null;
  valorEsperado: number;
  diferenca: number | null;
}

type BackofficeTab = 'recebidas' | 'pendentes' | 'em_processamento' | 'oc_emitidas' | 'liberadas' | 'enviadas' | 'concluidas' | 'canceladas' | 'cancelamento_pendente';

export default function Backoffice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const track = useTrackEvent();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<string>('todos');
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<SolicitacaoBackoffice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<'assumir' | 'rejeitar' | 'processar' | 'concluir' | 'solicitar_ajuste'>('assumir');
  const [motivo, setMotivo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<BackofficeTab>('recebidas');
  const [numeroChamadoFluig, setNumeroChamadoFluig] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');

  // Use RPC-based hook for fetching with debounced search
  const { solicitacoes, loading, refetch: fetchSolicitacoes } = useBackofficeSolicitacoes({
    search: debouncedSearch || undefined,
    empreendimento: selectedEmpreendimento !== 'todos' ? selectedEmpreendimento as any : undefined,
  });

  // Use RPC for details
  const { detalhes, loading: detalhesLoading, fetchDetalhes, clearDetalhes } = useSolicitacaoDetalhes();

  // Registro OC Modal - Multiple OCs
  const [registroOpen, setRegistroOpen] = useState(false);
  const [registroMode, setRegistroMode] = useState<'new' | 'add'>('new'); // 'add' = adding to existing OCs without status change
  const [documentosOC, setDocumentosOC] = useState<Array<{
    numero: string;
    file: File | null;
    pdfValidation: PdfValidationResult | null;
    validating: boolean;
    confirmarDivergencia: boolean;
  }>>([{ numero: '', file: null, pdfValidation: null, validating: false, confirmarDivergencia: false }]);
  const [observacao, setObservacao] = useState('');
  const [registroLoading, setRegistroLoading] = useState(false);

  // Download ZIP
  const [downloadingZip, setDownloadingZip] = useState(false);
  
  // Expanded card for history
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // NF/Boleto Modal
  const [nfBoletoViewOpen, setNfBoletoViewOpen] = useState(false);
  const [baixaLoading, setBaixaLoading] = useState(false);

  // Edit Fluig/RM Modal
  const [editFluigOpen, setEditFluigOpen] = useState(false);
  const [editFluigValue, setEditFluigValue] = useState('');
  const [editFluigLoading, setEditFluigLoading] = useState(false);

  // Edit Projuris Modal
  const [editProjurisOpen, setEditProjurisOpen] = useState(false);
  const [editProjurisValue, setEditProjurisValue] = useState('');
  const [editProjurisLoading, setEditProjurisLoading] = useState(false);

  // Anexos com problema (para modal de solicitar ajuste)
  const [anexosComProblema, setAnexosComProblema] = useState<string[]>([]);
  const [anexosDisponiveis, setAnexosDisponiveis] = useState<Array<{ tipo: string; nome_arquivo: string }>>([]);

  // Solicitar/Concluir Cadastro Contábil
  const [cadastroLoading, setCadastroLoading] = useState(false);
  const [cadastroStatus, setCadastroStatus] = useState<Record<string, 'solicitado' | 'concluido' | null>>({});

  // Edit Fluig Cadastro Modal (separate from main Fluig)
  const [editFluigCadastroOpen, setEditFluigCadastroOpen] = useState(false);
  const [editFluigCadastroValue, setEditFluigCadastroValue] = useState('');
  const [editFluigCadastroLoading, setEditFluigCadastroLoading] = useState(false);
  const [editFluigCadastroSolId, setEditFluigCadastroSolId] = useState<string | null>(null);

  // Transfer modal state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferSolicitacao, setTransferSolicitacao] = useState<SolicitacaoBackoffice | null>(null);
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false);

  // Confirmation modal state (#4 improvement)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'baixa';
    sol: SolicitacaoBackoffice;
    title: string;
    description: string;
  } | null>(null);

  // Envio Fornecedor modal state
  const [envioFornecedorModal, setEnvioFornecedorModal] = useState<SolicitacaoBackoffice | null>(null);

  // Pagination state (#2 improvement)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Processed today counter (#6 PM improvement)
  const [processedToday, setProcessedToday] = useState(0);

  // Fetch details when opening details modal
  useEffect(() => {
    if (detailsOpen && selectedSolicitacao) {
      fetchDetalhes(selectedSolicitacao.id);
    } else if (!detailsOpen) {
      clearDetalhes();
    }
  }, [detailsOpen, selectedSolicitacao?.id, fetchDetalhes, clearDetalhes]);

  // Load cadastro status for visible solicitações (lazy loading)
  useEffect(() => {
    const loadCadastroStatus = async () => {
      const solsToCheck = solicitacoes.filter(s => 
        (s.status === 'aprovado' || s.status === 'em_processamento') && 
        cadastroStatus[s.id] === undefined
      );
      
      if (solsToCheck.length === 0) return;
      
      // Fetch all in one query
      const { data } = await supabase
        .from('historico_solicitacoes')
        .select('solicitacao_id, acao')
        .in('solicitacao_id', solsToCheck.map(s => s.id))
        .in('acao', ['Cadastro solicitado à Contabilidade', 'Cadastro concluído pela Contabilidade'])
        .order('created_at', { ascending: false });
      
      if (data) {
        const statusMap: Record<string, 'solicitado' | 'concluido' | null> = {};
        // Initialize all as null
        solsToCheck.forEach(s => statusMap[s.id] = null);
        
        // Set status based on most recent action for each solicitation
        const seen = new Set<string>();
        for (const row of data) {
          if (seen.has(row.solicitacao_id)) continue;
          seen.add(row.solicitacao_id);
          
          if (row.acao === 'Cadastro concluído pela Contabilidade') {
            statusMap[row.solicitacao_id] = 'concluido';
          } else if (row.acao === 'Cadastro solicitado à Contabilidade') {
            statusMap[row.solicitacao_id] = 'solicitado';
          }
        }
        
        setCadastroStatus(prev => ({ ...prev, ...statusMap }));
      }
    };
    
    loadCadastroStatus();
  }, [solicitacoes, cadastroStatus]);

  // Old N+1 fetch removed - now using useBackofficeSolicitacoes hook

  const updateStatus = async (id: string, newStatus: RequestStatus, motivoText?: string, anexosProblema?: string[]) => {
    setActionLoading(true);
    const sol = solicitacoes.find(s => s.id === id);
    
    const { error } = await supabase
      .from('solicitacoes')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      const acaoLabels: Record<string, string> = {
        'aprovado': 'Assumido pelo backoffice',
        'rejeitado': 'Rejeição',
        'pendente_correcao': 'Devolução para correção',
        'em_processamento': 'Envio para processamento',
        'aguardando_informacoes': 'Solicitação de informações',
        'concluida': 'Conclusão',
      };

      // Prepare insert object with anexos_com_problema if provided
      const historyInsert = {
        solicitacao_id: id,
        user_id: user!.id,
        acao: acaoLabels[newStatus] || 'Atualização de status',
        status_anterior: sol?.status,
        status_novo: newStatus,
        motivo: motivoText || null,
        // Add flagged attachments if provided
        ...(anexosProblema && anexosProblema.length > 0 && { anexos_com_problema: anexosProblema }),
      };

      await supabase.from('historico_solicitacoes').insert(historyInsert as any);

      // Google Chat notification for corrections
      if (newStatus === 'pendente_correcao' || newStatus === 'aguardando_informacoes') {
        try {
          const EMP_LABELS: Record<string, string> = {
            mega_curitiba: 'Mega Curitiba',
            mega_itajai: 'Mega Itajaí',
            mega_esteio: 'Mega Esteio',
            mega_canoas: 'Mega Canoas',
            todos: 'Todos',
          };
          await supabase.functions.invoke('gchat-notify-oc', {
            body: {
              tipo: 'correcao',
              protocolo: sol?.protocolo || '',
              empreendimento: EMP_LABELS[sol?.empreendimento || ''] || sol?.empreendimento || '',
              descricao: sol?.descricao || '',
              motivo: motivoText || 'Correção necessária',
              status: newStatus === 'pendente_correcao' ? 'Correção Necessária' : 'Aguardando Informações',
            },
          });
        } catch (e) {
          console.warn('GChat correction notification failed:', e);
        }
      }

      // Email notifications removed - only send for OC emission

      toast({ 
        title: 'Status atualizado!',
        description: `Solicitação ${STATUS_LABELS[newStatus].toLowerCase()}`,
        duration: 5000,
      });
      setProcessedToday(prev => prev + 1);
      track('action_taken', { action: actionType, status: newStatus, protocolo: selectedSolicitacao?.protocolo });
      fetchSolicitacoes();
      setActionOpen(false);
      setDetailsOpen(false);
      setMotivo('');
    } else {
      console.error('Error updating status:', error);
      toast({ 
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: `Não foi possível atualizar o status: ${error.message}`,
      });
    }
    setActionLoading(false);
  };

  const handleRegistrarOCAC = async () => {
    if (!selectedSolicitacao || !user) return;
    
    // Validate all OCs have number and file
    const validDocs = documentosOC.filter(d => d.numero && d.file);
    if (validDocs.length === 0) return;
    
    setRegistroLoading(true);
    try {
      const numeros: string[] = [];
      
      for (const doc of validDocs) {
        // Upload document
        const fileExt = doc.file!.name.split('.').pop();
        const filePath = `${selectedSolicitacao.id}/OC_${doc.numero}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documentos-emitidos')
          .upload(filePath, doc.file!);
        
        if (uploadError) throw uploadError;

        // Insert document record
        const { error: insertError } = await supabase
          .from('documentos_emitidos')
          .insert({
            solicitacao_id: selectedSolicitacao.id,
            tipo_documento: 'OC',
            numero_documento: doc.numero,
            storage_path: filePath,
            nome_arquivo: doc.file!.name,
            observacao: observacao || null,
            emitido_por: user.id,
          });

        if (insertError) throw insertError;
        numeros.push(doc.numero);
      }

      // Only change status if the solicitation is in aprovado/em_processamento (initial OC registration)
      const shouldChangeStatus = registroMode === 'new' && 
        ['aprovado', 'em_processamento'].includes(selectedSolicitacao.status);

      if (shouldChangeStatus) {
        const { error: updateError } = await supabase
          .from('solicitacoes')
          .update({ status: 'aguardando_aceite' as any })
          .eq('id', selectedSolicitacao.id);
        if (updateError) throw updateError;
      }

      // Create history entry
      const numerosStr = numeros.join(', ');
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: selectedSolicitacao.id,
        user_id: user.id,
        acao: shouldChangeStatus 
          ? `OC nº ${numerosStr} emitida(s) - Aguardando aceite`
          : `OC nº ${numerosStr} adicionada(s)`,
        status_anterior: selectedSolicitacao.status,
        status_novo: shouldChangeStatus ? 'aguardando_aceite' : selectedSolicitacao.status,
        motivo: `OC nº ${numerosStr} emitida(s)`,
      });

      // Send email notification for OC issued
      notifyOwnerOCEmitido(selectedSolicitacao.id, {
        protocolo: selectedSolicitacao.protocolo,
        documento_tipo: 'OC',
        documento_numero: numerosStr,
      });

      // Send Google Chat notification for OC issued
      supabase.functions.invoke('gchat-notify-oc', {
        body: {
          protocolo: selectedSolicitacao.protocolo,
          numeros_oc: numerosStr,
          valor: selectedSolicitacao.valor,
          descricao: selectedSolicitacao.descricao,
          empreendimento: selectedSolicitacao.empreendimento,
          fornecedor_razao: selectedSolicitacao.fornecedor_razao || null,
          solicitacao_id: selectedSolicitacao.id,
        },
      }).then(({ data, error }) => {
        if (error) {
          console.error('GChat OC notify error:', error);
          return;
        }

        if (data?.success && !data?.pdfIncluded) {
          console.warn('GChat OC sent without PDF:', data);
        }
      }).catch(err => console.error('GChat OC notify error:', err));

      toast({
        title: numeros.length > 1 ? `${numeros.length} OCs Registradas!` : 'OC Registrada!',
        description: `Número(s): ${numerosStr}`,
      });

      setRegistroOpen(false);
      setDetailsOpen(false);
      resetRegistroState();
      fetchSolicitacoes();
    } catch (error) {
      console.error('Error registering OC:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar',
        description: 'Não foi possível registrar o(s) documento(s)',
      });
    } finally {
      setRegistroLoading(false);
    }
  };

  const resetRegistroState = () => {
    setDocumentosOC([{ numero: '', file: null, pdfValidation: null, validating: false, confirmarDivergencia: false }]);
    setObservacao('');
    setRegistroMode('new');
  };

  // Validate PDF value against expected solicitation value (per OC index)
  const validatePdfValueForOC = async (file: File, valorEsperado: number, index: number) => {
    setDocumentosOC(prev => prev.map((d, i) => i === index ? { ...d, validating: true, pdfValidation: null, confirmarDivergencia: false } : d));

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const pdfBase64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('validate-oc-value', {
        body: { pdfBase64, valorEsperado }
      });

      if (error) {
        toast({ variant: 'destructive', title: 'Erro na validação', description: 'Não foi possível validar o documento automaticamente.' });
        setDocumentosOC(prev => prev.map((d, i) => i === index ? { ...d, pdfValidation: null, validating: false } : d));
      } else if (data) {
        setDocumentosOC(prev => prev.map((d, i) => i === index ? { ...d, pdfValidation: data as PdfValidationResult, validating: false } : d));
      }
    } catch (error) {
      console.error('[Backoffice] PDF validation exception:', error);
      toast({ variant: 'destructive', title: 'Erro na validação', description: 'Não foi possível validar o documento automaticamente.' });
      setDocumentosOC(prev => prev.map((d, i) => i === index ? { ...d, pdfValidation: null, validating: false } : d));
    }
  };

  // Handle PDF file selection for a specific OC index
  const handlePdfFileSelectForOC = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0] || null;
    setDocumentosOC(prev => prev.map((d, i) => i === index ? { ...d, file, pdfValidation: null, confirmarDivergencia: false } : d));

    if (file && selectedSolicitacao) {
      await validatePdfValueForOC(file, selectedSolicitacao.valor, index);
    }
  };

  // Check if all OCs can be submitted
  const canSubmitOC = useMemo(() => {
    const validDocs = documentosOC.filter(d => d.numero && d.file);
    if (validDocs.length === 0) return false;
    if (documentosOC.some(d => d.validating)) return false;
    
    // For docs with mismatch, require confirmation
    for (const doc of documentosOC) {
      if (doc.file && doc.numero) {
        if (doc.pdfValidation && !doc.pdfValidation.match && doc.pdfValidation.valorPdf !== null && !doc.confirmarDivergencia) {
          return false;
        }
      }
    }
    
    return true;
  }, [documentosOC]);

  // Reset OC modal state when closing
  const handleRegistroModalClose = (open: boolean) => {
    if (!open) {
      resetRegistroState();
    }
    setRegistroOpen(open);
  };

  const addOCRow = () => {
    setDocumentosOC(prev => [...prev, { numero: '', file: null, pdfValidation: null, validating: false, confirmarDivergencia: false }]);
  };

  const removeOCRow = (index: number) => {
    setDocumentosOC(prev => prev.filter((_, i) => i !== index));
  };

  const downloadAnexosZip = async (solicitacaoId: string, anexos: { storage_path: string; nome_arquivo: string }[], protocolo: string) => {
    if (!anexos || anexos.length === 0) {
      toast({ title: 'Nenhum anexo', description: 'Esta solicitação não possui anexos.' });
      return;
    }

    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      
      for (const anexo of anexos) {
        const { data, error } = await supabase.storage
          .from('anexos')
          .download(anexo.storage_path);
        
        if (!error && data) {
          zip.file(anexo.nome_arquivo, data);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `anexos_${protocolo}.zip`);
      
      toast({ title: 'Download concluído!', description: 'Anexos baixados com sucesso.' });
    } catch (error) {
      console.error('Error downloading ZIP:', error);
      toast({ variant: 'destructive', title: 'Erro no download', description: 'Não foi possível baixar os anexos.' });
    } finally {
      setDownloadingZip(false);
    }
  };

  const downloadDocumentoEmitido = async (doc: DocumentoEmitido) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos-emitidos')
        .download(doc.storage_path);
      
      if (!error && data) {
        saveAs(data, doc.nome_arquivo);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({ variant: 'destructive', title: 'Erro no download' });
    }
  };

  const downloadDocumentoFiscal = async (doc: DocumentoFiscal) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos-fiscais')
        .download(doc.storage_path);
      
      if (!error && data) {
        saveAs(data, doc.nome_arquivo);
      }
    } catch (error) {
      console.error('Error downloading fiscal document:', error);
      toast({ variant: 'destructive', title: 'Erro no download' });
    }
  };

  const handleDarBaixaConfirmed = async () => {
    if (!selectedSolicitacao || !user) return;
    
    setBaixaLoading(true);
    try {
      // Update status to enviado_pagamento
      await supabase
        .from('solicitacoes')
        .update({ status: 'enviado_pagamento' as any })
        .eq('id', selectedSolicitacao.id);

      // Update documentos_fiscais with baixa info
      await supabase
        .from('documentos_fiscais')
        .update({ 
          baixa_financeiro_em: new Date().toISOString(),
          baixa_financeiro_por: user.id 
        })
        .eq('solicitacao_id', selectedSolicitacao.id);

      // Add history entry
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: selectedSolicitacao.id,
        user_id: user.id,
        acao: 'Baixa para pagamento',
        status_anterior: selectedSolicitacao.status,
        status_novo: 'enviado_pagamento',
        motivo: 'NF e Boleto enviados para pagamento',
      });

      toast({
        title: 'Baixa realizada!',
        description: 'Documentos enviados para pagamento',
      });

      setNfBoletoViewOpen(false);
      setDetailsOpen(false);
      fetchSolicitacoes();
    } catch (error) {
      console.error('Error dar baixa:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível dar baixa',
      });
    } finally {
      setBaixaLoading(false);
    }
  };

  const handleRegistrarEnvioFornecedor = (sol: SolicitacaoBackoffice) => {
    setEnvioFornecedorModal(sol);
  };

  const handleRegistrarEnvioFornecedorConfirmed = async (sol: SolicitacaoBackoffice, meioEnvio: string, observacaoEnvio?: string) => {
    if (!user) return;
    
    setActionLoading(true);
    try {
      const statusAnterior = sol.status;
      await supabase
        .from('solicitacoes')
        .update({ 
          status: 'enviado_fornecedor' as any,
          data_enviado_fornecedor: new Date().toISOString(),
          enviado_fornecedor_por: user.id
        })
        .eq('id', sol.id);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: sol.id,
        user_id: user.id,
        acao: 'oc_enviada_fornecedor',
        status_anterior: statusAnterior,
        status_novo: 'enviado_fornecedor',
        motivo: `OC enviada via ${meioEnvio}${observacaoEnvio ? '. Obs: ' + observacaoEnvio : ''}`,
      });

      toast({
        title: 'Envio Registrado!',
        description: 'OC marcada como enviada ao fornecedor.',
      });

      fetchSolicitacoes();
    } catch (error) {
      console.error('Error registering envio:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível registrar o envio',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Concluir modal state
  const [concluirModal, setConcluirModal] = useState<SolicitacaoBackoffice | null>(null);

  const handleConcluirLiberada = (sol: SolicitacaoBackoffice) => {
    setConcluirModal(sol);
  };

  const handleConcluirLiberadaConfirmed = async (sol: SolicitacaoBackoffice) => {
    if (!user) return;
    
    setActionLoading(true);
    try {
      await supabase
        .from('solicitacoes')
        .update({ status: 'concluida' as any })
        .eq('id', sol.id);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: sol.id,
        user_id: user.id,
        acao: 'Conclusão',
        status_anterior: sol.status,
        status_novo: 'concluida',
        motivo: 'NF recebida e pagamento lançado no Fluig',
      });

      toast({
        title: 'Solicitação Concluída!',
        description: 'A solicitação foi finalizada com sucesso.',
      });

      fetchSolicitacoes();
    } catch (error) {
      console.error('Error concluding:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível concluir a solicitação',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openEditFluig = (sol: SolicitacaoBackoffice) => {
    setSelectedSolicitacao(sol);
    setEditFluigValue(sol.numero_chamado_fluig || '');
    setEditFluigOpen(true);
  };

  const handleSaveFluig = async () => {
    if (!selectedSolicitacao || !user) return;
    
    setEditFluigLoading(true);
    try {
      const previousValue = selectedSolicitacao.numero_chamado_fluig;
      const newValue = editFluigValue.trim() || null;
      
      const { error } = await supabase
        .from('solicitacoes')
        .update({ numero_chamado_fluig: newValue })
        .eq('id', selectedSolicitacao.id);

      if (error) throw error;

      // Register in history when Fluig number is added or changed
      if (newValue !== previousValue) {
        let acao = '';
        let motivo = '';
        
        if (!previousValue && newValue) {
          acao = 'numero_fluig_adicionado';
          motivo = newValue === 'RM' ? 'Número RM adicionado' : `Número Fluig #${newValue} adicionado`;
        } else if (previousValue && newValue) {
          acao = 'numero_fluig_alterado';
          motivo = `Número alterado de ${previousValue} para ${newValue}`;
        } else if (previousValue && !newValue) {
          acao = 'numero_fluig_removido';
          motivo = `Número ${previousValue} removido`;
        }
        
        await supabase.from('historico_solicitacoes').insert({
          solicitacao_id: selectedSolicitacao.id,
          user_id: user.id,
          acao,
          motivo,
          status_anterior: selectedSolicitacao.status,
          status_novo: selectedSolicitacao.status,
        });
      }

      toast({
        title: 'Fluig/RM atualizado',
        description: editFluigValue ? `Atualizado para: ${editFluigValue}` : 'Campo removido',
      });

      setEditFluigOpen(false);
      fetchSolicitacoes();
    } catch (error) {
      console.error('Error updating Fluig:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setEditFluigLoading(false);
    }
  };

  const openEditProjuris = (sol: SolicitacaoBackoffice) => {
    setSelectedSolicitacao(sol);
    setEditProjurisValue(sol.numero_projuris || '');
    setEditProjurisOpen(true);
  };

  const handleSaveProjuris = async () => {
    if (!selectedSolicitacao || !user) return;
    
    setEditProjurisLoading(true);
    try {
      const previousValue = selectedSolicitacao.numero_projuris;
      const newValue = editProjurisValue || null;
      
      const { error } = await supabase
        .from('solicitacoes')
        .update({ numero_projuris: newValue })
        .eq('id', selectedSolicitacao.id);

      if (error) throw error;

      // Register in history when Projuris number is added or changed
      if (newValue !== previousValue) {
        let acao = '';
        let motivo = '';
        
        if (!previousValue && newValue) {
          acao = 'numero_projuris_adicionado';
          motivo = `Número Projuris #${newValue} adicionado`;
        } else if (previousValue && newValue) {
          acao = 'numero_projuris_alterado';
          motivo = `Número Projuris alterado de ${previousValue} para ${newValue}`;
        } else if (previousValue && !newValue) {
          acao = 'numero_projuris_removido';
          motivo = `Número Projuris ${previousValue} removido`;
        }
        
        await supabase.from('historico_solicitacoes').insert({
          solicitacao_id: selectedSolicitacao.id,
          user_id: user.id,
          acao,
          motivo,
          status_anterior: selectedSolicitacao.status,
          status_novo: selectedSolicitacao.status,
        });
      }

      toast({
        title: 'Projuris atualizado',
        description: editProjurisValue ? `Atualizado para: ${editProjurisValue}` : 'Campo removido',
      });

      setEditProjurisOpen(false);
      fetchSolicitacoes();
    } catch (error) {
      console.error('Error updating Projuris:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setEditProjurisLoading(false);
    }
  };

  // Fetch cadastro status from history
  const getCadastroStatus = useCallback(async (solId: string): Promise<'solicitado' | 'concluido' | null> => {
    // Check if already cached
    if (cadastroStatus[solId] !== undefined) {
      return cadastroStatus[solId];
    }

    const { data } = await supabase
      .from('historico_solicitacoes')
      .select('acao')
      .eq('solicitacao_id', solId)
      .in('acao', ['Cadastro solicitado à Contabilidade', 'Cadastro concluído pela Contabilidade'])
      .order('created_at', { ascending: false })
      .limit(1);

    let status: 'solicitado' | 'concluido' | null = null;
    if (data && data.length > 0) {
      if (data[0].acao === 'Cadastro concluído pela Contabilidade') {
        status = 'concluido';
      } else if (data[0].acao === 'Cadastro solicitado à Contabilidade') {
        status = 'solicitado';
      }
    }

    setCadastroStatus(prev => ({ ...prev, [solId]: status }));
    return status;
  }, [cadastroStatus]);

  const handleSolicitarCadastro = async (sol: SolicitacaoBackoffice) => {
    if (!user) return;
    
    setCadastroLoading(true);
    try {
      const currentStatus = await getCadastroStatus(sol.id);
      
      if (!currentStatus) {
        // Primeira vez: Solicitar cadastro
        await supabase.from('historico_solicitacoes').insert({
          solicitacao_id: sol.id,
          user_id: user.id,
          acao: 'Cadastro solicitado à Contabilidade',
          status_anterior: sol.status,
          status_novo: sol.status,
          motivo: 'Solicitação de cadastro de produto/serviço enviada à Contabilidade',
        });
        
        setCadastroStatus(prev => ({ ...prev, [sol.id]: 'solicitado' }));
        
        toast({
          title: 'Cadastro Solicitado!',
          description: 'Solicitação enviada à Contabilidade.',
        });

        // Abrir modal Fluig de Cadastro automaticamente
        setEditFluigCadastroSolId(sol.id);
        setEditFluigCadastroValue('');
        setEditFluigCadastroOpen(true);
      } else if (currentStatus === 'solicitado') {
        // Segunda vez: Cadastro concluído
        await supabase.from('historico_solicitacoes').insert({
          solicitacao_id: sol.id,
          user_id: user.id,
          acao: 'Cadastro concluído pela Contabilidade',
          status_anterior: sol.status,
          status_novo: sol.status,
          motivo: 'Cadastro de produto/serviço concluído pela Contabilidade',
        });
        
        setCadastroStatus(prev => ({ ...prev, [sol.id]: 'concluido' }));
        
        toast({
          title: 'Cadastro Concluído!',
          description: 'Cadastro contábil finalizado.',
        });
      }
    } catch (error) {
      console.error('Error handling cadastro:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o cadastro',
      });
    } finally {
      setCadastroLoading(false);
    }
  };

  const handleSaveFluigCadastro = async () => {
    if (!editFluigCadastroSolId || !user) return;
    
    setEditFluigCadastroLoading(true);
    try {
      const newValue = editFluigCadastroValue.trim() || null;
      
      if (newValue) {
        const { error } = await supabase
          .from('solicitacoes')
          .update({ numero_fluig_cadastro: newValue } as any)
          .eq('id', editFluigCadastroSolId);

        if (error) throw error;

        // Find the sol to get its status
        const sol = solicitacoes.find(s => s.id === editFluigCadastroSolId);
        
        await supabase.from('historico_solicitacoes').insert({
          solicitacao_id: editFluigCadastroSolId,
          user_id: user.id,
          acao: 'fluig_cadastro_adicionado',
          motivo: `Fluig de cadastro #${newValue} adicionado`,
          status_anterior: sol?.status || null,
          status_novo: sol?.status || null,
        });
      }

      toast({
        title: 'Fluig de cadastro salvo',
        description: newValue ? `Cadastro Fluig: ${newValue}` : 'Salvo sem número Fluig',
      });

      setEditFluigCadastroOpen(false);
      fetchSolicitacoes();
    } catch (error) {
      console.error('Error saving Fluig cadastro:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setEditFluigCadastroLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  // Helper to build a Fornecedor object from solicitacao details for FornecedorCard
  const buildFornecedorFromDetalhes = (sol: NonNullable<typeof detalhes>['solicitacao']): Fornecedor => {
    // Parse cnaes_secundarios if it's a JSON string
    let cnaesSecundarios: CNAESecundario[] = [];
    if (sol.fornecedor_cnaes_secundarios) {
      if (Array.isArray(sol.fornecedor_cnaes_secundarios)) {
        cnaesSecundarios = sol.fornecedor_cnaes_secundarios;
      }
    }

    return {
      id: sol.fornecedor_id || '',
      cnpj: sol.fornecedor_cnpj || '',
      razao_social: sol.fornecedor_razao || null,
      nome_fantasia: sol.fornecedor_nome_fantasia || null,
      email: sol.fornecedor_email || null,
      telefone: sol.fornecedor_telefone || null,
      endereco: sol.fornecedor_endereco || null,
      cidade: sol.fornecedor_cidade || null,
      uf: sol.fornecedor_uf || null,
      is_mei: sol.fornecedor_is_mei || null,
      cep: sol.fornecedor_cep || null,
      bairro: sol.fornecedor_bairro || null,
      logradouro: sol.fornecedor_logradouro || null,
      numero: sol.fornecedor_numero || null,
      complemento: sol.fornecedor_complemento || null,
      cnae_principal_codigo: sol.fornecedor_cnae_principal_codigo || null,
      cnae_principal_descricao: sol.fornecedor_cnae_principal_descricao || null,
      cnaes_secundarios: cnaesSecundarios,
      situacao_cadastral: sol.fornecedor_situacao_cadastral || null,
      situacao_cadastral_descricao: sol.fornecedor_situacao_cadastral_descricao || null,
      data_situacao_cadastral: sol.fornecedor_data_situacao_cadastral || null,
      natureza_juridica: sol.fornecedor_natureza_juridica || null,
      porte: sol.fornecedor_porte || null,
      capital_social: sol.fornecedor_capital_social || null,
      data_inicio_atividade: sol.fornecedor_data_inicio_atividade || null,
      ultima_atualizacao_api: null,
      created_at: '',
      updated_at: '',
    };
  };

  // Helper to build a Fornecedor object from competitor data
  const buildConcorrenteFromDetalhes = (
    sol: NonNullable<typeof detalhes>['solicitacao'], 
    numero: 1 | 2
  ): Fornecedor | null => {
    const prefix = numero === 1 ? 'concorrente1' : 'concorrente2';
    const cnpj = sol[`${prefix}_cnpj` as keyof typeof sol] as string | undefined;
    
    if (!cnpj) return null;

    let cnaesSecundarios: CNAESecundario[] = [];
    const rawCnaes = sol[`${prefix}_cnaes_secundarios` as keyof typeof sol];
    if (rawCnaes && Array.isArray(rawCnaes)) {
      cnaesSecundarios = rawCnaes as CNAESecundario[];
    }

    return {
      id: (sol[`${prefix}_id` as keyof typeof sol] as string) || '',
      cnpj: cnpj,
      razao_social: (sol[`${prefix}_razao` as keyof typeof sol] as string) || null,
      nome_fantasia: (sol[`${prefix}_nome_fantasia` as keyof typeof sol] as string) || null,
      email: (sol[`${prefix}_email` as keyof typeof sol] as string) || null,
      telefone: (sol[`${prefix}_telefone` as keyof typeof sol] as string) || null,
      endereco: (sol[`${prefix}_endereco` as keyof typeof sol] as string) || null,
      cidade: (sol[`${prefix}_cidade` as keyof typeof sol] as string) || null,
      uf: (sol[`${prefix}_uf` as keyof typeof sol] as string) || null,
      is_mei: (sol[`${prefix}_is_mei` as keyof typeof sol] as boolean) || false,
      cep: (sol[`${prefix}_cep` as keyof typeof sol] as string) || null,
      bairro: (sol[`${prefix}_bairro` as keyof typeof sol] as string) || null,
      logradouro: (sol[`${prefix}_logradouro` as keyof typeof sol] as string) || null,
      numero: (sol[`${prefix}_numero` as keyof typeof sol] as string) || null,
      complemento: (sol[`${prefix}_complemento` as keyof typeof sol] as string) || null,
      cnae_principal_codigo: (sol[`${prefix}_cnae_principal_codigo` as keyof typeof sol] as number) || null,
      cnae_principal_descricao: (sol[`${prefix}_cnae_principal_descricao` as keyof typeof sol] as string) || null,
      cnaes_secundarios: cnaesSecundarios,
      situacao_cadastral: (sol[`${prefix}_situacao_cadastral` as keyof typeof sol] as number) || null,
      situacao_cadastral_descricao: (sol[`${prefix}_situacao_cadastral_descricao` as keyof typeof sol] as string) || null,
      data_situacao_cadastral: (sol[`${prefix}_data_situacao_cadastral` as keyof typeof sol] as string) || null,
      natureza_juridica: (sol[`${prefix}_natureza_juridica` as keyof typeof sol] as string) || null,
      porte: (sol[`${prefix}_porte` as keyof typeof sol] as string) || null,
      capital_social: (sol[`${prefix}_capital_social` as keyof typeof sol] as number) || null,
      data_inicio_atividade: (sol[`${prefix}_data_inicio_atividade` as keyof typeof sol] as string) || null,
      ultima_atualizacao_api: null,
      created_at: '',
      updated_at: '',
    };
  };

  const openDetails = (sol: SolicitacaoBackoffice) => {
    setSelectedSolicitacao(sol);
    setDetailsOpen(true);
  };

  const openAction = async (sol: SolicitacaoBackoffice, type: typeof actionType) => {
    setSelectedSolicitacao(sol);
    setActionType(type);
    setMotivo('');
    setAnexosComProblema([]);
    setAnexosDisponiveis([]);
    
    // Se for solicitar ajuste, buscar anexos da solicitação
    if (type === 'solicitar_ajuste') {
      const { data: anexos } = await supabase
        .from('anexos')
        .select('tipo, nome_arquivo')
        .eq('solicitacao_id', sol.id);
      
      if (anexos) {
        setAnexosDisponiveis(anexos);
      }
    }
    
    setActionOpen(true);
  };

  const openRegistro = (sol: SolicitacaoBackoffice, mode: 'new' | 'add' = 'new') => {
    setSelectedSolicitacao(sol);
    resetRegistroState();
    setRegistroMode(mode);
    setRegistroOpen(true);
  };

  const handleAction = async () => {
    if (!selectedSolicitacao || !user) return;
    
    const statusMap: Record<string, RequestStatus> = {
      'assumir': 'aprovado',
      'rejeitar': 'rejeitado',
      'processar': 'em_processamento',
      'concluir': 'concluida',
      'solicitar_ajuste': 'aguardando_informacoes',
    };
    
    // If processing, also save the Fluig number and register in history
    if (actionType === 'processar' && numeroChamadoFluig) {
      await supabase
        .from('solicitacoes')
        .update({ numero_chamado_fluig: numeroChamadoFluig })
        .eq('id', selectedSolicitacao.id);
      
      // Register Fluig number in history
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: selectedSolicitacao.id,
        user_id: user.id,
        acao: 'numero_fluig_adicionado',
        motivo: numeroChamadoFluig === 'RM' ? 'Número RM adicionado' : `Número Fluig #${numeroChamadoFluig} adicionado`,
        status_anterior: selectedSolicitacao.status,
        status_novo: selectedSolicitacao.status,
      });
    }
    
    // Pass anexos com problema for solicitar_ajuste action
    const anexosToPass = actionType === 'solicitar_ajuste' && anexosComProblema.length > 0 
      ? anexosComProblema 
      : undefined;
    
    updateStatus(selectedSolicitacao.id, statusMap[actionType], motivo, anexosToPass);
    setNumeroChamadoFluig('');
    setAnexosComProblema([]);
  };

  // Vendor filter state
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('todos');

  // Get unique vendors from current data
  const uniqueVendors = useMemo(() => {
    const vendors = new Map<string, string>();
    solicitacoes.forEach(s => {
      if (s.fornecedor_razao) {
        vendors.set(s.fornecedor_razao, s.fornecedor_razao);
      }
    });
    return [...vendors.values()].sort();
  }, [solicitacoes]);

  // Filter solicitacoes - search already handled by RPC, but we can still do local filtering
  const filteredSolicitacoes = useMemo(() => {
    let filtered = solicitacoes;
    
    // Additional local filter for "mine only"
    if (showOnlyMine) {
      filtered = filtered.filter(sol => sol.responsavelId === user?.id);
    }

    // Filter by vendor
    if (selectedFornecedor !== 'todos') {
      filtered = filtered.filter(sol => sol.fornecedor_razao === selectedFornecedor);
    }
    
    return filtered;
  }, [solicitacoes, showOnlyMine, user?.id, selectedFornecedor]);

  // Unread messages for backoffice
  const backofficeSolIds = useMemo(() => solicitacoes.map(s => s.id), [solicitacoes]);
  const { unreadMap: backofficeUnreadMap, markAsRead: backofficeMarkAsRead } = useUnreadMessages({
    solicitacaoIds: backofficeSolIds,
    userId: user?.id,
    isBackoffice: true,
  });

  // Count my responsibilities
  const myResponsibilityCount = useMemo(() => 
    solicitacoes.filter(s => 
      s.responsavelId === user?.id && 
      !['concluida', 'rejeitado'].includes(s.status)
    ).length
  , [solicitacoes, user?.id]);

  // Cancelamento pendente state
  const [cancelamentoPendenteIds, setCancelamentoPendenteIds] = useState<Set<string>>(new Set());
  const [cancelamentoActionLoading, setCancelamentoActionLoading] = useState(false);

  // Fetch cancelamento_pendente flags
  useEffect(() => {
    const fetchCancelamentoPendente = async () => {
      const { data } = await supabase
        .from('solicitacoes')
        .select('id')
        .eq('cancelamento_pendente', true);
      if (data) {
        setCancelamentoPendenteIds(new Set(data.map((d: any) => d.id)));
      }
    };
    if (solicitacoes.length > 0) fetchCancelamentoPendente();
  }, [solicitacoes]);

  const handleAprovarCancelamento = async (sol: SolicitacaoBackoffice) => {
    if (!user) return;
    setCancelamentoActionLoading(true);
    try {
      await supabase
        .from('solicitacoes')
        .update({ status: 'cancelado' as any, cancelamento_pendente: false } as any)
        .eq('id', sol.id);

      await supabase.from('oc_acompanhamento' as any).insert({
        solicitacao_id: sol.id,
        tipo_acao: 'cancelamento_aprovado',
        justificativa: 'Cancelamento aprovado pelo backoffice',
        user_id: user.id,
      } as any);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: sol.id,
        user_id: user.id,
        acao: 'cancelamento_aprovado',
        status_anterior: sol.status,
        status_novo: 'cancelado',
        motivo: 'Cancelamento aprovado pelo backoffice',
      });

      toast({ title: 'Cancelamento aprovado', description: `Solicitação #${sol.protocolo} cancelada.` });
      fetchSolicitacoes();
    } catch (error) {
      console.error('Error approving cancellation:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível aprovar o cancelamento.' });
    } finally {
      setCancelamentoActionLoading(false);
    }
  };

  const handleRejeitarCancelamento = async (sol: SolicitacaoBackoffice) => {
    if (!user) return;
    setCancelamentoActionLoading(true);
    try {
      await supabase
        .from('solicitacoes')
        .update({ cancelamento_pendente: false } as any)
        .eq('id', sol.id);

      await supabase.from('oc_acompanhamento' as any).insert({
        solicitacao_id: sol.id,
        tipo_acao: 'cancelamento_rejeitado',
        justificativa: 'Cancelamento rejeitado pelo backoffice',
        user_id: user.id,
      } as any);

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: sol.id,
        user_id: user.id,
        acao: 'cancelamento_rejeitado',
        status_anterior: sol.status,
        status_novo: sol.status,
        motivo: 'Cancelamento rejeitado pelo backoffice',
      });

      toast({ title: 'Cancelamento rejeitado', description: `Solicitação #${sol.protocolo} mantida.` });
      fetchSolicitacoes();
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível rejeitar o cancelamento.' });
    } finally {
      setCancelamentoActionLoading(false);
    }
  };

  // Group by tab - reordered as requested
  const groupedSolicitacoes = useMemo(() => ({
    recebidas: filteredSolicitacoes.filter(s => s.status === 'recebido' || s.status === 'em_analise'),
    em_processamento: filteredSolicitacoes.filter(s => s.status === 'aprovado' || s.status === 'em_processamento'),
    oc_emitidas: filteredSolicitacoes.filter(s => s.status === 'oc_ac_emitida' || s.status === 'aguardando_aceite'),
    liberadas: filteredSolicitacoes.filter(s => s.status === 'liberado_fornecedor' || s.status === 'aguardando_execucao'),
    enviadas: filteredSolicitacoes.filter(s => 
      s.status === 'enviado_fornecedor' ||
      s.status === 'aguardando_nf_boleto' || s.status === 'nf_boleto_enviados'
    ),
    pendentes: filteredSolicitacoes.filter(s => s.status === 'pendente_correcao' || s.status === 'aguardando_informacoes'),
    concluidas: filteredSolicitacoes.filter(s => s.status === 'concluida' || s.status === 'enviado_pagamento'),
    canceladas: filteredSolicitacoes.filter(s => s.status === 'rejeitado' || s.status === 'cancelado'),
    cancelamento_pendente: filteredSolicitacoes.filter(s => cancelamentoPendenteIds.has(s.id)),
  }), [filteredSolicitacoes, cancelamentoPendenteIds]);

  // SLA calculation (used in details modal)
  const getSLAInfo = (sol: SolicitacaoBackoffice) => {
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
  };

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Check if all selected can be bulk-assigned (recebido or em_analise only)
  const canBulkAssign = useMemo(() => {
    if (selectedIds.size === 0) return false;
    return [...selectedIds].every(id => {
      const sol = solicitacoes.find(s => s.id === id);
      return sol && ['recebido', 'em_analise'].includes(sol.status);
    });
  }, [selectedIds, solicitacoes]);

  const handleBulkAssign = async () => {
    if (!user) return;
    setBulkAssignLoading(true);
    try {
      for (const id of selectedIds) {
        const sol = solicitacoes.find(s => s.id === id);
        if (!sol || !['recebido', 'em_analise'].includes(sol.status)) continue;
        await supabase.from('solicitacoes').update({ status: 'aprovado' as any }).eq('id', id);
        await supabase.from('historico_solicitacoes').insert({
          solicitacao_id: id,
          user_id: user.id,
          acao: 'Assumido pelo backoffice',
          status_anterior: sol.status,
          status_novo: 'aprovado',
        });
      }
      toast({ title: `${selectedIds.size} solicitações assumidas!`, duration: 5000 });
      setSelectedIds(new Set());
      fetchSolicitacoes();
    } catch (error) {
      console.error('Bulk assign error:', error);
      toast({ variant: 'destructive', title: 'Erro ao assumir em lote' });
    } finally {
      setBulkAssignLoading(false);
    }
  };

  const handleBulkExport = () => {
    const items = solicitacoes.filter(s => selectedIds.has(s.id));
    exportToExcel(items, 'backoffice_selecionadas');
  };

  const handleBulkTransfer = () => {
    if (selectedIds.size === 0) return;
    setTransferSolicitacao(null);
    setBulkTransferOpen(true);
  };

  // Card callbacks (stable ref)
  const cardCallbacks = useMemo<CardCallbacks>(() => ({
    openDetails,
    openAction,
    openRegistro,
    openEditFluig,
    openEditProjuris,
    handleRegistrarEnvioFornecedor,
    handleConcluirLiberada,
    handleSolicitarCadastro,
    handleAprovarCancelamento,
    handleRejeitarCancelamento,
    onToggleExpand: (id: string) => {
      const newExpanded = expandedId === id ? null : id;
      setExpandedId(newExpanded);
      if (newExpanded && backofficeUnreadMap[id]) {
        backofficeMarkAsRead(id);
      }
    },
    onTransfer: (sol: SolicitacaoBackoffice) => {
      setTransferSolicitacao(sol);
      setTransferOpen(true);
    },
    onViewNfBoleto: (sol: SolicitacaoBackoffice) => {
      setSelectedSolicitacao(sol);
      setNfBoletoViewOpen(true);
    },
    backofficeMarkAsRead,
    onToggleSelect: toggleSelect,
  }), [expandedId, backofficeUnreadMap, backofficeMarkAsRead, toggleSelect]);

  // Reset page on tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Get active tab items for pagination
  const getActiveTabItems = useCallback((): SolicitacaoBackoffice[] => {
    return groupedSolicitacoes[activeTab] || [];
  }, [groupedSolicitacoes, activeTab]);

  const TabContent = ({ items, emptyMessage }: { items: SolicitacaoBackoffice[], emptyMessage: string }) => {
    const sortedItems = [...items].sort((a, b) => {
      const dateA = new Date(sortBy === 'created_at' ? a.created_at : a.updated_at).getTime();
      const dateB = new Date(sortBy === 'created_at' ? b.created_at : b.updated_at).getTime();
      return dateB - dateA;
    });
    const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
    const paginatedItems = sortedItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    
    return (
      <div className="space-y-4">
        {items.length === 0 ? (
          <ContextualEmptyState tab={activeTab} variant="backoffice" />
        ) : (
          <>
            {paginatedItems.map((sol) => (
              <BackofficeSolicitacaoCard
                key={sol.id}
                sol={sol}
                userId={user?.id}
                expandedId={expandedId}
                cadastroStatus={cadastroStatus[sol.id]}
                hasCancelamentoPendente={cancelamentoPendenteIds.has(sol.id)}
                unreadInfo={backofficeUnreadMap[sol.id]}
                actionLoading={actionLoading}
                cadastroLoading={cadastroLoading}
                cancelamentoActionLoading={cancelamentoActionLoading}
                callbacks={cardCallbacks}
                isSelected={selectedIds.has(sol.id)}
              />
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, items.length)} de {items.length}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-10 rounded" />
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-32 rounded" />
                </div>
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground animate-pulse">
          Carregando solicitações...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Backoffice</h1>
            <p className="text-muted-foreground">Gerencie as solicitações de AC e OC</p>
          </div>
          {processedToday > 0 && (
            <Badge variant="secondary" className="text-sm gap-1.5 px-3 py-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-primary" />
              {processedToday} processada{processedToday > 1 ? 's' : ''} hoje
            </Badge>
          )}
        </div>


        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por protocolo, descrição ou solicitante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedEmpreendimento} onValueChange={setSelectedEmpreendimento}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Empreendimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="mega_curitiba">Mega Curitiba</SelectItem>
                  <SelectItem value="mega_itajai">Mega Itajaí</SelectItem>
                  <SelectItem value="mega_esteio">Mega Esteio</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Fornecedores</SelectItem>
                  {uniqueVendors.map((v) => (
                    <SelectItem key={v} value={v}>{v.length > 30 ? v.slice(0, 30) + '…' : v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant={showOnlyMine ? "default" : "outline"} 
                onClick={() => setShowOnlyMine(!showOnlyMine)}
                className="w-full md:w-auto"
              >
                <Filter className="h-4 w-4 mr-2" />
                Minhas ({myResponsibilityCount})
              </Button>
              <Button
                variant="outline"
                onClick={() => exportToExcel(getActiveTabItems(), `backoffice_${activeTab}`)}
                disabled={getActiveTabItems().length === 0}
                className="w-full md:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button
                variant={sortBy === 'updated_at' ? 'default' : 'outline'}
                onClick={() => setSortBy(prev => prev === 'created_at' ? 'updated_at' : 'created_at')}
                className="w-full md:w-auto"
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {sortBy === 'created_at' ? 'Abertura' : 'Última alteração'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Unified Filter Bar with Groups */}
        <FilterBar
          tabGroups={[
            {
              id: 'em_andamento',
              label: 'Em Andamento',
              tabs: [
                { id: 'recebidas', label: 'Recebidas', count: groupedSolicitacoes.recebidas.length },
                { id: 'em_processamento', label: 'Em Proc.', count: groupedSolicitacoes.em_processamento.length },
                { id: 'oc_emitidas', label: 'OC Emitida', count: groupedSolicitacoes.oc_emitidas.length, variant: 'success' as const, showCountWhenZero: false },
                { id: 'liberadas', label: 'Liberadas', count: groupedSolicitacoes.liberadas.length, variant: 'default' as const, showCountWhenZero: false },
                { id: 'enviadas', label: 'Enviadas', count: groupedSolicitacoes.enviadas.length, variant: 'purple' as const, showCountWhenZero: false },
              ],
            },
            {
              id: 'acoes_pendentes',
              label: 'Ações Pendentes',
              icon: <AlertTriangle className="h-3 w-3" />,
              labelClassName: 'text-warning',
              tabs: [
                { id: 'pendentes', label: 'Correções', count: groupedSolicitacoes.pendentes.length, variant: 'warning' as const, icon: <AlertTriangle className="h-3.5 w-3.5" />, showCountWhenZero: false },
                { id: 'cancelamento_pendente', label: 'Cancel. Pendente', count: groupedSolicitacoes.cancelamento_pendente.length, variant: 'destructive' as const, icon: <XCircle className="h-3.5 w-3.5" />, showCountWhenZero: false },
              ],
            },
            {
              id: 'finalizadas',
              label: 'Finalizadas',
              tabs: [
                { id: 'canceladas', label: 'Canceladas', count: groupedSolicitacoes.canceladas.length },
                { id: 'concluidas', label: 'Concluídas', count: groupedSolicitacoes.concluidas.length, variant: 'success' as const },
              ],
            },
          ]}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab as BackofficeTab);
            setCurrentPage(1);
            document.getElementById('backoffice-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />

        {/* Tab Content */}
        <div id="backoffice-list" className="space-y-4">
          {activeTab === 'recebidas' && (
            <TabContent items={groupedSolicitacoes.recebidas} emptyMessage="Nenhuma solicitação recebida" />
          )}
          {activeTab === 'pendentes' && (
            <TabContent items={groupedSolicitacoes.pendentes} emptyMessage="Nenhuma solicitação pendente de correção" />
          )}
          {activeTab === 'em_processamento' && (
            <TabContent items={groupedSolicitacoes.em_processamento} emptyMessage="Nenhuma solicitação em processamento" />
          )}
          {activeTab === 'oc_emitidas' && (
            <TabContent items={groupedSolicitacoes.oc_emitidas} emptyMessage="Nenhuma OC emitida" />
          )}
          {activeTab === 'liberadas' && (
            <TabContent items={groupedSolicitacoes.liberadas} emptyMessage="Nenhuma solicitação liberada" />
          )}
          {activeTab === 'enviadas' && (
            <TabContent items={groupedSolicitacoes.enviadas} emptyMessage="Nenhuma solicitação enviada" />
          )}
          {activeTab === 'concluidas' && (
            <TabContent items={groupedSolicitacoes.concluidas} emptyMessage="Nenhuma solicitação concluída" />
          )}
          {activeTab === 'canceladas' && (
            <TabContent items={groupedSolicitacoes.canceladas} emptyMessage="Nenhuma solicitação cancelada" />
          )}
          {activeTab === 'cancelamento_pendente' && (
            <TabContent items={groupedSolicitacoes.cancelamento_pendente} emptyMessage="Nenhum cancelamento pendente de aprovação" />
          )}
        </div>
      </div>

      {/* BackofficeModals — all modals extracted */}
      <BackofficeModals
        detailsOpen={detailsOpen}
        setDetailsOpen={setDetailsOpen}
        selectedSolicitacao={selectedSolicitacao}
        detalhes={detalhes}
        detalhesLoading={detalhesLoading}
        downloadingZip={downloadingZip}
        downloadAnexosZip={downloadAnexosZip}
        downloadDocumentoEmitido={downloadDocumentoEmitido}
        downloadDocumentoFiscal={downloadDocumentoFiscal}
        buildFornecedorFromDetalhes={buildFornecedorFromDetalhes}
        buildConcorrenteFromDetalhes={buildConcorrenteFromDetalhes}
        formatCurrency={formatCurrency}
        formatCNPJ={formatCNPJ}
        openAction={openAction}
        openRegistro={openRegistro}
        actionOpen={actionOpen}
        setActionOpen={setActionOpen}
        actionType={actionType}
        motivo={motivo}
        setMotivo={setMotivo}
        actionLoading={actionLoading}
        handleAction={handleAction}
        numeroChamadoFluig={numeroChamadoFluig}
        setNumeroChamadoFluig={setNumeroChamadoFluig}
        anexosDisponiveis={anexosDisponiveis}
        anexosComProblema={anexosComProblema}
        setAnexosComProblema={setAnexosComProblema}
        registroOpen={registroOpen}
        handleRegistroModalClose={handleRegistroModalClose}
        registroMode={registroMode}
        documentosOC={documentosOC}
        setDocumentosOC={setDocumentosOC}
        observacao={observacao}
        setObservacao={setObservacao}
        registroLoading={registroLoading}
        canSubmitOC={canSubmitOC}
        handleRegistrarOCAC={handleRegistrarOCAC}
        addOCRow={addOCRow}
        removeOCRow={removeOCRow}
        handlePdfFileSelectForOC={handlePdfFileSelectForOC}
        nfBoletoViewOpen={nfBoletoViewOpen}
        setNfBoletoViewOpen={setNfBoletoViewOpen}
        baixaLoading={baixaLoading}
        editFluigOpen={editFluigOpen}
        setEditFluigOpen={setEditFluigOpen}
        editFluigValue={editFluigValue}
        setEditFluigValue={setEditFluigValue}
        editFluigLoading={editFluigLoading}
        handleSaveFluig={handleSaveFluig}
        editFluigCadastroOpen={editFluigCadastroOpen}
        setEditFluigCadastroOpen={setEditFluigCadastroOpen}
        editFluigCadastroValue={editFluigCadastroValue}
        setEditFluigCadastroValue={setEditFluigCadastroValue}
        editFluigCadastroLoading={editFluigCadastroLoading}
        handleSaveFluigCadastro={handleSaveFluigCadastro}
        editProjurisOpen={editProjurisOpen}
        setEditProjurisOpen={setEditProjurisOpen}
        editProjurisValue={editProjurisValue}
        setEditProjurisValue={setEditProjurisValue}
        editProjurisLoading={editProjurisLoading}
        handleSaveProjuris={handleSaveProjuris}
        confirmAction={confirmAction}
        setConfirmAction={setConfirmAction}
        handleDarBaixaConfirmed={handleDarBaixaConfirmed}
        concluirModal={concluirModal}
        setConcluirModal={setConcluirModal}
        handleConcluirLiberadaConfirmed={handleConcluirLiberadaConfirmed}
        envioFornecedorModal={envioFornecedorModal}
        setEnvioFornecedorModal={setEnvioFornecedorModal}
        handleRegistrarEnvioFornecedorConfirmed={handleRegistrarEnvioFornecedorConfirmed}
      />

      {/* Bulk Transfer Ownership Modal */}
      {selectedIds.size > 0 && (
        <TransferOwnershipModal
          open={bulkTransferOpen}
          onOpenChange={setBulkTransferOpen}
          solicitacaoIds={[...selectedIds]}
          empreendimento='todos'
          onTransferred={() => {
            clearSelection();
            fetchSolicitacoes();
          }}
        />
      )}

      {/* Transfer Ownership Modal */}
      {transferSolicitacao && (
        <TransferOwnershipModal
          open={transferOpen}
          onOpenChange={setTransferOpen}
          solicitacaoId={transferSolicitacao.id}
          solicitacaoProtocolo={transferSolicitacao.protocolo}
          currentUserId={''}
          currentUserName={transferSolicitacao.solicitante_nome || 'Solicitante'}
          empreendimento={transferSolicitacao.empreendimento}
          onTransferred={fetchSolicitacoes}
        />
      )}

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedCount={selectedIds.size}
        canBulkAssign={canBulkAssign}
        onClear={clearSelection}
        onBulkAssign={handleBulkAssign}
        onBulkTransfer={handleBulkTransfer}
        onExport={handleBulkExport}
        assignLoading={bulkAssignLoading}
      />
    </>
  );
}
