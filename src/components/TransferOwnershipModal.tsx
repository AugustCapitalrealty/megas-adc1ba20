import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserCheck, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Empreendimento } from '@/types';

interface TransferOwnershipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacaoId?: string;
  solicitacaoIds?: string[];
  solicitacaoProtocolo?: string;
  currentUserId?: string;
  currentUserName?: string;
  empreendimento: Empreendimento;
  onTransferred: () => void;
}

interface UserOption {
  id: string;
  full_name: string | null;
  email: string;
}

export function TransferOwnershipModal({
  open,
  onOpenChange,
  solicitacaoId,
  solicitacaoIds,
  solicitacaoProtocolo,
  currentUserId: currentUserIdProp,
  currentUserName = 'Solicitante',
  empreendimento,
  onTransferred,
}: TransferOwnershipModalProps) {
  const { user, isBackofficeOrAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [resolvedUserId, setResolvedUserId] = useState(currentUserIdProp || '');

  const targetSolicitacaoIds = solicitacaoIds && solicitacaoIds.length > 0
    ? solicitacaoIds
    : (solicitacaoId ? [solicitacaoId] : []);
  const isBulkTransfer = targetSolicitacaoIds.length > 1;


  useEffect(() => {
    if (open) {
      setSelectedUserId('');
      setMotivo('');
      // If no currentUserId provided, fetch it
      if (!currentUserIdProp && !isBulkTransfer && solicitacaoId) {
        supabase.from('solicitacoes').select('user_id').eq('id', solicitacaoId).single()
          .then(({ data }) => {
            if (data) setResolvedUserId(data.user_id);
          });
      } else {
        setResolvedUserId(currentUserIdProp || user?.id || '');
      }
    }
  }, [open, currentUserIdProp, solicitacaoId, isBulkTransfer, user?.id]);

  useEffect(() => {
    if (open && (resolvedUserId || isBackofficeOrAdmin)) {
      fetchAvailableUsers();
    }
  }, [open, resolvedUserId, isBackofficeOrAdmin]);

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      if (isBackofficeOrAdmin) {
        // Admin/backoffice can transfer to any approved user
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('approved', true)
          .order('full_name');

        const filtered = (data || []).filter(profile => profile.id !== resolvedUserId);
        setUsers(filtered);
      } else {
        // Regular users: only users from the same empreendimento
        const { data: empUsers } = await supabase
          .from('user_empreendimentos')
          .select('user_id')
          .or(`empreendimento.eq.${empreendimento},empreendimento.eq.todos`)
          .neq('user_id', resolvedUserId);

        if (empUsers && empUsers.length > 0) {
          const userIds = [...new Set(empUsers.map(u => u.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
            .eq('approved', true)
            .order('full_name');
          setUsers(profiles || []);
        } else {
          setUsers([]);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUserId || !motivo.trim() || !user || targetSolicitacaoIds.length === 0) return;

    setSubmitting(true);
    try {
      const { data: selectedUser } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', selectedUserId)
        .maybeSingle();

      if (isBulkTransfer) {
        const { data: solicitacoesToTransfer, error: solicitacoesError } = await supabase
          .from('solicitacoes')
          .select('id, user_id, protocolo')
          .in('id', targetSolicitacaoIds);

        if (solicitacoesError) throw solicitacoesError;

        const validSolicitacoes = (solicitacoesToTransfer || []).filter(s => s.user_id !== selectedUserId);
        if (validSolicitacoes.length === 0) {
          toast({
            title: 'Nada para transferir',
            description: 'Todas as solicitações selecionadas já pertencem ao usuário destino.',
          });
          onOpenChange(false);
          return;
        }

        const transferLogs = validSolicitacoes.map((s) => ({
          solicitacao_id: s.id,
          from_user_id: s.user_id,
          to_user_id: selectedUserId,
          motivo: motivo.trim(),
          created_by: user.id,
        }));

        const { error: logError } = await supabase
          .from('solicitacao_transfers')
          .insert(transferLogs);

        if (logError) throw logError;

        const { error: updateError } = await supabase
          .from('solicitacoes')
          .update({ user_id: selectedUserId })
          .in('id', validSolicitacoes.map(s => s.id));

        if (updateError) throw updateError;

        const historicoRows = validSolicitacoes.map((s) => ({
          solicitacao_id: s.id,
          user_id: user.id,
          acao: 'transferencia_titularidade',
          motivo: `Transferida em lote para ${selectedUser?.full_name || selectedUser?.email || 'Usuário'}. Motivo: ${motivo.trim()}`,
        }));

        await supabase.from('historico_solicitacoes').insert(historicoRows);

        toast({
          title: 'Solicitações transferidas',
          description: `${validSolicitacoes.length} solicitações foram transferidas com sucesso.`,
        });
      } else {
        const singleId = targetSolicitacaoIds[0];
        // 1. Insert transfer log
        const { error: logError } = await supabase
          .from('solicitacao_transfers')
          .insert({
            solicitacao_id: singleId,
            from_user_id: resolvedUserId,
            to_user_id: selectedUserId,
            motivo: motivo.trim(),
            created_by: user.id,
          });

        if (logError) throw logError;

        // 2. Update solicitacao user_id
        const { error: updateError } = await supabase
          .from('solicitacoes')
          .update({ user_id: selectedUserId })
          .eq('id', singleId);

        if (updateError) throw updateError;

        // 3. Register in historico
        await supabase.from('historico_solicitacoes').insert({
          solicitacao_id: singleId,
          user_id: user.id,
          acao: 'transferencia_titularidade',
          motivo: `Transferida de ${currentUserName} para ${selectedUser?.full_name || selectedUser?.email || 'Usuário'}. Motivo: ${motivo.trim()}`,
        });

        toast({
          title: 'Solicitação transferida',
          description: `#${solicitacaoProtocolo} transferida com sucesso.`,
        });
      }

      onOpenChange(false);
      onTransferred();
    } catch (error: any) {
      console.error('Error transferring:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao transferir',
        description: error?.message || 'Não foi possível transferir a solicitação.',
      });
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            {isBulkTransfer ? 'Transferir Solicitações em Lote' : 'Transferir Solicitação'}
          </DialogTitle>
          <DialogDescription>
            {isBulkTransfer
              ? `Transfira ${targetSolicitacaoIds.length} solicitações selecionadas para outro usuário.`
              : `Transfira a titularidade da solicitação #${solicitacaoProtocolo} para outro usuário.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isBulkTransfer && (
            <>
              {/* Current owner */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">Titular atual</Label>
                <p className="font-medium mt-0.5">{currentUserName}</p>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </>
          )}

          {/* Select new owner */}
          <div className="space-y-2">
            <Label>Novo titular</Label>
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando usuários...
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum usuário disponível para transferência.
              </p>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o novo titular" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label>Motivo da transferência *</Label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Férias do solicitante original, remanejamento de equipe..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedUserId || !motivo.trim() || submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserCheck className="h-4 w-4 mr-2" />
            )}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
