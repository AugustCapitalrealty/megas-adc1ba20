import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  EMPREENDIMENTO_LABELS, 
  NATUREZA_ORCAMENTARIA_LABELS,
  type Solicitacao,
  type NaturezaOrcamentaria,
} from '@/types';
import { Loader2, FileText, ChevronDown, ChevronUp, Edit, Send, Clock, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SolicitacaoTimeline } from '@/components/SolicitacaoTimeline';
import { MultiFileUpload, type UploadedFile } from '@/components/FileUpload';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Attachment type definitions (same as NovaSolicitacao)
const ATTACHMENT_TYPES = {
  chamado_preventiva: 'Chamado / Preventiva (Infraspeak)',
  escopo_detalhado: 'Escopo Detalhado',
  mapa_cotacao: 'Mapa de Cotação',
  orcamento_escolhido: 'Orçamento Escolhido',
  orcamento_concorrente_1: 'Orçamento Concorrente 1',
  orcamento_concorrente_2: 'Orçamento Concorrente 2',
} as const;

export default function MinhasSolicitacoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editingSolicitacao, setEditingSolicitacao] = useState<Solicitacao | null>(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editNaturezaOrcamentaria, setEditNaturezaOrcamentaria] = useState<NaturezaOrcamentaria | ''>('');
  const [editAnexos, setEditAnexos] = useState<Record<string, UploadedFile | null>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSolicitacoes();
    }
  }, [user]);

  const fetchSolicitacoes = async () => {
    const { data, error } = await supabase
      .from('solicitacoes')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSolicitacoes(data as unknown as Solicitacao[]);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openEditModal = (sol: Solicitacao) => {
    setEditingSolicitacao(sol);
    setEditDescricao(sol.descricao);
    setEditValor(String(Math.round(sol.valor * 100)));
    setEditNaturezaOrcamentaria(sol.natureza_orcamentaria);
    setEditAnexos({});
    setEditOpen(true);
  };

  const getRequiredAttachments = (sol: Solicitacao) => {
    const isOC = sol.tipo === 'OC';
    const isAC = sol.tipo === 'AC';
    
    if (isOC) {
      return [
        { tipo: 'chamado_preventiva', label: ATTACHMENT_TYPES.chamado_preventiva, required: false },
        { tipo: 'orcamento_escolhido', label: ATTACHMENT_TYPES.orcamento_escolhido, required: false },
      ];
    }
    
    if (isAC && sol.emergencial) {
      return [
        { tipo: 'chamado_preventiva', label: ATTACHMENT_TYPES.chamado_preventiva, required: false },
        { tipo: 'orcamento_escolhido', label: ATTACHMENT_TYPES.orcamento_escolhido, required: false },
      ];
    }
    
    if (isAC && !sol.emergencial) {
      return [
        { tipo: 'chamado_preventiva', label: ATTACHMENT_TYPES.chamado_preventiva, required: false },
        { tipo: 'escopo_detalhado', label: ATTACHMENT_TYPES.escopo_detalhado, required: false },
        { tipo: 'mapa_cotacao', label: ATTACHMENT_TYPES.mapa_cotacao, required: false },
        { tipo: 'orcamento_escolhido', label: ATTACHMENT_TYPES.orcamento_escolhido, required: false },
        { tipo: 'orcamento_concorrente_1', label: ATTACHMENT_TYPES.orcamento_concorrente_1, required: false },
        { tipo: 'orcamento_concorrente_2', label: ATTACHMENT_TYPES.orcamento_concorrente_2, required: false },
      ];
    }
    
    return [];
  };

  const uploadNewAnexos = async (solicitacaoId: string) => {
    const uploadPromises = Object.entries(editAnexos)
      .filter(([_, file]) => file !== null)
      .map(async ([tipo, uploadedFile]) => {
        if (!uploadedFile) return;
        
        const { file } = uploadedFile;
        const fileExt = file.name.split('.').pop();
        const filePath = `${solicitacaoId}/${tipo}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('anexos')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { error: dbError } = await supabase
          .from('anexos')
          .insert({
            solicitacao_id: solicitacaoId,
            tipo,
            nome_arquivo: file.name,
            storage_path: filePath,
            mime_type: file.type,
            tamanho_bytes: file.size,
          });
        
        if (dbError) throw dbError;
      });
    
    await Promise.all(uploadPromises);
  };

  const handleResubmit = async () => {
    if (!editingSolicitacao || !user) return;
    
    setSubmitting(true);
    try {
      const valorNumerico = parseFloat(editValor.replace(/\D/g, '')) / 100 || 0;
      
      // Update solicitacao
      const { error: updateError } = await supabase
        .from('solicitacoes')
        .update({
          descricao: editDescricao,
          valor: valorNumerico,
          natureza_orcamentaria: editNaturezaOrcamentaria as any,
          status: 'recebido',
        })
        .eq('id', editingSolicitacao.id);

      if (updateError) throw updateError;

      // Upload new attachments if any
      await uploadNewAnexos(editingSolicitacao.id);

      // Create history entry for resubmission
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: editingSolicitacao.id,
        user_id: user.id,
        acao: 'reenvio',
        status_anterior: 'pendente_correcao',
        status_novo: 'recebido',
      });

      toast({
        title: 'Solicitação reenviada!',
        description: 'Sua correção foi enviada para análise.',
      });

      setEditOpen(false);
      fetchSolicitacoes();
    } catch (error) {
      console.error('Error resubmitting:', error);
      toast({
        title: 'Erro ao reenviar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

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
        <div>
          <h1 className="text-2xl font-bold">Minhas Solicitações</h1>
          <p className="text-muted-foreground">Acompanhe o status das suas solicitações</p>
        </div>

        {solicitacoes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Você ainda não tem solicitações</p>
              <Button className="mt-4" onClick={() => navigate('/nova-solicitacao')}>
                Criar Solicitação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {solicitacoes.map((sol) => (
              <Card key={sol.id} className={cn(
                'transition-shadow',
                sol.status === 'pendente_correcao' && 'border-warning'
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">#{sol.protocolo}</CardTitle>
                      <StatusBadge status={sol.status} />
                      {sol.emergencial && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                          Emergencial
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {sol.status === 'pendente_correcao' && (
                        <Button variant="outline" size="sm" onClick={() => openEditModal(sol)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Corrigir
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(sol.id)}
                      >
                        {expandedId === sol.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo</span>
                      <span className="font-medium">{sol.tipo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Empreendimento</span>
                      <span>{EMPREENDIMENTO_LABELS[sol.empreendimento]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor</span>
                      <span>{formatCurrency(sol.valor)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data</span>
                      <span>{format(new Date(sol.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                    <p className="text-muted-foreground mt-2 line-clamp-2">{sol.descricao}</p>
                  </div>

                  {/* Expanded content - Timeline */}
                  {expandedId === sol.id && (
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex items-center gap-2 mb-4">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium">Histórico</h4>
                      </div>
                      <SolicitacaoTimeline solicitacaoId={sol.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal for Returned Requests */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Corrigir Solicitação #{editingSolicitacao?.protocolo}</DialogTitle>
          </DialogHeader>
          
          {editingSolicitacao && (
            <div className="space-y-4">
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label>Valor (R$)</Label>
                <Input
                  value={editValor ? formatCurrencyInput(editValor) : ''}
                  onChange={(e) => setEditValor(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div>
                <Label>Natureza Orçamentária</Label>
                <Select 
                  value={editNaturezaOrcamentaria} 
                  onValueChange={(v) => setEditNaturezaOrcamentaria(v as NaturezaOrcamentaria)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(NATUREZA_ORCAMENTARIA_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Adicionar Novos Anexos (opcional)</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Anexe novos documentos se necessário
                </p>
                <MultiFileUpload
                  requirements={getRequiredAttachments(editingSolicitacao)}
                  files={editAnexos}
                  onFilesChange={setEditAnexos}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Reenviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}