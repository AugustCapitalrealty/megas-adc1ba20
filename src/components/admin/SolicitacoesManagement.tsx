import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  Search, 
  Trash2, 
  AlertTriangle,
  FileText,
  Calendar
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RequestStatus } from '@/types';

interface Solicitacao {
  id: string;
  protocolo: string;
  status: RequestStatus;
  tipo: string;
  descricao: string;
  valor: number;
  created_at: string;
  empreendimento: string;
  solicitante_nome: string | null;
  solicitante_email: string;
}

export function SolicitacoesManagement() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<Solicitacao | null>(null);
  const [confirmProtocolo, setConfirmProtocolo] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSolicitacoes();
  }, []);

  const fetchSolicitacoes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('solicitacoes')
        .select(`
          id,
          protocolo,
          status,
          tipo,
          descricao,
          valor,
          created_at,
          empreendimento,
          profiles!solicitacoes_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData: Solicitacao[] = (data || []).map((s: any) => ({
        id: s.id,
        protocolo: s.protocolo,
        status: s.status,
        tipo: s.tipo,
        descricao: s.descricao,
        valor: s.valor,
        created_at: s.created_at,
        empreendimento: s.empreendimento,
        solicitante_nome: s.profiles?.full_name || null,
        solicitante_email: s.profiles?.email || 'Desconhecido',
      }));

      setSolicitacoes(formattedData);
    } catch (error) {
      console.error('Error fetching solicitacoes:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (solicitacao: Solicitacao) => {
    setSelectedSolicitacao(solicitacao);
    setConfirmProtocolo('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSolicitacao) return;
    if (confirmProtocolo !== selectedSolicitacao.protocolo) {
      toast.error('Protocolo incorreto');
      return;
    }

    setDeleting(true);
    try {
      // 1. Buscar anexos para deletar do storage
      const { data: anexos } = await supabase
        .from('anexos')
        .select('storage_path')
        .eq('solicitacao_id', selectedSolicitacao.id);

      // 2. Buscar documentos fiscais para deletar do storage
      const { data: docsFiscais } = await supabase
        .from('documentos_fiscais')
        .select('storage_path')
        .eq('solicitacao_id', selectedSolicitacao.id);

      // 3. Buscar documentos emitidos para deletar do storage
      const { data: docsEmitidos } = await supabase
        .from('documentos_emitidos')
        .select('storage_path')
        .eq('solicitacao_id', selectedSolicitacao.id);

      // 4. Deletar arquivos do storage
      const storageDeletes: Promise<any>[] = [];

      if (anexos && anexos.length > 0) {
        storageDeletes.push(
          supabase.storage
            .from('anexos')
            .remove(anexos.map(a => a.storage_path))
        );
      }

      if (docsFiscais && docsFiscais.length > 0) {
        storageDeletes.push(
          supabase.storage
            .from('documentos-fiscais')
            .remove(docsFiscais.map(d => d.storage_path))
        );
      }

      if (docsEmitidos && docsEmitidos.length > 0) {
        storageDeletes.push(
          supabase.storage
            .from('documentos-emitidos')
            .remove(docsEmitidos.map(d => d.storage_path))
        );
      }

      await Promise.all(storageDeletes);

      // 5. Limpar referência no fluig_painel_snapshot
      await supabase
        .from('fluig_painel_snapshot')
        .update({ solicitacao_interna_id: null })
        .eq('solicitacao_interna_id', selectedSolicitacao.id);

      // 6. Deletar a solicitação (cascata remove anexos, histórico, docs, mensagens, notificações)
      const { error } = await supabase
        .from('solicitacoes')
        .delete()
        .eq('id', selectedSolicitacao.id);

      if (error) throw error;

      toast.success(`Solicitação ${selectedSolicitacao.protocolo} excluída com sucesso`);
      
      // Atualizar lista local
      setSolicitacoes(prev => prev.filter(s => s.id !== selectedSolicitacao.id));
      setDeleteDialogOpen(false);
      setSelectedSolicitacao(null);
    } catch (error) {
      console.error('Error deleting solicitacao:', error);
      toast.error('Erro ao excluir solicitação');
    } finally {
      setDeleting(false);
    }
  };

  const filteredSolicitacoes = solicitacoes.filter(
    (s) =>
      s.protocolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.solicitante_nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      s.solicitante_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Solicitações
          </CardTitle>
          <CardDescription>
            Gerencie e exclua solicitações de teste. <span className="text-destructive font-medium">Atenção: a exclusão é permanente!</span>
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por protocolo, descrição ou solicitante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSolicitacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Nenhuma solicitação encontrada' : 'Nenhuma solicitação cadastrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSolicitacoes.map((solicitacao) => (
                    <TableRow key={solicitacao.id}>
                      <TableCell className="font-mono font-medium">
                        {solicitacao.protocolo}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{solicitacao.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={solicitacao.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{solicitacao.solicitante_nome || '-'}</span>
                          <span className="text-xs text-muted-foreground">{solicitacao.solicitante_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(solicitacao.valor)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(solicitacao.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(solicitacao)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Total: {filteredSolicitacoes.length} solicitação(ões)
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir Solicitação
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-4">
                <p>
                  Você está prestes a excluir <strong>permanentemente</strong> a solicitação:
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Protocolo:</span>
                    <span className="font-mono font-bold">{selectedSolicitacao?.protocolo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Solicitante:</span>
                    <span>{selectedSolicitacao?.solicitante_nome || selectedSolicitacao?.solicitante_email}</span>
                  </div>
                </div>
                <div className="bg-destructive/10 p-4 rounded-lg text-sm">
                  <p className="font-semibold text-destructive mb-2">Serão excluídos permanentemente:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Todos os anexos e arquivos</li>
                    <li>Documentos fiscais (NF/Boletos)</li>
                    <li>Documentos emitidos (OC/AC)</li>
                    <li>Histórico de alterações</li>
                    <li>Mensagens e notificações</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Digite o protocolo <span className="font-mono font-bold">{selectedSolicitacao?.protocolo}</span> para confirmar:
                  </label>
                  <Input
                    value={confirmProtocolo}
                    onChange={(e) => setConfirmProtocolo(e.target.value)}
                    placeholder="Digite o protocolo"
                    className="font-mono"
                  />
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting || confirmProtocolo !== selectedSolicitacao?.protocolo}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Permanentemente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
