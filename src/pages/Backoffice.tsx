import { useEffect, useState, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';
import { FluigStatusCard } from '@/components/FluigStatusCard';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { AnexoCard } from '@/components/AnexoCard';
import { supabase } from '@/integrations/supabase/client';
import { useBackofficeSolicitacoes, type SolicitacaoBackoffice } from '@/hooks/useBackofficeSolicitacoes';
import { useSolicitacaoDetalhes } from '@/hooks/useSolicitacaoDetalhes';
import { notifyOwnerOCEmitido } from '@/hooks/useNotificationEmail';
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
  Edit
} from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type BackofficeTab = 'recebidas' | 'pendentes' | 'em_processamento' | 'oc_emitidas' | 'nf_boleto' | 'concluidas' | 'rejeitadas';

export default function Backoffice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
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

  // Use RPC-based hook for fetching
  const { solicitacoes, loading, refetch: fetchSolicitacoes } = useBackofficeSolicitacoes({
    search: searchTerm || undefined,
    empreendimento: selectedEmpreendimento !== 'todos' ? selectedEmpreendimento as any : undefined,
  });

  // Use RPC for details
  const { detalhes, loading: detalhesLoading, fetchDetalhes, clearDetalhes } = useSolicitacaoDetalhes();

  // Registro OC Modal
  const [registroOpen, setRegistroOpen] = useState(false);
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [observacao, setObservacao] = useState('');
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
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

  // Fetch details when opening details modal
  useEffect(() => {
    if (detailsOpen && selectedSolicitacao) {
      fetchDetalhes(selectedSolicitacao.id);
    } else if (!detailsOpen) {
      clearDetalhes();
    }
  }, [detailsOpen, selectedSolicitacao?.id, fetchDetalhes, clearDetalhes]);

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
      });
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
    if (!selectedSolicitacao || !user || !documentoFile || !numeroDocumento) return;
    
    setRegistroLoading(true);
    try {
      // Upload document
      const fileExt = documentoFile.name.split('.').pop();
      const filePath = `${selectedSolicitacao.id}/OC_${numeroDocumento}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documentos-emitidos')
        .upload(filePath, documentoFile);
      
      if (uploadError) throw uploadError;

      // Insert document record
      const { error: insertError } = await supabase
        .from('documentos_emitidos')
        .insert({
          solicitacao_id: selectedSolicitacao.id,
          tipo_documento: 'OC',
          numero_documento: numeroDocumento,
          storage_path: filePath,
          nome_arquivo: documentoFile.name,
          observacao: observacao || null,
          emitido_por: user.id,
        });

      if (insertError) throw insertError;

      // Update status to aguardando_aceite (waiting for requester acceptance)
      const { error: updateError } = await supabase
        .from('solicitacoes')
        .update({ status: 'aguardando_aceite' as any })
        .eq('id', selectedSolicitacao.id);

      if (updateError) throw updateError;

      // Create history entry
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: selectedSolicitacao.id,
        user_id: user.id,
        acao: `OC nº ${numeroDocumento} emitida - Aguardando aceite`,
        status_anterior: selectedSolicitacao.status,
        status_novo: 'aguardando_aceite',
        motivo: `OC nº ${numeroDocumento} emitida`,
      });

      // Send email notification for OC issued
      notifyOwnerOCEmitido(selectedSolicitacao.id, {
        protocolo: selectedSolicitacao.protocolo,
        documento_tipo: 'OC',
        documento_numero: numeroDocumento,
      });

      toast({
        title: 'OC Registrada!',
        description: `Número: ${numeroDocumento}`,
      });

      setRegistroOpen(false);
      setDetailsOpen(false);
      setNumeroDocumento('');
      setObservacao('');
      setDocumentoFile(null);
      fetchSolicitacoes();
    } catch (error) {
      console.error('Error registering OC:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar',
        description: 'Não foi possível registrar o documento',
      });
    } finally {
      setRegistroLoading(false);
    }
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

  const handleDarBaixa = async () => {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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

  const openRegistro = (sol: SolicitacaoBackoffice) => {
    setSelectedSolicitacao(sol);
    setNumeroDocumento('');
    setObservacao('');
    setDocumentoFile(null);
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

  // Group by tab - reordered as requested
  const groupedSolicitacoes = useMemo(() => ({
    recebidas: filteredSolicitacoes.filter(s => s.status === 'recebido' || s.status === 'em_analise'),
    em_processamento: filteredSolicitacoes.filter(s => s.status === 'aprovado' || s.status === 'em_processamento'),
    oc_emitidas: filteredSolicitacoes.filter(s => s.status === 'oc_ac_emitida' || s.status === 'aguardando_aceite'),
    nf_boleto: filteredSolicitacoes.filter(s => s.status === 'aguardando_nf_boleto' || s.status === 'nf_boleto_enviados'),
    pendentes: filteredSolicitacoes.filter(s => s.status === 'pendente_correcao' || s.status === 'aguardando_informacoes'),
    concluidas: filteredSolicitacoes.filter(s => s.status === 'concluida' || s.status === 'enviado_pagamento'),
    rejeitadas: filteredSolicitacoes.filter(s => s.status === 'rejeitado'),
  }), [filteredSolicitacoes]);

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
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={sol.tipo === 'AC' ? 'default' : 'secondary'}>
                {sol.tipo}
              </Badge>
              <CardTitle className="text-lg">#{sol.protocolo}</CardTitle>
              <StatusBadge status={sol.status} />
              {sol.responsavelNome && !isMyResponsibility && (
                <Badge variant="outline" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  {sol.responsavelNome}
                </Badge>
              )}
            </div>
            {isAtrasado && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                SLA
              </Badge>
            )}
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
                <span>{format(new Date(sol.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-primary">
                <DollarSign className="h-4 w-4" />
                <span>{formatCurrency(sol.valor)}</span>
              </div>
            </div>
            
            {/* SLA Info */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <span className={cn(
                "text-xs",
                sla.atrasadoAnalise ? "text-destructive font-semibold" : "text-muted-foreground"
              )}>
                {sla.tempoDesdeAbertura} desde abertura
              </span>
              {sla.tempoDesdeAprovacao !== null && (
                <span className={cn(
                  "text-xs",
                  sla.atrasadoEmissao ? "text-destructive font-semibold" : "text-muted-foreground"
                )}>
                  {sla.tempoDesdeAprovacao} desde assumido
                </span>
              )}
            </div>

            {sol.emergencial && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Emergencial</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <Button size="sm" variant="outline" onClick={() => openDetails(sol)}>
              <Eye className="h-4 w-4 mr-1" /> Ver Detalhes
            </Button>
            
            {/* Actions based on status */}
            {(sol.status === 'recebido' || sol.status === 'em_analise') && (
              <>
                <Button size="sm" onClick={() => openAction(sol, 'assumir')}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Assumir
                </Button>
                <Button size="sm" variant="outline" onClick={() => openAction(sol, 'solicitar_ajuste')}>
                  <HelpCircle className="h-4 w-4 mr-1" /> Solicitar Ajuste
                </Button>
                <Button size="sm" variant="destructive" onClick={() => openAction(sol, 'rejeitar')}>
                  <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
              </>
            )}
            
            {sol.status === 'aprovado' && (
              <Button size="sm" onClick={() => openAction(sol, 'processar')}>
                <Cog className="h-4 w-4 mr-1" /> Informar Lançamento
              </Button>
            )}
            
            {(sol.status === 'aprovado' || sol.status === 'em_processamento') && (
              <>
                <Button size="sm" variant="default" onClick={() => openRegistro(sol)}>
                  <FileCheck className="h-4 w-4 mr-1" /> Registrar OC
                </Button>
                <Button size="sm" variant="outline" onClick={() => openAction(sol, 'solicitar_ajuste')}>
                  <HelpCircle className="h-4 w-4 mr-1" /> Solicitar Ajuste
                </Button>
                <Button size="sm" variant="destructive" onClick={() => openAction(sol, 'rejeitar')}>
                  <XCircle className="h-4 w-4 mr-1" /> Reprovar
                </Button>
              </>
            )}
            
            {sol.status === 'oc_ac_emitida' && (
              <Button size="sm" onClick={() => openAction(sol, 'concluir')}>
                <CheckCheck className="h-4 w-4 mr-1" /> Concluir
              </Button>
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

  const TabContent = ({ items, emptyMessage }: { items: SolicitacaoBackoffice[], emptyMessage: string }) => (
    <div className="space-y-4">
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      ) : (
        items.map((sol) => <SolicitacaoCard key={sol.id} sol={sol} />)
      )}
    </div>
  );

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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Backoffice</h1>
          <p className="text-muted-foreground">Gerencie as solicitações de AC e OC</p>
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
                { id: 'nf_boleto', label: 'NF/Boleto', count: groupedSolicitacoes.nf_boleto.length, variant: 'purple' as const, showCountWhenZero: false },
              ],
            },
            {
              id: 'acoes_pendentes',
              label: 'Ações Pendentes',
              icon: <AlertTriangle className="h-3 w-3" />,
              labelClassName: 'text-warning',
              tabs: [
                { id: 'pendentes', label: 'Correções', count: groupedSolicitacoes.pendentes.length, variant: 'warning' as const, icon: <AlertTriangle className="h-3.5 w-3.5" />, showCountWhenZero: false },
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
          {activeTab === 'nf_boleto' && (
            <TabContent items={groupedSolicitacoes.nf_boleto} emptyMessage="Nenhuma NF/Boleto pendente" />
          )}
          {activeTab === 'concluidas' && (
            <TabContent items={groupedSolicitacoes.concluidas} emptyMessage="Nenhuma solicitação concluída" />
          )}
          {activeTab === 'rejeitadas' && (
            <TabContent items={groupedSolicitacoes.rejeitadas} emptyMessage="Nenhuma solicitação rejeitada" />
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
              <span className="text-2xl font-bold text-primary whitespace-nowrap">
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

                {/* Informações Gerais - Grid Reorganizado */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Empreendimento</Label>
                    <p className="font-medium mt-1">{EMPREENDIMENTO_LABELS[detalhes.solicitacao.empreendimento]}</p>
                  </div>
                  
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
                  
                  {/* Data de Contratação (AC) */}
                  {detalhes.solicitacao.tipo === 'AC' && (detalhes.solicitacao.data_inicio || detalhes.solicitacao.data_fim) && (
                    <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Data Início
                        </Label>
                        <p className="font-medium mt-1">
                          {detalhes.solicitacao.data_inicio 
                            ? format(new Date(detalhes.solicitacao.data_inicio + 'T00:00:00'), 'dd/MM/yyyy')
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Data Fim
                        </Label>
                        <p className="font-medium mt-1">
                          {detalhes.solicitacao.data_fim 
                            ? format(new Date(detalhes.solicitacao.data_fim + 'T00:00:00'), 'dd/MM/yyyy')
                            : '—'}
                        </p>
                      </div>
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

                {/* Fornecedor */}
                {detalhes.solicitacao.fornecedor_cnpj && (
                  <>
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Truck className="h-4 w-4" /> Fornecedor
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Razão Social</Label>
                          <p className="font-medium">{detalhes.solicitacao.fornecedor_razao || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">CNPJ</Label>
                          <p className="font-medium">{detalhes.solicitacao.fornecedor_cnpj}</p>
                        </div>
                      </div>
                    </div>
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
                  {detalhes.solicitacao.tipo_garantia && detalhes.solicitacao.tipo_garantia !== 'nenhuma' && (
                    <Badge variant="outline">
                      Garantia: {TIPO_GARANTIA_LABELS[detalhes.solicitacao.tipo_garantia]}
                      {detalhes.solicitacao.tipo_garantia === 'ambos' 
                        ? ` (S: ${detalhes.solicitacao.dias_garantia_servico || '—'}d, P: ${detalhes.solicitacao.dias_garantia_produto || '—'}d)`
                        : detalhes.solicitacao.dias_garantia ? ` (${detalhes.solicitacao.dias_garantia}d)` : ''
                      }
                    </Badge>
                  )}
                </div>

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

                <Separator />

                {/* Datas */}
                <div className="text-sm text-muted-foreground">
                  <p>Criado em: {format(new Date(detalhes.solicitacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  <p>Atualizado em: {format(new Date(detalhes.solicitacao.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
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
      <Dialog open={registroOpen} onOpenChange={setRegistroOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar OC Emitida</DialogTitle>
            <DialogDescription>
              Registre os dados da OC emitida para a solicitação #{selectedSolicitacao?.protocolo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="numero">Número da OC *</Label>
              <Input
                id="numero"
                placeholder="Ex: 2024001234"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="doc-file">Documento (PDF) *</Label>
              <Input
                id="doc-file"
                type="file"
                accept=".pdf"
                onChange={(e) => setDocumentoFile(e.target.files?.[0] || null)}
              />
            </div>

            <div>
              <Label htmlFor="obs">Observação (opcional)</Label>
              <Textarea
                id="obs"
                placeholder="Observações adicionais..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistroOpen(false)} disabled={registroLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRegistrarOCAC}
              disabled={registroLoading || !numeroDocumento || !documentoFile}
            >
              {registroLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Registrar OC
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
                          {format(new Date(doc.data_emissao_nf), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                      
                      {doc.tipo === 'boleto' && doc.data_vencimento_boleto && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Vencimento:</span>{' '}
                          {format(new Date(doc.data_vencimento_boleto), "dd/MM/yyyy", { locale: ptBR })}
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
                          Baixa em {format(new Date(doc.baixa_financeiro_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
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
                    onClick={handleDarBaixa}
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
    </AppLayout>
  );
}
