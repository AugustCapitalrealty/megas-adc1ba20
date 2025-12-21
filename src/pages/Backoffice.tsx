import { useEffect, useState, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Tabs removed - using Button groups instead
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';
import { FluigStatusCard } from '@/components/FluigStatusCard';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { supabase } from '@/integrations/supabase/client';
import { useBackofficeSolicitacoes, type SolicitacaoBackoffice } from '@/hooks/useBackofficeSolicitacoes';
import { useSolicitacaoDetalhes } from '@/hooks/useSolicitacaoDetalhes';
import { 
  EMPREENDIMENTO_LABELS, 
  NATUREZA_ORCAMENTARIA_LABELS,
  TIPO_CONTRATACAO_LABELS,
  TIPO_GARANTIA_LABELS,
  STATUS_LABELS,
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

  // Fetch details when opening details modal
  useEffect(() => {
    if (detailsOpen && selectedSolicitacao) {
      fetchDetalhes(selectedSolicitacao.id);
    } else if (!detailsOpen) {
      clearDetalhes();
    }
  }, [detailsOpen, selectedSolicitacao?.id, fetchDetalhes, clearDetalhes]);

  // Old N+1 fetch removed - now using useBackofficeSolicitacoes hook

  const updateStatus = async (id: string, newStatus: RequestStatus, motivoText?: string) => {
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

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: id,
        user_id: user!.id,
        acao: acaoLabels[newStatus] || 'Atualização de status',
        status_anterior: sol?.status,
        status_novo: newStatus,
        motivo: motivoText || null,
      });

      toast({ 
        title: 'Status atualizado!',
        description: `Solicitação ${STATUS_LABELS[newStatus].toLowerCase()}`,
      });
      fetchSolicitacoes();
      setActionOpen(false);
      setDetailsOpen(false);
      setMotivo('');
    } else {
      toast({ 
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status',
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
      await supabase
        .from('solicitacoes')
        .update({ status: 'aguardando_aceite' as any })
        .eq('id', selectedSolicitacao.id);

      // Create history entry
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: selectedSolicitacao.id,
        user_id: user.id,
        acao: `OC nº ${numeroDocumento} emitida - Aguardando aceite`,
        status_anterior: selectedSolicitacao.status,
        status_novo: 'aguardando_aceite',
        motivo: `OC nº ${numeroDocumento} emitida`,
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
      const newValue = editFluigValue || null;
      
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const openDetails = (sol: SolicitacaoBackoffice) => {
    setSelectedSolicitacao(sol);
    setDetailsOpen(true);
  };

  const openAction = (sol: SolicitacaoBackoffice, type: typeof actionType) => {
    setSelectedSolicitacao(sol);
    setActionType(type);
    setMotivo('');
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
    
    updateStatus(selectedSolicitacao.id, statusMap[actionType], motivo);
    setNumeroChamadoFluig('');
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
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center gap-2">
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
              <Button size="sm" variant="default" onClick={() => openRegistro(sol)}>
                <FileCheck className="h-4 w-4 mr-1" /> Registrar OC
              </Button>
            )}

            {/* Ações adicionais para Em Processamento */}
            {sol.status === 'em_processamento' && (
              <>
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

        {/* Grouped Filter Tabs */}
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-2 lg:items-center">
          {/* Em Andamento */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Em Andamento</span>
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'recebidas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('recebidas')}
                className="gap-1 text-xs h-8"
              >
                Recebidas
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center">{groupedSolicitacoes.recebidas.length}</Badge>
              </Button>
              <Button
                variant={activeTab === 'em_processamento' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('em_processamento')}
                className="gap-1 text-xs h-8"
              >
                Em Proc.
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center">{groupedSolicitacoes.em_processamento.length}</Badge>
              </Button>
              <Button
                variant={activeTab === 'oc_emitidas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('oc_emitidas')}
                className="gap-1 text-xs h-8"
              >
                OC Emitida
                {groupedSolicitacoes.oc_emitidas.length > 0 && (
                  <Badge variant="default" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center bg-success">{groupedSolicitacoes.oc_emitidas.length}</Badge>
                )}
              </Button>
              <Button
                variant={activeTab === 'nf_boleto' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('nf_boleto')}
                className="gap-1 text-xs h-8"
              >
                NF/Boleto
                {groupedSolicitacoes.nf_boleto.length > 0 && (
                  <Badge variant="default" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center bg-[hsl(260,70%,50%)]">{groupedSolicitacoes.nf_boleto.length}</Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Separator */}
          <div className="hidden lg:block w-px h-12 bg-border mx-2" />
          <div className="lg:hidden h-px w-full bg-border" />

          {/* Ações Pendentes */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-destructive uppercase tracking-wider px-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Ações Pendentes
            </span>
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'pendentes' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('pendentes')}
                className={cn(
                  "gap-1 text-xs h-8",
                  activeTab !== 'pendentes' && groupedSolicitacoes.pendentes.length > 0 && "border-destructive text-destructive hover:bg-destructive/10"
                )}
              >
                Correções
                {groupedSolicitacoes.pendentes.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center animate-pulse">{groupedSolicitacoes.pendentes.length}</Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Separator */}
          <div className="hidden lg:block w-px h-12 bg-border mx-2" />
          <div className="lg:hidden h-px w-full bg-border" />

          {/* Finalizadas */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Finalizadas</span>
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'rejeitadas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('rejeitadas')}
                className="gap-1 text-xs h-8"
              >
                Rejeitadas
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center">{groupedSolicitacoes.rejeitadas.length}</Badge>
              </Button>
              <Button
                variant={activeTab === 'concluidas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('concluidas')}
                className="gap-1 text-xs h-8"
              >
                Concluídas
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center">{groupedSolicitacoes.concluidas.length}</Badge>
              </Button>
            </div>
          </div>
        </div>

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
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant={selectedSolicitacao?.tipo === 'AC' ? 'default' : 'secondary'}>
                {selectedSolicitacao?.tipo}
              </Badge>
              #{selectedSolicitacao?.protocolo}
            </DialogTitle>
            <DialogDescription>Detalhes completos da solicitação</DialogDescription>
          </DialogHeader>
          
          {detalhesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : detalhes?.solicitacao ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Status e SLA */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <StatusBadge status={detalhes.solicitacao.status} />
                  {detalhes.solicitacao.emergencial && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Emergencial
                    </Badge>
                  )}
                  {selectedSolicitacao && (() => {
                    const sla = getSLAInfo(selectedSolicitacao);
                    return (
                      <div className="flex gap-2 text-xs">
                        <Badge variant={sla.atrasadoAnalise ? "destructive" : "outline"}>
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
                </div>

                <Separator />

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

                {/* Descrição */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Descrição
                  </h4>
                  <ExpandableDescription 
                    description={detalhes.solicitacao.descricao} 
                    maxLength={150}
                  />
                </div>

                <Separator />

                {/* Informações Gerais */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Empreendimento</Label>
                    <p className="font-medium">{EMPREENDIMENTO_LABELS[detalhes.solicitacao.empreendimento]}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Natureza Orçamentária</Label>
                    <p className="font-medium">{NATUREZA_ORCAMENTARIA_LABELS[detalhes.solicitacao.natureza_orcamentaria]}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Origem do Custo</Label>
                    <p className="font-medium">
                      {detalhes.solicitacao.origem_custo === 'empreendimento' ? 'Área comum' : 'Cliente'}
                      {detalhes.cliente && (
                        <span className="text-primary"> ({detalhes.cliente.nome})</span>
                      )}
                    </p>
                  </div>
                  {detalhes.solicitacao.faturamento_direto ? (
                    <div className="col-span-2 p-3 bg-muted/30 rounded-lg space-y-2">
                      <Label className="text-muted-foreground font-medium">Valores (Faturamento Direto)</Label>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor Material</Label>
                          <p className="font-medium">{formatCurrency(detalhes.solicitacao.valor_material || 0)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor Serviço</Label>
                          <p className="font-medium">{formatCurrency(detalhes.solicitacao.valor_servico || 0)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor Total</Label>
                          <p className="font-medium text-primary">
                            {formatCurrency((detalhes.solicitacao.valor_servico || 0) + (detalhes.solicitacao.valor_material || 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-muted-foreground">Valor</Label>
                      <p className="font-medium text-primary">{formatCurrency(detalhes.solicitacao.valor)}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Anexos */}
                {detalhes.anexos && detalhes.anexos.length > 0 && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Archive className="h-4 w-4" /> Anexos ({detalhes.anexos.length})
                        </h4>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadAnexosZip(detalhes.solicitacao.id, detalhes.anexos, detalhes.solicitacao.protocolo)}
                          disabled={downloadingZip}
                        >
                          {downloadingZip ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          Baixar Todos (ZIP)
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {detalhes.anexos.map((anexo) => (
                          <div key={anexo.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                            <span className="truncate flex-1">{anexo.nome_arquivo}</span>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={async () => {
                                const { data } = await supabase.storage.from('anexos').download(anexo.storage_path);
                                if (data) saveAs(data, anexo.nome_arquivo);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
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

                {/* Histórico / Timeline */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Histórico
                  </h4>
                  <SolicitacaoTimeline solicitacaoId={detalhes.solicitacao.id} />
                </div>

                <Separator />

                {/* Datas */}
                <div className="text-sm text-muted-foreground">
                  <p>Criado em: {format(new Date(detalhes.solicitacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  <p>Atualizado em: {format(new Date(detalhes.solicitacao.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
            </ScrollArea>
          ) : null}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedSolicitacao && (
              <>
                {(selectedSolicitacao.status === 'recebido' || selectedSolicitacao.status === 'em_analise') && (
                  <>
                    <Button onClick={() => { setDetailsOpen(false); openAction(selectedSolicitacao, 'assumir'); }}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Assumir
                    </Button>
                    <Button variant="outline" onClick={() => { setDetailsOpen(false); openAction(selectedSolicitacao, 'solicitar_ajuste'); }}>
                      <HelpCircle className="h-4 w-4 mr-1" /> Solicitar Ajuste
                    </Button>
                    <Button variant="destructive" onClick={() => { setDetailsOpen(false); openAction(selectedSolicitacao, 'rejeitar'); }}>
                      <XCircle className="h-4 w-4 mr-1" /> Rejeitar
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
    </AppLayout>
  );
}
