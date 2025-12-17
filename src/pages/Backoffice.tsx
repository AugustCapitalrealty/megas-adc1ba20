import { useEffect, useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';
import { supabase } from '@/integrations/supabase/client';
import { 
  EMPREENDIMENTO_LABELS, 
  NATUREZA_ORCAMENTARIA_LABELS,
  TIPO_CONTRATACAO_LABELS,
  TIPO_GARANTIA_LABELS,
  STATUS_LABELS,
  type Solicitacao, 
  type RequestStatus,
  type Fornecedor,
  type Profile,
  type Cliente,
  type Anexo,
  type DocumentoEmitido
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
  Filter
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface SolicitacaoComDados extends Solicitacao {
  fornecedor?: Fornecedor | null;
  solicitante?: Profile | null;
  clienteData?: Cliente | null;
  anexos?: Anexo[];
  documentoEmitido?: DocumentoEmitido | null;
  dataAprovacao?: string | null;
  responsavelId?: string | null;
  responsavelNome?: string | null;
}

type BackofficeTab = 'recebidas' | 'pendentes' | 'em_processamento' | 'oc_emitidas' | 'concluidas' | 'rejeitadas';

export default function Backoffice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoComDados[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<string>('todos');
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<SolicitacaoComDados | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<'assumir' | 'rejeitar' | 'processar' | 'concluir' | 'solicitar_ajuste'>('assumir');
  const [motivo, setMotivo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<BackofficeTab>('recebidas');
  const [numeroChamadoFluig, setNumeroChamadoFluig] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // Registro OC Modal
  const [registroOpen, setRegistroOpen] = useState(false);
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [observacao, setObservacao] = useState('');
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [registroLoading, setRegistroLoading] = useState(false);

  // Download ZIP
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    fetchSolicitacoes();
  }, []);

  const fetchSolicitacoes = async () => {
    const { data, error } = await supabase
      .from('solicitacoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const enrichedData = await Promise.all(
        data.map(async (sol) => {
          let fornecedor = null;
          let solicitante = null;
          let clienteData = null;
          let anexos: Anexo[] = [];
          let documentoEmitido = null;
          let dataAprovacao = null;

          if (sol.fornecedor_id) {
            const { data: forn } = await supabase
              .from('fornecedores')
              .select('*')
              .eq('id', sol.fornecedor_id)
              .maybeSingle();
            fornecedor = forn;
          }

          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sol.user_id)
            .maybeSingle();
          solicitante = prof;

          if (sol.cliente_id) {
            const { data: cli } = await supabase
              .from('clientes')
              .select('*')
              .eq('id', sol.cliente_id)
              .maybeSingle();
            clienteData = cli;
          }

          // Fetch anexos
          const { data: anexosData } = await supabase
            .from('anexos')
            .select('*')
            .eq('solicitacao_id', sol.id);
          if (anexosData) anexos = anexosData as Anexo[];

          // Fetch documento emitido
          const { data: docData } = await supabase
            .from('documentos_emitidos')
            .select('*')
            .eq('solicitacao_id', sol.id)
            .maybeSingle();
          documentoEmitido = docData as DocumentoEmitido | null;

          // Fetch data de aprovação e responsável do histórico
          const { data: histData } = await supabase
            .from('historico_solicitacoes')
            .select('created_at, user_id')
            .eq('solicitacao_id', sol.id)
            .eq('status_novo', 'aprovado')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          let responsavelId = null;
          let responsavelNome = null;
          
          if (histData) {
            dataAprovacao = histData.created_at;
            responsavelId = histData.user_id;
            
            // Fetch responsavel name
            const { data: respProfile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', histData.user_id)
              .maybeSingle();
            
            if (respProfile) {
              responsavelNome = respProfile.full_name || respProfile.email;
            }
          }

          return { ...sol, fornecedor, solicitante, clienteData, anexos, documentoEmitido, dataAprovacao, responsavelId, responsavelNome } as SolicitacaoComDados;
        })
      );
      setSolicitacoes(enrichedData);
    }
    setLoading(false);
  };

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

  const downloadAnexosZip = async (sol: SolicitacaoComDados) => {
    if (!sol.anexos || sol.anexos.length === 0) {
      toast({ title: 'Nenhum anexo', description: 'Esta solicitação não possui anexos.' });
      return;
    }

    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      
      for (const anexo of sol.anexos) {
        const { data, error } = await supabase.storage
          .from('anexos')
          .download(anexo.storage_path);
        
        if (!error && data) {
          zip.file(anexo.nome_arquivo, data);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `anexos_${sol.protocolo}.zip`);
      
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const openDetails = (sol: SolicitacaoComDados) => {
    setSelectedSolicitacao(sol);
    setDetailsOpen(true);
  };

  const openAction = (sol: SolicitacaoComDados, type: typeof actionType) => {
    setSelectedSolicitacao(sol);
    setActionType(type);
    setMotivo('');
    setActionOpen(true);
  };

  const openRegistro = (sol: SolicitacaoComDados) => {
    setSelectedSolicitacao(sol);
    setNumeroDocumento('');
    setObservacao('');
    setDocumentoFile(null);
    setRegistroOpen(true);
  };

  const handleAction = async () => {
    if (!selectedSolicitacao) return;
    
    const statusMap: Record<string, RequestStatus> = {
      'assumir': 'aprovado',
      'rejeitar': 'rejeitado',
      'processar': 'em_processamento',
      'concluir': 'concluida',
      'solicitar_ajuste': 'aguardando_informacoes',
    };
    
    // If processing, also save the Fluig number
    if (actionType === 'processar' && numeroChamadoFluig) {
      await supabase
        .from('solicitacoes')
        .update({ numero_chamado_fluig: numeroChamadoFluig })
        .eq('id', selectedSolicitacao.id);
    }
    
    updateStatus(selectedSolicitacao.id, statusMap[actionType], motivo);
    setNumeroChamadoFluig('');
  };

  // Filter and group solicitacoes
  const filteredSolicitacoes = solicitacoes.filter((sol) => {
    const matchesSearch = 
      sol.protocolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sol.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sol.solicitante?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sol.solicitante?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEmpreendimento = 
      selectedEmpreendimento === 'todos' || 
      sol.empreendimento === selectedEmpreendimento;

    const matchesMineFilter = !showOnlyMine || sol.responsavelId === user?.id;
    
    return matchesSearch && matchesEmpreendimento && matchesMineFilter;
  });

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
    pendentes: filteredSolicitacoes.filter(s => s.status === 'pendente_correcao' || s.status === 'aguardando_informacoes'),
    concluidas: filteredSolicitacoes.filter(s => s.status === 'concluida'),
    rejeitadas: filteredSolicitacoes.filter(s => s.status === 'rejeitado'),
  }), [filteredSolicitacoes]);

  // SLA calculation
  const getSLAInfo = (sol: SolicitacaoComDados) => {
    const diasDesdeAbertura = differenceInDays(new Date(), new Date(sol.created_at));
    const diasDesdeAprovacao = sol.dataAprovacao 
      ? differenceInDays(new Date(), new Date(sol.dataAprovacao))
      : null;
    
    const atrasadoAnalise = diasDesdeAbertura > 5 && ['recebido', 'em_analise'].includes(sol.status);
    const atrasadoEmissao = diasDesdeAprovacao !== null && diasDesdeAprovacao > 3 && 
      ['aprovado', 'em_processamento'].includes(sol.status);
    
    return { diasDesdeAbertura, diasDesdeAprovacao, atrasadoAnalise, atrasadoEmissao };
  };

  const SolicitacaoCard = ({ sol }: { sol: SolicitacaoComDados }) => {
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
            <Badge variant="outline" className="text-xs">Fluig: {sol.numero_chamado_fluig}</Badge>
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
              <span>{sol.solicitante?.full_name || sol.solicitante?.email || 'Usuário'}</span>
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
                <span>
                  {sol.faturamento_direto && sol.valor_servico !== null && sol.valor_material !== null
                    ? formatCurrency((sol.valor_servico || 0) + (sol.valor_material || 0))
                    : formatCurrency(sol.valor)
                  }
                </span>
              </div>
            </div>
            
            {/* SLA Info */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <span className={cn(
                "text-xs",
                sla.atrasadoAnalise ? "text-destructive font-semibold" : "text-muted-foreground"
              )}>
                {sla.diasDesdeAbertura}d desde abertura
              </span>
              {sla.diasDesdeAprovacao !== null && (
                <span className={cn(
                  "text-xs",
                  sla.atrasadoEmissao ? "text-destructive font-semibold" : "text-muted-foreground"
                )}>
                  {sla.diasDesdeAprovacao}d desde aprovação
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

          <div className="flex gap-2 flex-wrap">
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
                <Cog className="h-4 w-4 mr-1" /> Em Processamento
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
          </div>
        </CardContent>
      </Card>
    );
  };

  const TabContent = ({ items, emptyMessage }: { items: SolicitacaoComDados[], emptyMessage: string }) => (
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('recebidas')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-info" />
                <div>
                  <p className="text-2xl font-bold">{groupedSolicitacoes.recebidas.length}</p>
                  <p className="text-xs text-muted-foreground">Recebidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('pendentes')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{groupedSolicitacoes.pendentes.length}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('em_processamento')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Cog className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{groupedSolicitacoes.em_processamento.length}</p>
                  <p className="text-xs text-muted-foreground">Em Proc.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('oc_emitidas')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{groupedSolicitacoes.oc_emitidas.length}</p>
                  <p className="text-xs text-muted-foreground">Emitidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('concluidas')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCheck className="h-5 w-5 text-success" />
                <div>
                  <p className="text-2xl font-bold">{groupedSolicitacoes.concluidas.length}</p>
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('rejeitadas')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{groupedSolicitacoes.rejeitadas.length}</p>
                  <p className="text-xs text-muted-foreground">Rejeitadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BackofficeTab)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="recebidas" className="relative text-xs sm:text-sm">
              Recebidas
              {groupedSolicitacoes.recebidas.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center">
                  {groupedSolicitacoes.recebidas.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="text-xs sm:text-sm">Pendentes</TabsTrigger>
            <TabsTrigger value="em_processamento" className="text-xs sm:text-sm">Em Proc.</TabsTrigger>
            <TabsTrigger value="oc_emitidas" className="text-xs sm:text-sm">Emitidas</TabsTrigger>
            <TabsTrigger value="concluidas" className="text-xs sm:text-sm">Concluídas</TabsTrigger>
            <TabsTrigger value="rejeitadas" className="text-xs sm:text-sm">Rejeitadas</TabsTrigger>
          </TabsList>

          <TabsContent value="recebidas">
            <TabContent items={groupedSolicitacoes.recebidas} emptyMessage="Nenhuma solicitação recebida" />
          </TabsContent>
          <TabsContent value="pendentes">
            <TabContent items={groupedSolicitacoes.pendentes} emptyMessage="Nenhuma solicitação pendente de correção" />
          </TabsContent>
          <TabsContent value="em_processamento">
            <TabContent items={groupedSolicitacoes.em_processamento} emptyMessage="Nenhuma solicitação em processamento" />
          </TabsContent>
          <TabsContent value="oc_emitidas">
            <TabContent items={groupedSolicitacoes.oc_emitidas} emptyMessage="Nenhuma OC emitida" />
          </TabsContent>
          <TabsContent value="concluidas">
            <TabContent items={groupedSolicitacoes.concluidas} emptyMessage="Nenhuma solicitação concluída" />
          </TabsContent>
          <TabsContent value="rejeitadas">
            <TabContent items={groupedSolicitacoes.rejeitadas} emptyMessage="Nenhuma solicitação rejeitada" />
          </TabsContent>
        </Tabs>
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
          
          {selectedSolicitacao && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Status e SLA */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <StatusBadge status={selectedSolicitacao.status} />
                  {selectedSolicitacao.emergencial && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Emergencial
                    </Badge>
                  )}
                  {(() => {
                    const sla = getSLAInfo(selectedSolicitacao);
                    return (
                      <div className="flex gap-2 text-xs">
                        <Badge variant={sla.atrasadoAnalise ? "destructive" : "outline"}>
                          {sla.diasDesdeAbertura}d desde abertura
                        </Badge>
                        {sla.diasDesdeAprovacao !== null && (
                          <Badge variant={sla.atrasadoEmissao ? "destructive" : "outline"}>
                            {sla.diasDesdeAprovacao}d desde aprovação
                          </Badge>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <Separator />

                {/* Documento Emitido (se existir) */}
                {selectedSolicitacao.documentoEmitido && (
                  <>
                    <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-success">
                        <FileCheck className="h-4 w-4" /> Documento Emitido
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Tipo</Label>
                          <p className="font-medium">{selectedSolicitacao.documentoEmitido.tipo_documento}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Número</Label>
                          <p className="font-medium">{selectedSolicitacao.documentoEmitido.numero_documento}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-3"
                        onClick={() => downloadDocumentoEmitido(selectedSolicitacao.documentoEmitido!)}
                      >
                        <Download className="h-4 w-4 mr-1" /> Baixar {selectedSolicitacao.documentoEmitido.tipo_documento}
                      </Button>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Solicitante */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" /> Solicitante
                  </h4>
                  <p>{selectedSolicitacao.solicitante?.full_name || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{selectedSolicitacao.solicitante?.email}</p>
                </div>

                <Separator />

                {/* Descrição */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Descrição
                  </h4>
                  <p className="text-sm">{selectedSolicitacao.descricao}</p>
                </div>

                <Separator />

                {/* Informações Gerais */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Empreendimento</Label>
                    <p className="font-medium">{EMPREENDIMENTO_LABELS[selectedSolicitacao.empreendimento]}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Natureza Orçamentária</Label>
                    <p className="font-medium">{NATUREZA_ORCAMENTARIA_LABELS[selectedSolicitacao.natureza_orcamentaria]}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Origem do Custo</Label>
                    <p className="font-medium">
                      {selectedSolicitacao.origem_custo === 'empreendimento' ? 'Área comum' : 'Cliente'}
                      {selectedSolicitacao.clienteData && (
                        <span className="text-primary"> ({selectedSolicitacao.clienteData.nome})</span>
                      )}
                    </p>
                  </div>
                  {selectedSolicitacao.faturamento_direto ? (
                    <div className="col-span-2 p-3 bg-muted/30 rounded-lg space-y-2">
                      <Label className="text-muted-foreground font-medium">Valores (Faturamento Direto)</Label>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor Material</Label>
                          <p className="font-medium">{formatCurrency(selectedSolicitacao.valor_material || 0)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor Serviço</Label>
                          <p className="font-medium">{formatCurrency(selectedSolicitacao.valor_servico || 0)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Valor Total</Label>
                          <p className="font-medium text-primary">
                            {formatCurrency((selectedSolicitacao.valor_servico || 0) + (selectedSolicitacao.valor_material || 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-muted-foreground">Valor</Label>
                      <p className="font-medium text-primary">{formatCurrency(selectedSolicitacao.valor)}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Anexos */}
                {selectedSolicitacao.anexos && selectedSolicitacao.anexos.length > 0 && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Archive className="h-4 w-4" /> Anexos ({selectedSolicitacao.anexos.length})
                        </h4>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadAnexosZip(selectedSolicitacao)}
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
                        {selectedSolicitacao.anexos.map((anexo) => (
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
                {selectedSolicitacao.fornecedor && (
                  <>
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Truck className="h-4 w-4" /> Fornecedor
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Razão Social</Label>
                          <p className="font-medium">{selectedSolicitacao.fornecedor.razao_social || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">CNPJ</Label>
                          <p className="font-medium">{selectedSolicitacao.fornecedor.cnpj}</p>
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Justificativa de Fornecedor Único */}
                {selectedSolicitacao.justificativa_fornecedores && (
                  <>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <Label className="text-muted-foreground font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Justificativa para Fornecedor Único
                      </Label>
                      <p className="mt-2 text-sm">{selectedSolicitacao.justificativa_fornecedores}</p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Flags */}
                <div className="flex flex-wrap gap-2">
                  {selectedSolicitacao.contrato_mensal && <Badge variant="outline">Contrato Mensal</Badge>}
                  {selectedSolicitacao.faturamento_direto && <Badge variant="outline">Faturamento Direto</Badge>}
                  {selectedSolicitacao.retencao_6_porcento && <Badge variant="outline">Retenção 6%</Badge>}
                  {selectedSolicitacao.custo_cliente && <Badge variant="outline">Custo Cliente</Badge>}
                  {selectedSolicitacao.tipo_garantia && selectedSolicitacao.tipo_garantia !== 'nenhuma' && (
                    <Badge variant="outline">
                      Garantia: {TIPO_GARANTIA_LABELS[selectedSolicitacao.tipo_garantia]}
                      {selectedSolicitacao.tipo_garantia === 'ambos' 
                        ? ` (S: ${selectedSolicitacao.dias_garantia_servico || '—'}d, P: ${selectedSolicitacao.dias_garantia_produto || '—'}d)`
                        : selectedSolicitacao.dias_garantia ? ` (${selectedSolicitacao.dias_garantia}d)` : ''
                      }
                    </Badge>
                  )}
                </div>

                {/* Histórico / Timeline */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Histórico
                  </h4>
                  <SolicitacaoTimeline solicitacaoId={selectedSolicitacao.id} />
                </div>

                <Separator />

                {/* Datas */}
                <div className="text-sm text-muted-foreground">
                  <p>Criado em: {format(new Date(selectedSolicitacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  <p>Atualizado em: {format(new Date(selectedSolicitacao.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
            </ScrollArea>
          )}

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
                    <FileCheck className="h-4 w-4 mr-1" /> Registrar {selectedSolicitacao.tipo}
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
            <div className="space-y-2">
              <Label htmlFor="fluig">Número do Chamado Fluig (opcional)</Label>
              <Input
                id="fluig"
                placeholder="Ex: CHM-2024-001234"
                value={numeroChamadoFluig}
                onChange={(e) => setNumeroChamadoFluig(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Registre o número do chamado aberto no Fluig/RM para rastreabilidade.
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
    </AppLayout>
  );
}
