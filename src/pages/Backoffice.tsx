import { useEffect, useState } from 'react';
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
  type Profile
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
  Truck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SolicitacaoComDados extends Solicitacao {
  fornecedor?: Fornecedor | null;
  solicitante?: Profile | null;
}

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
  const [actionType, setActionType] = useState<'aprovar' | 'devolver' | 'rejeitar'>('aprovar');
  const [motivo, setMotivo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSolicitacoes();
  }, []);

  const fetchSolicitacoes = async () => {
    const { data, error } = await supabase
      .from('solicitacoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch fornecedores and profiles for each solicitacao
      const enrichedData = await Promise.all(
        data.map(async (sol) => {
          let fornecedor = null;
          let solicitante = null;

          if (sol.fornecedor_id) {
            const { data: forn } = await supabase
              .from('fornecedores')
              .select('*')
              .eq('id', sol.fornecedor_id)
              .single();
            fornecedor = forn;
          }

          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sol.user_id)
            .single();
          solicitante = prof;

          return { ...sol, fornecedor, solicitante } as SolicitacaoComDados;
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
      const acaoLabel = newStatus === 'aprovado' 
        ? 'Aprovação' 
        : newStatus === 'rejeitado' 
          ? 'Rejeição' 
          : 'Devolução para correção';

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: id,
        user_id: user!.id,
        acao: acaoLabel,
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const openDetails = (sol: SolicitacaoComDados) => {
    setSelectedSolicitacao(sol);
    setDetailsOpen(true);
  };

  const openAction = (sol: SolicitacaoComDados, type: 'aprovar' | 'devolver' | 'rejeitar') => {
    setSelectedSolicitacao(sol);
    setActionType(type);
    setMotivo('');
    setActionOpen(true);
  };

  const handleAction = () => {
    if (!selectedSolicitacao) return;
    
    const statusMap: Record<string, RequestStatus> = {
      'aprovar': 'aprovado',
      'devolver': 'pendente_correcao',
      'rejeitar': 'rejeitado',
    };
    
    updateStatus(selectedSolicitacao.id, statusMap[actionType], motivo);
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
    
    return matchesSearch && matchesEmpreendimento;
  });

  const pendentes = filteredSolicitacoes.filter(s => s.status === 'recebido' || s.status === 'em_analise');
  const aprovadas = filteredSolicitacoes.filter(s => s.status === 'aprovado');
  const devolvidas = filteredSolicitacoes.filter(s => s.status === 'pendente_correcao');
  const rejeitadas = filteredSolicitacoes.filter(s => s.status === 'rejeitado');

  const SolicitacaoCard = ({ sol }: { sol: SolicitacaoComDados }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={sol.tipo === 'AC' ? 'default' : 'secondary'}>
              {sol.tipo}
            </Badge>
            <CardTitle className="text-lg">#{sol.protocolo}</CardTitle>
          </div>
          <StatusBadge status={sol.status} />
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
              <span>{formatCurrency(sol.valor)}</span>
            </div>
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
          {(sol.status === 'recebido' || sol.status === 'em_analise') && (
            <>
              <Button size="sm" onClick={() => openAction(sol, 'aprovar')}>
                <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openAction(sol, 'devolver')}>
                <RotateCcw className="h-4 w-4 mr-1" /> Devolver
              </Button>
              <Button size="sm" variant="destructive" onClick={() => openAction(sol, 'rejeitar')}>
                <XCircle className="h-4 w-4 mr-1" /> Rejeitar
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{pendentes.length}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{aprovadas.length}</p>
                  <p className="text-xs text-muted-foreground">Aprovadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{devolvidas.length}</p>
                  <p className="text-xs text-muted-foreground">Devolvidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{rejeitadas.length}</p>
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
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="pendentes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pendentes" className="relative">
              Pendentes
              {pendentes.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {pendentes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="aprovadas">Aprovadas</TabsTrigger>
            <TabsTrigger value="devolvidas">Devolvidas</TabsTrigger>
            <TabsTrigger value="rejeitadas">Rejeitadas</TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes">
            <TabContent items={pendentes} emptyMessage="Nenhuma solicitação pendente" />
          </TabsContent>

          <TabsContent value="aprovadas">
            <TabContent items={aprovadas} emptyMessage="Nenhuma solicitação aprovada" />
          </TabsContent>

          <TabsContent value="devolvidas">
            <TabContent items={devolvidas} emptyMessage="Nenhuma solicitação devolvida" />
          </TabsContent>

          <TabsContent value="rejeitadas">
            <TabContent items={rejeitadas} emptyMessage="Nenhuma solicitação rejeitada" />
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
                {/* Status e Solicitante */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={selectedSolicitacao.status} />
                  {selectedSolicitacao.emergencial && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Emergencial
                    </Badge>
                  )}
                </div>

                <Separator />

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
                    <p className="font-medium">{selectedSolicitacao.origem_custo === 'empreendimento' ? 'Empreendimento' : 'Cliente'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor</Label>
                    <p className="font-medium text-primary">{formatCurrency(selectedSolicitacao.valor)}</p>
                    {selectedSolicitacao.faturamento_direto && (selectedSolicitacao.valor_servico || selectedSolicitacao.valor_material) && (
                      <div className="mt-2 p-2 rounded bg-muted/50 space-y-1 text-sm">
                        {selectedSolicitacao.valor_servico && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Serviço:</span>
                            <span>{formatCurrency(selectedSolicitacao.valor_servico)}</span>
                          </div>
                        )}
                        {selectedSolicitacao.valor_material && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Material:</span>
                            <span>{formatCurrency(selectedSolicitacao.valor_material)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium pt-1 border-t">
                          <span>Total FD:</span>
                          <span>{formatCurrency((selectedSolicitacao.valor_servico || 0) + (selectedSolicitacao.valor_material || 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

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
                        <div>
                          <Label className="text-muted-foreground">Cidade/UF</Label>
                          <p className="font-medium">
                            {selectedSolicitacao.fornecedor.cidade || 'N/A'} 
                            {selectedSolicitacao.fornecedor.uf && ` - ${selectedSolicitacao.fornecedor.uf}`}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Email</Label>
                          <p className="font-medium">{selectedSolicitacao.fornecedor.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Contratação (se AC) */}
                {selectedSolicitacao.tipo === 'AC' && selectedSolicitacao.tipo_contratacao && (
                  <>
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Package className="h-4 w-4" /> Contratação
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Tipo de Contratação</Label>
                          <p className="font-medium">{TIPO_CONTRATACAO_LABELS[selectedSolicitacao.tipo_contratacao]}</p>
                        </div>
                        {selectedSolicitacao.data_inicio && (
                          <div>
                            <Label className="text-muted-foreground">Data Início</Label>
                            <p className="font-medium">
                              {format(new Date(selectedSolicitacao.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        )}
                        {selectedSolicitacao.data_fim && (
                          <div>
                            <Label className="text-muted-foreground">Data Fim</Label>
                            <p className="font-medium">
                              {format(new Date(selectedSolicitacao.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        )}
                        <div>
                          <Label className="text-muted-foreground">Parcelas</Label>
                          <p className="font-medium">{selectedSolicitacao.parcelas || 1}x</p>
                        </div>
                      </div>
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
                  {selectedSolicitacao.tipo_garantia && (
                    <Badge variant="outline">Garantia: {TIPO_GARANTIA_LABELS[selectedSolicitacao.tipo_garantia]}</Badge>
                  )}
                  {selectedSolicitacao.dias_garantia && (
                    <Badge variant="outline">{selectedSolicitacao.dias_garantia} dias de garantia</Badge>
                  )}
                </div>

                {/* Datas */}
                <div className="text-sm text-muted-foreground">
                  <p>Criado em: {format(new Date(selectedSolicitacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  <p>Atualizado em: {format(new Date(selectedSolicitacao.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedSolicitacao && (selectedSolicitacao.status === 'recebido' || selectedSolicitacao.status === 'em_analise') && (
              <>
                <Button onClick={() => { setDetailsOpen(false); openAction(selectedSolicitacao, 'aprovar'); }}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                </Button>
                <Button variant="secondary" onClick={() => { setDetailsOpen(false); openAction(selectedSolicitacao, 'devolver'); }}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Devolver
                </Button>
                <Button variant="destructive" onClick={() => { setDetailsOpen(false); openAction(selectedSolicitacao, 'rejeitar'); }}>
                  <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
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
              {actionType === 'aprovar' && 'Aprovar Solicitação'}
              {actionType === 'devolver' && 'Devolver para Correção'}
              {actionType === 'rejeitar' && 'Rejeitar Solicitação'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'aprovar' && 'A solicitação será marcada como aprovada.'}
              {actionType === 'devolver' && 'Informe o motivo da devolução para que o solicitante possa corrigir.'}
              {actionType === 'rejeitar' && 'Informe o motivo da rejeição.'}
            </DialogDescription>
          </DialogHeader>

          {(actionType === 'devolver' || actionType === 'rejeitar') && (
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo *</Label>
              <Textarea
                id="motivo"
                placeholder="Descreva o motivo..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAction}
              disabled={actionLoading || ((actionType === 'devolver' || actionType === 'rejeitar') && !motivo.trim())}
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
    </AppLayout>
  );
}
