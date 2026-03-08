import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Tabs removed - using FilterBar groups instead
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FilterBar, type TabGroup } from '@/components/ui/FilterBar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';
import { FluigStatusCard } from '@/components/FluigStatusCard';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { AnexoCard } from '@/components/AnexoCard';
import { FornecedorCard } from '@/components/FornecedorCard';
import { GarantiaExpiracaoInfo } from '@/components/GarantiaExpiracaoInfo';
import { CNAECompatibilityBadge } from '@/components/CNAECompatibilityBadge';
import { DescriptionQualityBadge } from '@/components/DescriptionQualityBadge';
import { MEIAlertBadge } from '@/components/MEIAlertBadge';
import { EscopoMinutaCard } from '@/components/EscopoMinutaCard';
import { InstrumentoJuridicoBadge } from '@/components/InstrumentoJuridicoBadge';
import { JuridicoTracker } from '@/components/JuridicoTracker';
import { type Fornecedor, type CNAESecundario, INSTRUMENTO_JURIDICO_LABELS, type InstrumentoJuridico } from '@/types';
import { RateioCard } from '@/components/RateioCard';
import { supabase } from '@/integrations/supabase/client';
import { useBackofficeSolicitacoes, type SolicitacaoBackoffice } from '@/hooks/useBackofficeSolicitacoes';
import { useSolicitacaoDetalhes } from '@/hooks/useSolicitacaoDetalhes';
import { notifyOwnerOCEmitido } from '@/hooks/useNotificationEmail';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  EMPREENDIMENTO_LABELS, 
  NATUREZA_ORCAMENTARIA_LABELS,
  TIPO_CONTRATACAO_LABELS,
  TIPO_GARANTIA_LABELS,
  STATUS_LABELS,
  ANEXO_LABELS,
  type RequestStatus,
  type DocumentoEmitido,
  type DocumentoFiscal
} from '@/types';
import { 
  Loader2, 
  CheckCircle, 
  RotateCcw, 
  XCircle, 
  Search,
  Eye,
  Clock,
  AlertTriangle,
  Building2,
  User,
  Calendar,
  DollarSign,
  FileText,
  Package,
  Truck,
  Download,
  Archive,
  FileCheck,
  Cog,
  CheckCheck,
  Upload,
  HelpCircle,
  UserCheck,
  Filter,
  ChevronDown,
  ChevronUp,
  History,
  Receipt,
  CreditCard,
  Send,
  Banknote,
  Edit,
  ShieldAlert,
  Shield,
  Mail,
  Phone,
  Plus
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
import { ConfirmModal } from '@/components/ui/ActionModal';
import { exportToExcel } from '@/lib/export-utils';

// PDF validation types
interface PdfValidationResult {
  match: boolean;
  valorPdf: number | null;
  valorEsperado: number;
  diferenca: number | null;
}

type BackofficeTab = 'recebidas' | 'pendentes' | 'em_processamento' | 'oc_emitidas' | 'liberadas' | 'concluidas' | 'rejeitadas' | 'cancelamento_pendente';

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

  // Transfer modal state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferSolicitacao, setTransferSolicitacao] = useState<SolicitacaoBackoffice | null>(null);

  // Confirmation modal state (#4 improvement)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'baixa' | 'envio_fornecedor' | 'concluir_liberada';
    sol: SolicitacaoBackoffice;
    title: string;
    description: string;
  } | null>(null);

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
    setConfirmAction({
      type: 'envio_fornecedor',
      sol,
      title: 'Registrar Envio ao Fornecedor',
      description: `Confirma que a OC da solicitação #${sol.protocolo} foi enviada ao fornecedor?`,
    });
  };

  const handleRegistrarEnvioFornecedorConfirmed = async (sol: SolicitacaoBackoffice) => {
    if (!user) return;
    
    setActionLoading(true);
    try {
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
        status_anterior: 'liberado_fornecedor',
        status_novo: 'enviado_fornecedor',
        motivo: 'OC enviada ao fornecedor',
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

  const handleConcluirLiberada = (sol: SolicitacaoBackoffice) => {
    setConfirmAction({
      type: 'concluir_liberada',
      sol,
      title: 'Concluir Solicitação',
      description: `Confirma a conclusão da solicitação #${sol.protocolo}?`,
    });
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
        motivo: 'Solicitação concluída',
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

        // Abrir modal Fluig automaticamente se ainda não preenchido
        if (!sol.numero_chamado_fluig) {
          openEditFluig(sol);
        }
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

  // Filter solicitacoes - search already handled by RPC, but we can still do local filtering
  const filteredSolicitacoes = useMemo(() => {
    let filtered = solicitacoes;
    
    // Additional local filter for "mine only"
    if (showOnlyMine) {
      filtered = filtered.filter(sol => sol.responsavelId === user?.id);
    }
    
    return filtered;
  }, [solicitacoes, showOnlyMine, user?.id]);

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
    liberadas: filteredSolicitacoes.filter(s => 
      s.status === 'liberado_fornecedor' || s.status === 'enviado_fornecedor' ||
      s.status === 'aguardando_nf_boleto' || s.status === 'nf_boleto_enviados'
    ),
    pendentes: filteredSolicitacoes.filter(s => s.status === 'pendente_correcao' || s.status === 'aguardando_informacoes'),
    concluidas: filteredSolicitacoes.filter(s => s.status === 'concluida' || s.status === 'enviado_pagamento'),
    rejeitadas: filteredSolicitacoes.filter(s => s.status === 'rejeitado'),
    cancelamento_pendente: filteredSolicitacoes.filter(s => cancelamentoPendenteIds.has(s.id)),
  }), [filteredSolicitacoes, cancelamentoPendenteIds]);

  // SLA calculation
  const getSLAInfo = (sol: SolicitacaoBackoffice) => {
    const diasDesdeAbertura = differenceInDays(new Date(), new Date(sol.created_at));
    const horasDesdeAbertura = differenceInHours(new Date(), new Date(sol.created_at));
    const tempoDesdeAbertura = diasDesdeAbertura === 0 ? `${horasDesdeAbertura}h` : `${diasDesdeAbertura}d`;
    
    const diasDesdeAprovacao = sol.dataAprovacao 
      ? differenceInDays(new Date(), new Date(sol.dataAprovacao))
      : null;
    const horasDesdeAprovacao = sol.dataAprovacao
      ? differenceInHours(new Date(), new Date(sol.dataAprovacao))
      : null;
    
    // Format approval time - show hours if less than 1 day, otherwise days
    const tempoDesdeAprovacao = sol.dataAprovacao
      ? (diasDesdeAprovacao === 0 ? `${horasDesdeAprovacao}h` : `${diasDesdeAprovacao}d`)
      : null;
    
    const atrasadoAnalise = diasDesdeAbertura > 5 && ['recebido', 'em_analise'].includes(sol.status);
    const atrasadoEmissao = diasDesdeAprovacao !== null && diasDesdeAprovacao > 3 && 
      ['aprovado', 'em_processamento'].includes(sol.status);
    
    return { diasDesdeAbertura, tempoDesdeAbertura, diasDesdeAprovacao, horasDesdeAprovacao, tempoDesdeAprovacao, atrasadoAnalise, atrasadoEmissao };
  };

  const SolicitacaoCard = ({ sol }: { sol: SolicitacaoBackoffice }) => {
    const sla = getSLAInfo(sol);
    const isAtrasado = sla.atrasadoAnalise || sla.atrasadoEmissao;
    const isMyResponsibility = sol.responsavelId === user?.id;
    const hasFlugNumber = !!sol.numero_chamado_fluig;
    const awaitingOC = (sol.status === 'aprovado' || sol.status === 'em_processamento') && hasFlugNumber;
    
    // Get cadastro status for this solicitation
    const solCadastroStatus = cadastroStatus[sol.id];
    const hasCancelamentoPendente = cancelamentoPendenteIds.has(sol.id);

    return (
      <Card className={cn(
        'hover:shadow-md transition-shadow',
        isAtrasado && 'border-destructive border-2',
        isMyResponsibility && !isAtrasado && 'border-primary border-2 bg-primary/5'
      )}>
        {/* My Responsibility Banner */}
        {isMyResponsibility && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">MINHA RESPONSABILIDADE</span>
            {sol.responsavelNome && (
              <span className="text-xs text-muted-foreground">• Assumido por você</span>
            )}
          </div>
        )}
        
        {/* Awaiting OC Banner */}
        {awaitingOC && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center gap-2 flex-wrap">
            <Cog className="h-4 w-4 text-amber-600 animate-spin" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">AGUARDANDO EMISSÃO DE OC</span>
            <Badge 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-accent"
              onClick={() => openEditFluig(sol)}
            >
              {sol.numero_chamado_fluig === 'RM' ? 'RM' : `Fluig: ${sol.numero_chamado_fluig}`}
              <Edit className="h-3 w-3 ml-1" />
            </Badge>
            {sol.numero_projuris && (
              <Badge 
                variant="outline" 
                className="text-xs cursor-pointer hover:bg-accent bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700"
                onClick={() => openEditProjuris(sol)}
              >
                Projuris: {sol.numero_projuris}
                <Edit className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {!sol.numero_projuris && (
              <Badge 
                variant="outline" 
                className="text-xs cursor-pointer hover:bg-accent bg-purple-50/50 text-purple-600 border-dashed border-purple-200 dark:bg-purple-900/10 dark:text-purple-400 dark:border-purple-700"
                onClick={() => openEditProjuris(sol)}
              >
                + Projuris
              </Badge>
            )}
          </div>
        )}

        {/* NF/Boleto Enviados Banner */}
        {sol.status === 'nf_boleto_enviados' && (
          <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-4 py-1.5 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-cyan-600" />
            <span className="text-xs font-medium text-cyan-700 dark:text-cyan-400">NF/BOLETO RECEBIDOS - AGUARDANDO BAIXA</span>
            {sol.total_docs_fiscais > 0 && (
              <Badge variant="outline" className="text-xs">{sol.total_docs_fiscais} documento(s)</Badge>
            )}
          </div>
        )}

        {/* Cancelamento Pendente Banner */}
        {hasCancelamentoPendente && (
          <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-1.5 flex items-center gap-2 flex-wrap">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs font-medium text-destructive">CANCELAMENTO SOLICITADO - AGUARDANDO APROVAÇÃO</span>
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" onClick={() => handleAprovarCancelamento(sol)} disabled={cancelamentoActionLoading}>
                <CheckCircle className="h-3 w-3 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => handleRejeitarCancelamento(sol)} disabled={cancelamentoActionLoading}>
                <XCircle className="h-3 w-3 mr-1" /> Rejeitar
              </Button>
            </div>
          </div>
        )}
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={sol.tipo === 'AC' ? 'default' : 'secondary'}>
                {sol.tipo}
              </Badge>
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
                  <User className="h-3 w-3 mr-1" />
                  {sol.responsavelNome}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Primary action in header */}
              {(sol.status === 'aprovado' || (sol.status === 'em_processamento' && !sol.numero_chamado_fluig)) && (
                <Button size="sm" onClick={() => openAction(sol, 'processar')}>
                  <Cog className="h-4 w-4 mr-1" /> Informar Lançamento
                </Button>
              )}
              {(sol.status === 'aprovado' || sol.status === 'em_processamento') && (
                <Button size="sm" variant="default" onClick={() => openRegistro(sol)}>
                  <FileCheck className="h-4 w-4 mr-1" /> Registrar OC
                </Button>
              )}
              {sol.status === 'oc_ac_emitida' && (
                <Button size="sm" onClick={() => openAction(sol, 'concluir')}>
                  <CheckCheck className="h-4 w-4 mr-1" /> Concluir
                </Button>
              )}
              {(sol.status === 'recebido' || sol.status === 'em_analise') && (
                <Button size="sm" onClick={() => openAction(sol, 'assumir')}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Assumir
                </Button>
              )}
              {sol.status === 'liberado_fornecedor' && (
                <Button size="sm" onClick={() => handleRegistrarEnvioFornecedor(sol)} disabled={actionLoading}>
                  <Send className="h-4 w-4 mr-1" /> Registrar Envio
                </Button>
              )}
              {sol.status === 'enviado_fornecedor' && (
                <Button size="sm" onClick={() => handleConcluirLiberada(sol)} disabled={actionLoading}>
                  <CheckCheck className="h-4 w-4 mr-1" /> Concluir
                </Button>
              )}
              {isAtrasado && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  SLA
                </Badge>
              )}
            </div>
          </div>
          <CardDescription className="line-clamp-1">{sol.descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{sol.solicitante_nome || sol.solicitante_email || 'Usuário'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{EMPREENDIMENTO_LABELS[sol.empreendimento]}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatBR(sol.created_at, "dd/MM/yyyy")}</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-primary">
                <DollarSign className="h-4 w-4" />
                <span>{formatCurrency(sol.valor)}</span>
              </div>
            </div>
            
            {/* SLA Info with colored badges */}
            <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
              <Badge variant="outline" className={cn(
                "text-xs gap-1",
                sla.atrasadoAnalise 
                  ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700" 
                  : sla.diasDesdeAbertura >= 3 
                    ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700"
                    : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700"
              )}>
                <Clock className="h-3 w-3" />
                {sla.tempoDesdeAbertura} desde abertura
              </Badge>
              {sla.tempoDesdeAprovacao !== null && (
                <Badge variant="outline" className={cn(
                  "text-xs gap-1",
                  sla.atrasadoEmissao 
                    ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700" 
                    : (sla.diasDesdeAprovacao ?? 0) >= 2
                      ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700"
                )}>
                  <Clock className="h-3 w-3" />
                  {sla.tempoDesdeAprovacao} desde assumido
                </Badge>
              )}
            </div>

            {sol.emergencial && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Emergencial</span>
              </div>
            )}
          </div>

          {/* Contato do Fornecedor - visível nos status liberado_fornecedor e enviado_fornecedor */}
          {['liberado_fornecedor', 'enviado_fornecedor'].includes(sol.status) &&
           (sol.fornecedor_email_contato || sol.fornecedor_telefone_contato) && (
            <div className="mb-4 p-3 rounded-lg border-2 border-green-300 bg-green-50/50 dark:bg-green-950/20 dark:border-green-700">
              <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Contato para envio da OC
              </p>
              <div className="space-y-1">
                {sol.fornecedor_email_contato && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <a href={`mailto:${sol.fornecedor_email_contato}`} className="text-green-700 dark:text-green-300 hover:underline">
                      {sol.fornecedor_email_contato}
                    </a>
                  </div>
                )}
                {sol.fornecedor_telefone_contato && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <a href={`tel:${sol.fornecedor_telefone_contato}`} className="text-green-700 dark:text-green-300 hover:underline">
                      {sol.fornecedor_telefone_contato}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons - organized in rows */}
          <div className="space-y-2">
            {/* Primary row: View details + secondary actions */}
            <div className="flex gap-2 flex-wrap items-center">
              <Button size="sm" variant="outline" onClick={() => openDetails(sol)}>
                <Eye className="h-4 w-4 mr-1" /> Ver Detalhes
              </Button>
              
              {/* Secondary actions based on status */}
              {(sol.status === 'recebido' || sol.status === 'em_analise') && (
                <Button size="sm" variant="outline" onClick={() => openAction(sol, 'solicitar_ajuste')}>
                  <HelpCircle className="h-4 w-4 mr-1" /> Solicitar Ajuste
                </Button>
              )}
              
              {(sol.status === 'aprovado' || sol.status === 'em_processamento') && (
                <>
                  {/* Cadastro Contábil Button */}
                  {solCadastroStatus === 'concluido' ? (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Cadastro OK
                    </Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      variant={solCadastroStatus === 'solicitado' ? 'secondary' : 'outline'}
                      onClick={() => handleSolicitarCadastro(sol)}
                      disabled={cadastroLoading}
                    >
                      {solCadastroStatus === 'solicitado' ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" /> Cadastro Concluído
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4 mr-1" /> Solicitar Cadastro
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button size="sm" variant="outline" onClick={() => openAction(sol, 'solicitar_ajuste')}>
                    <HelpCircle className="h-4 w-4 mr-1" /> Solicitar Ajuste
                  </Button>
                </>
              )}

              {/* NF/Boleto Actions */}
              {sol.status === 'nf_boleto_enviados' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => {
                    setSelectedSolicitacao(sol);
                    setNfBoletoViewOpen(true);
                  }}>
                    <Receipt className="h-4 w-4 mr-1" /> Ver NF/Boleto
                  </Button>
                  <Button size="sm" onClick={() => {
                    setSelectedSolicitacao(sol);
                    setNfBoletoViewOpen(true);
                  }}>
                    <Send className="h-4 w-4 mr-1" /> Dar Baixa
                  </Button>
                </>
              )}
              
              {/* Expand/Collapse button for history */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedId(expandedId === sol.id ? null : sol.id)}
                className="ml-auto"
              >
                <History className="h-4 w-4 mr-1" />
                Histórico
                {expandedId === sol.id ? (
                  <ChevronUp className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1" />
                )}
              </Button>

              {/* Transfer button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTransferSolicitacao(sol);
                  setTransferOpen(true);
                }}
                className="text-muted-foreground"
              >
                <UserCheck className="h-4 w-4 mr-1" /> Transferir
              </Button>
            </div>

            {/* Destructive actions row - separated visually */}
            {(sol.status === 'recebido' || sol.status === 'em_analise' || sol.status === 'aprovado' || sol.status === 'em_processamento') && (
              <div className="flex gap-2 pt-1 border-t border-dashed">
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openAction(sol, 'rejeitar')}>
                  <XCircle className="h-4 w-4 mr-1" /> {sol.status === 'aprovado' || sol.status === 'em_processamento' ? 'Reprovar' : 'Rejeitar'}
                </Button>
              </div>
            )}
          </div>
          
          {/* Descrição com Ver mais/menos */}
          <div className="mt-3 pt-3 border-t">
            <ExpandableDescription 
              description={sol.descricao} 
              maxLength={100}
              className="text-muted-foreground"
            />
          </div>

          {/* Expanded History Timeline */}
          {expandedId === sol.id && (
            <div className="mt-4 pt-4 border-t space-y-6">
              {/* Fluig Status Card */}
              {sol.numero_chamado_fluig && sol.numero_chamado_fluig !== 'RM' && (
                <FluigStatusCard numeroChamadoFluig={sol.numero_chamado_fluig} />
              )}
              
              {/* Histórico */}
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Histórico da Solicitação
                </h4>
                <SolicitacaoTimeline solicitacaoId={sol.id} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Reset page on tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Get active tab items for pagination
  const getActiveTabItems = useCallback((): SolicitacaoBackoffice[] => {
    return groupedSolicitacoes[activeTab] || [];
  }, [groupedSolicitacoes, activeTab]);

  const TabContent = ({ items, emptyMessage }: { items: SolicitacaoBackoffice[], emptyMessage: string }) => {
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const paginatedItems = items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    
    return (
      <div className="space-y-4">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {emptyMessage}
            </CardContent>
          </Card>
        ) : (
          <>
            {paginatedItems.map((sol) => <SolicitacaoCard key={sol.id} sol={sol} />)}
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
                { id: 'rejeitadas', label: 'Rejeitadas', count: groupedSolicitacoes.rejeitadas.length },
                { id: 'concluidas', label: 'Concluídas', count: groupedSolicitacoes.concluidas.length, variant: 'success' as const },
              ],
            },
          ]}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as BackofficeTab)}
        />

        {/* Tab Content */}
        <div className="space-y-4">
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
          {activeTab === 'concluidas' && (
            <TabContent items={groupedSolicitacoes.concluidas} emptyMessage="Nenhuma solicitação concluída" />
          )}
          {activeTab === 'rejeitadas' && (
            <TabContent items={groupedSolicitacoes.rejeitadas} emptyMessage="Nenhuma solicitação rejeitada" />
          )}
          {activeTab === 'cancelamento_pendente' && (
            <TabContent items={groupedSolicitacoes.cancelamento_pendente} emptyMessage="Nenhum cancelamento pendente de aprovação" />
          )}
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          {/* Header Fixo */}
          <DialogHeader className="flex-shrink-0 border-b px-6 py-4 bg-background">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-3 flex-wrap">
                <Badge variant={selectedSolicitacao?.tipo === 'AC' ? 'default' : 'secondary'} className="text-sm">
                  {selectedSolicitacao?.tipo}
                </Badge>
                <span className="font-mono text-lg">#{selectedSolicitacao?.protocolo}</span>
                {selectedSolicitacao && (
                  <StatusBadge status={selectedSolicitacao.status} />
                )}
                {detalhes?.solicitacao?.emergencial && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Emergencial
                  </Badge>
                )}
              </DialogTitle>
              <span className="text-2xl font-bold text-primary whitespace-nowrap pr-8">
                {selectedSolicitacao?.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            {/* SLA Badges */}
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
          
          {/* Corpo Scrollável */}
          {detalhesLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : detalhes?.solicitacao ? (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <TooltipProvider>
              <div className="space-y-6">

                {/* Documento Emitido (se existir) */}
                {detalhes.documentos_emitidos && detalhes.documentos_emitidos.length > 0 && (
                  <>
                    <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-success">
                        <FileCheck className="h-4 w-4" /> Documento Emitido
                      </h4>
                      {detalhes.documentos_emitidos.map((doc) => (
                        <div key={doc.id} className="grid grid-cols-2 gap-4 text-sm mb-2">
                          <div>
                            <Label className="text-muted-foreground">Tipo</Label>
                            <p className="font-medium">{doc.tipo_documento}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Número</Label>
                            <p className="font-medium">{doc.numero_documento}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="col-span-2"
                            onClick={() => downloadDocumentoEmitido(doc)}
                          >
                            <Download className="h-4 w-4 mr-1" /> Baixar {doc.tipo_documento}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Separator />
                  </>
                )}

                {/* Contato do Fornecedor (para envio da OC) */}
                {(['liberado_fornecedor', 'enviado_fornecedor'].includes(detalhes.solicitacao.status)) &&
                 ((detalhes.solicitacao as any).fornecedor_email_contato || (detalhes.solicitacao as any).fornecedor_telefone_contato) && (
                  <>
                    <Card className="border-2 border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-green-800 dark:text-green-200">
                          <Send className="h-4 w-4" />
                          Contato do Fornecedor (para envio da OC)
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

                {/* Descrição - Card Destacado */}
                <Card className="bg-slate-50 dark:bg-slate-900/50 border-l-4 border-l-primary shadow-sm">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4" />
                      Resumo da Solicitação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ExpandableDescription 
                      description={detalhes.solicitacao.descricao} 
                      maxLength={200}
                      className="text-base"
                    />
                  </CardContent>
                </Card>

                {/* Instrumento Jurídico Badge */}
                {(detalhes.solicitacao as any).instrumento_juridico && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">Instrumento Jurídico</Label>
                    <InstrumentoJuridicoBadge instrumento={(detalhes.solicitacao as any).instrumento_juridico} />
                  </div>
                )}

                {/* Acompanhamento Jurídico - quando instrumento não é OC */}
                {(detalhes.solicitacao as any).instrumento_juridico && 
                 (detalhes.solicitacao as any).instrumento_juridico !== 'oc' && (
                  <JuridicoTracker solicitacaoId={detalhes.solicitacao.id} />
                )}

                {/* Escopo Detalhado para Minuta */}
                {(detalhes.solicitacao as any).escopo_detalhado_minuta && (
                  <EscopoMinutaCard
                    escopo={(detalhes.solicitacao as any).escopo_detalhado_minuta}
                    protocolo={detalhes.solicitacao.protocolo}
                    onSolicitarAjuste={() => openAction(selectedSolicitacao!, 'solicitar_ajuste')}
                  />
                )}

                {/* Due Diligence Management Card (>= R$ 50k) */}
                {detalhes.solicitacao.valor >= 50000 && (
                  <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
                        <Shield className="h-5 w-5" />
                        Due Diligence Obrigatória (R$ 50k+)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Status Grid */}
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

                      {/* Info Alert */}
                      <Alert className="bg-amber-100/50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-sm">Verificação Necessária</AlertTitle>
                        <AlertDescription className="text-xs">
                          Verifique com o Jurídico da Capital Realty se a Due Diligence do fornecedor está válida antes de aprovar a emissão da OC.
                          A Due Diligence deve ser solicitada para novos fornecedores ou quando a última verificação tiver mais de 12 meses.
                        </AlertDescription>
                      </Alert>

                      {/* Quick note for backoffice - no interactive controls since db fields not in schema */}
                      <p className="text-xs text-muted-foreground italic">
                        💡 Registre no Projuris e utilize o campo "Observação" ao emitir a OC para documentar a verificação de Due Diligence.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Informações Gerais - Grid Reorganizado */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Empreendimento</Label>
                    <p className="font-medium mt-1">{EMPREENDIMENTO_LABELS[detalhes.solicitacao.empreendimento]}</p>
                  </div>

                  {/* Rateio Card - when empreendimento = todos */}
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
                  
                  {/* Natureza Orçamentária - Redesigned */}
                  <div className="col-span-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Classificação Orçamentária
                      </Label>
                      <TooltipProvider>
                        <Badge 
                          variant="outline" 
                          className="h-4 w-4 p-0 rounded-full border-muted-foreground/30 cursor-help"
                        >
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </Badge>
                      </TooltipProvider>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="mt-2 px-3 py-1.5 text-sm font-medium whitespace-normal text-left bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                    >
                      {NATUREZA_ORCAMENTARIA_LABELS[detalhes.solicitacao.natureza_orcamentaria]}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1.5">Define centro de custo e fluxo de aprovação</p>
                  </div>
                  
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Quem Paga?</Label>
                    <p className="font-medium mt-1">
                      {detalhes.solicitacao.origem_custo === 'empreendimento' ? 'Área comum' : 'Cliente'}
                      {detalhes.cliente && (
                        <span className="text-primary"> ({detalhes.cliente.nome})</span>
                      )}
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
                  
                  {/* Data do Serviço - para qualquer tipo com datas */}
                  {(detalhes.solicitacao.data_inicio || detalhes.solicitacao.data_fim) && (
                    <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Data Início do Serviço
                        </Label>
                        <p className="font-medium mt-1">
                          {detalhes.solicitacao.data_inicio 
                            ? formatBR(detalhes.solicitacao.data_inicio + 'T12:00:00', 'dd/MM/yyyy')
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Data Fim do Serviço
                        </Label>
                        <p className="font-medium mt-1">
                          {detalhes.solicitacao.data_fim 
                            ? formatBR(detalhes.solicitacao.data_fim + 'T12:00:00', 'dd/MM/yyyy')
                            : '—'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Fornecimento Exclusivo */}
                  {(detalhes.solicitacao as any).fornecimento_exclusivo && (
                    <div className="col-span-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <Label className="text-muted-foreground font-medium flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-purple-600" />
                        Fornecimento Exclusivo
                      </Label>
                      <p className="mt-2 text-sm">{(detalhes.solicitacao as any).justificativa_exclusividade || 'Sem justificativa informada'}</p>
                    </div>
                  )}
                </div>
                
                {/* Justificativa - Sem Chamado Infraspeak */}
                {(detalhes.solicitacao as any).justificativa_sem_chamado && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <Label className="text-muted-foreground font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Justificativa - Sem Chamado Infraspeak
                    </Label>
                    <p className="mt-2 text-sm">{(detalhes.solicitacao as any).justificativa_sem_chamado}</p>
                  </div>
                )}
                
                {/* Justificativa - Sem Memorial */}
                {(detalhes.solicitacao as any).justificativa_sem_memorial && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <Label className="text-muted-foreground font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Justificativa - Sem Memorial/Escopo
                    </Label>
                    <p className="mt-2 text-sm">{(detalhes.solicitacao as any).justificativa_sem_memorial}</p>
                  </div>
                )}

                <Separator />

                {/* Anexos - Redesigned */}
                {detalhes.anexos && detalhes.anexos.length > 0 && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
                          <Archive className="h-4 w-4" /> 
                          Anexos 
                          <Badge variant="secondary" className="ml-1">{detalhes.anexos.length}</Badge>
                        </h4>
                        <Button 
                          size="sm" 
                          onClick={() => downloadAnexosZip(detalhes.solicitacao.id, detalhes.anexos, detalhes.solicitacao.protocolo)}
                          disabled={downloadingZip}
                          className="gap-1.5"
                        >
                          {downloadingZip ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Baixar Todos (ZIP)
                        </Button>
                      </div>
                      
                      {/* Anexos Grid */}
                      <div className="grid gap-2">
                        {detalhes.anexos.map((anexo) => (
                          <AnexoCard key={anexo.id} anexo={anexo} />
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Fornecedor - Card Enriquecido */}
                {detalhes.solicitacao.fornecedor_cnpj && (
                  <>
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Truck className="h-4 w-4" /> Fornecedor
                      </h4>
                      <FornecedorCard 
                        fornecedor={buildFornecedorFromDetalhes(detalhes.solicitacao)}
                        showClearButton={false}
                        compact={false}
                        formatCNPJ={formatCNPJ}
                      />
                      
                      {/* MEI Alert no Backoffice */}
                      {buildFornecedorFromDetalhes(detalhes.solicitacao)?.is_mei && (
                        <MEIAlertBadge 
                          showInlineAlert 
                          valorTotal={detalhes.solicitacao.valor}
                        />
                      )}
                      
                      {/* CNAE Compatibility Badge no Backoffice */}
                      {buildFornecedorFromDetalhes(detalhes.solicitacao)?.cnae_principal_codigo && (
                        <CNAECompatibilityBadge
                          descricao={detalhes.solicitacao.descricao}
                          fornecedor={buildFornecedorFromDetalhes(detalhes.solicitacao)}
                          enabled={detalhes.solicitacao.descricao.length >= 20}
                          cachedResult={detalhes.solicitacao.ia_cnae_status ? {
                            status: detalhes.solicitacao.ia_cnae_status,
                            justificativa: detalhes.solicitacao.ia_cnae_justificativa || ''
                          } : null}
                        />
                      )}
                      
                      {/* Description Quality Badge no Backoffice */}
                      <DescriptionQualityBadge
                        isVague={detalhes.solicitacao.ia_descricao_vaga}
                        suggestion={detalhes.solicitacao.ia_descricao_sugestao}
                      />
                    </div>
                    
                    {/* Fornecedores Concorrentes */}
                    {(buildConcorrenteFromDetalhes(detalhes.solicitacao, 1) || buildConcorrenteFromDetalhes(detalhes.solicitacao, 2)) && (
                      <div className="mt-4 space-y-3">
                        <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Fornecedores Concorrentes
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {buildConcorrenteFromDetalhes(detalhes.solicitacao, 1) && (
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs mb-1">Concorrente 1</Badge>
                              <FornecedorCard 
                                fornecedor={buildConcorrenteFromDetalhes(detalhes.solicitacao, 1)!}
                                showClearButton={false}
                                compact={true}
                                formatCNPJ={formatCNPJ}
                              />
                            </div>
                          )}
                          {buildConcorrenteFromDetalhes(detalhes.solicitacao, 2) && (
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs mb-1">Concorrente 2</Badge>
                              <FornecedorCard 
                                fornecedor={buildConcorrenteFromDetalhes(detalhes.solicitacao, 2)!}
                                showClearButton={false}
                                compact={true}
                                formatCNPJ={formatCNPJ}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <Separator />
                  </>
                )}

                {/* Justificativa de Fornecedor Único */}
                {detalhes.solicitacao.justificativa_fornecedores && (
                  <>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <Label className="text-muted-foreground font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Justificativa para Fornecedor Único
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

                {/* Informações de Garantia - Seção Destacada */}
                {detalhes.solicitacao.tipo_garantia && detalhes.solicitacao.tipo_garantia !== 'nenhuma' && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      Garantia Contratada
                    </Label>
                    
                    <div className="mt-2 space-y-1">
                      <p className="font-medium text-green-800 dark:text-green-200">
                        {TIPO_GARANTIA_LABELS[detalhes.solicitacao.tipo_garantia]}
                      </p>
                      
                      {detalhes.solicitacao.tipo_garantia === 'ambos' ? (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Serviço:</span>{' '}
                            <span className="font-semibold">{detalhes.solicitacao.dias_garantia_servico || '—'} dias</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Produto:</span>{' '}
                            <span className="font-semibold">{detalhes.solicitacao.dias_garantia_produto || '—'} dias</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Duração:</span>{' '}
                          <span className="font-semibold">{detalhes.solicitacao.dias_garantia || '—'} dias</span>
                        </p>
                      )}
                      
                      {/* Se status = concluída, mostrar expiração */}
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

                {/* Histórico / Timeline - Collapsible */}
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                      <span className="font-semibold flex items-center gap-2">
                        <History className="h-4 w-4" /> Histórico
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>svg&]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <SolicitacaoTimeline solicitacaoId={detalhes.solicitacao.id} />
                  </CollapsibleContent>
                </Collapsible>

                {/* Mensagens */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                      <span className="font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> Mensagens
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>svg&]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <SolicitacaoMessages solicitacaoId={detalhes.solicitacao.id} />
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

          {/* Footer Fixo */}
          <DialogFooter className="flex-shrink-0 border-t px-6 py-4 bg-background">
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => setDetailsOpen(false)}>
                Fechar
              </Button>
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

      {/* Action Modal */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'assumir' && 'Assumir Solicitação'}
              {actionType === 'rejeitar' && 'Rejeitar Solicitação'}
              {actionType === 'processar' && 'Enviar para Processamento'}
              {actionType === 'concluir' && 'Concluir Solicitação'}
              {actionType === 'solicitar_ajuste' && 'Solicitar Ajuste'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'assumir' && 'A solicitação será assumida e seguirá para processamento.'}
              {actionType === 'rejeitar' && 'Informe o motivo da rejeição.'}
              {actionType === 'processar' && 'A solicitação será marcada como em processamento no Fluig/RM.'}
              {actionType === 'concluir' && 'A solicitação será marcada como concluída.'}
              {actionType === 'solicitar_ajuste' && 'Informe o ajuste ou informação necessária ao solicitante.'}
            </DialogDescription>
          </DialogHeader>

          {(actionType === 'rejeitar' || actionType === 'solicitar_ajuste') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="motivo">
                  {actionType === 'solicitar_ajuste' ? 'Informações solicitadas *' : 'Motivo *'}
                </Label>
                <Textarea
                  id="motivo"
                  placeholder={actionType === 'solicitar_ajuste'
                    ? "Descreva as informações ou ajustes necessários..." 
                    : "Descreva o motivo..."}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Checkboxes para sinalizar anexos com problema */}
              {actionType === 'solicitar_ajuste' && anexosDisponiveis.length > 0 && (
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Sinalizar anexos que precisam correção (opcional)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Marque os anexos que estão com problema para que o solicitante saiba quais substituir.
                  </p>
                  <div className="space-y-2">
                    {anexosDisponiveis.map((anexo, idx) => (
                      <div key={`${anexo.tipo}-${idx}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`anexo-${anexo.tipo}-${idx}`}
                          checked={anexosComProblema.includes(anexo.tipo)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAnexosComProblema(prev => [...prev, anexo.tipo]);
                            } else {
                              setAnexosComProblema(prev => prev.filter(t => t !== anexo.tipo));
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`anexo-${anexo.tipo}-${idx}`} 
                          className="cursor-pointer text-sm flex items-center gap-2"
                        >
                          <span>{ANEXO_LABELS[anexo.tipo] || anexo.tipo}</span>
                          <span className="text-xs text-muted-foreground">({anexo.nome_arquivo})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                  {anexosComProblema.length > 0 && (
                    <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {anexosComProblema.length} anexo(s) sinalizado(s) como problemático(s)
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
                  <Checkbox
                    id="rm-flag"
                    checked={numeroChamadoFluig === 'RM'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setNumeroChamadoFluig('RM');
                      } else {
                        setNumeroChamadoFluig('');
                      }
                    }}
                  />
                  <Label htmlFor="rm-flag" className="cursor-pointer text-sm font-medium">
                    RM (sem Fluig)
                  </Label>
                </div>
              </div>
              {numeroChamadoFluig !== 'RM' && (
                <Input
                  id="fluig"
                  placeholder="Ex: CHM-2024-001234"
                  value={numeroChamadoFluig}
                  onChange={(e) => setNumeroChamadoFluig(e.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Marque "RM" se não houver chamado Fluig, ou informe o número para rastreabilidade.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAction}
              disabled={actionLoading || ((actionType === 'rejeitar' || actionType === 'solicitar_ajuste') && !motivo.trim())}
              variant={actionType === 'rejeitar' ? 'destructive' : 'default'}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registro OC Modal */}
      <Dialog open={registroOpen} onOpenChange={handleRegistroModalClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{registroMode === 'add' ? 'Adicionar OC' : 'Registrar OC Emitida'}</DialogTitle>
            <DialogDescription>
              {registroMode === 'add' 
                ? `Adicione mais OCs para a solicitação #${selectedSolicitacao?.protocolo}`
                : `Registre os dados da OC emitida para a solicitação #${selectedSolicitacao?.protocolo}`}
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
                  <Input
                    id={`numero-${index}`}
                    placeholder="Ex: 2024001234"
                    value={doc.numero}
                    onChange={(e) => setDocumentosOC(prev => prev.map((d, i) => i === index ? { ...d, numero: e.target.value } : d))}
                  />
                </div>

                <div>
                  <Label htmlFor={`doc-file-${index}`}>Documento (PDF) *</Label>
                  <Input
                    id={`doc-file-${index}`}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handlePdfFileSelectForOC(e, index)}
                  />
                  
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
                            <div className="font-bold">
                              Diferença: R$ {Math.abs(doc.pdfValidation.diferenca!).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
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
                      <Checkbox 
                        id={`confirm-divergence-${index}`}
                        checked={doc.confirmarDivergencia}
                        onCheckedChange={(checked) => setDocumentosOC(prev => prev.map((d, i) => i === index ? { ...d, confirmarDivergencia: checked === true } : d))}
                        className="mt-0.5"
                      />
                      <Label htmlFor={`confirm-divergence-${index}`} className="text-red-800 dark:text-red-200 text-sm cursor-pointer">
                        Confirmo que verifiquei os valores e desejo prosseguir mesmo com a divergência
                      </Label>
                    </div>
                  )}
                </div>
              </Card>
            ))}

            <Button variant="outline" className="w-full gap-2" onClick={addOCRow}>
              <Plus className="h-4 w-4" />
              Adicionar outra OC
            </Button>

            <div>
              <Label htmlFor="obs">Observação (opcional)</Label>
              <Textarea
                id="obs"
                placeholder="Observações adicionais..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleRegistroModalClose(false)} disabled={registroLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRegistrarOCAC}
              disabled={registroLoading || !canSubmitOC}
            >
              {registroLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {documentosOC.filter(d => d.numero && d.file).length > 1 
                ? `Registrar ${documentosOC.filter(d => d.numero && d.file).length} OCs` 
                : 'Registrar OC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NF/Boleto View Modal */}
      <Dialog open={nfBoletoViewOpen} onOpenChange={setNfBoletoViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-cyan-600" />
              NF e Boleto - #{selectedSolicitacao?.protocolo}
            </DialogTitle>
            <DialogDescription>
              Documentos fiscais enviados pelo solicitante
            </DialogDescription>
          </DialogHeader>

          {selectedSolicitacao && (
            <div className="space-y-4">
              {/* Solicitante info */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Solicitante</p>
                <p className="font-medium">{selectedSolicitacao.solicitante_nome || selectedSolicitacao.solicitante_email}</p>
              </div>

              {/* Documents list - uses detalhes from RPC */}
              {detalhes?.documentos_fiscais && detalhes.documentos_fiscais.length > 0 ? (
                <div className="space-y-3">
                  {detalhes.documentos_fiscais.map((doc) => (
                    <div key={doc.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {doc.tipo === 'nota_fiscal' ? (
                            <Receipt className="h-5 w-5 text-green-600" />
                          ) : (
                            <CreditCard className="h-5 w-5 text-blue-600" />
                          )}
                          <span className="font-medium">
                            {doc.tipo === 'nota_fiscal' ? 'Nota Fiscal' : 'Boleto'}
                          </span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => downloadDocumentoFiscal(doc)}>
                          <Download className="h-4 w-4 mr-1" /> Baixar
                        </Button>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{doc.nome_arquivo}</p>
                      
                      {doc.tipo === 'nota_fiscal' && doc.data_emissao_nf && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Emissão:</span>{' '}
                          {formatBR(doc.data_emissao_nf, "dd/MM/yyyy")}
                        </p>
                      )}
                      
                      {doc.tipo === 'boleto' && doc.data_vencimento_boleto && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Vencimento:</span>{' '}
                          {formatBR(doc.data_vencimento_boleto, "dd/MM/yyyy")}
                        </p>
                      )}
                      
                      {doc.pagamento_antecipado && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Pagamento Antecipado
                        </Badge>
                      )}
                      
                      {doc.justificativa_antecipado && (
                        <p className="text-sm text-muted-foreground italic">
                          Justificativa: {doc.justificativa_antecipado}
                        </p>
                      )}

                      {doc.baixa_financeiro_em && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Baixa em {formatBR(doc.baixa_financeiro_em, "dd/MM/yyyy HH:mm")}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum documento fiscal encontrado
                </p>
              )}

              {/* Dar baixa section */}
              {selectedSolicitacao.status === 'nf_boleto_enviados' && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    Ao dar baixa, os documentos serão marcados como enviados para pagamento.
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => selectedSolicitacao && setConfirmAction({ type: 'baixa', sol: selectedSolicitacao, title: 'Dar Baixa para Pagamento', description: `Confirma a baixa da solicitação #${selectedSolicitacao.protocolo}? Os documentos serão marcados como enviados para pagamento.` })}
                    disabled={baixaLoading}
                  >
                    {baixaLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Banknote className="h-4 w-4 mr-2" />
                    )}
                    Dar Baixa - Enviar para Pagamento
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Fluig/RM Modal */}
      <Dialog open={editFluigOpen} onOpenChange={setEditFluigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Fluig/RM</DialogTitle>
            <DialogDescription>
              Atualize o número do chamado Fluig ou marque como RM
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-rm-flag"
                  checked={editFluigValue === 'RM'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setEditFluigValue('RM');
                    } else {
                      setEditFluigValue('');
                    }
                  }}
                />
                <Label htmlFor="edit-rm-flag" className="cursor-pointer text-sm font-medium">
                  RM (sem Fluig)
                </Label>
              </div>
            </div>
            
            {editFluigValue !== 'RM' && (
              <div className="space-y-2">
                <Label htmlFor="edit-fluig">Número do Chamado Fluig</Label>
                <Input
                  id="edit-fluig"
                  placeholder="Ex: CHM-2024-001234"
                  value={editFluigValue}
                  onChange={(e) => setEditFluigValue(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFluigOpen(false)} disabled={editFluigLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFluig} disabled={editFluigLoading}>
              {editFluigLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Projuris Modal */}
      <Dialog open={editProjurisOpen} onOpenChange={setEditProjurisOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Número Projuris</DialogTitle>
            <DialogDescription>
              Informe o número do processo no Projuris
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-projuris">Número do Projuris</Label>
              <Input
                id="edit-projuris"
                placeholder="Ex: PROJ-2024-001234"
                value={editProjurisValue}
                onChange={(e) => setEditProjurisValue(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProjurisOpen(false)} disabled={editProjurisLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProjuris} disabled={editProjurisLoading}>
              {editProjurisLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Confirmation Modal (#4 improvement) */}
      <ConfirmModal
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmText="Confirmar"
        onConfirm={async () => {
          if (!confirmAction) return;
          const { type, sol } = confirmAction;
          setConfirmAction(null);
          if (type === 'baixa') {
            await handleDarBaixaConfirmed();
          } else if (type === 'envio_fornecedor') {
            await handleRegistrarEnvioFornecedorConfirmed(sol);
          } else if (type === 'concluir_liberada') {
            await handleConcluirLiberadaConfirmed(sol);
          }
        }}
      />
    </>
  );
}
