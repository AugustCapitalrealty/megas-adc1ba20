import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Search, Shield, Users, UserCheck, UserCog, X, Building2, CheckCircle, XCircle, Clock, FileText, Mail, Pencil, Check } from 'lucide-react';
import { AppRole, ROLE_LABELS, Empreendimento, EMPREENDIMENTO_LABELS } from '@/types';
import { SolicitacoesManagement } from '@/components/admin/SolicitacoesManagement';
import { RateioConfigTab } from '@/components/RateioConfigTab';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMPREENDIMENTOS: Empreendimento[] = ['mega_curitiba', 'mega_itajai', 'mega_esteio', 'mega_canoas', 'todos'];

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  approved: boolean;
  created_at: string;
  roles: AppRole[];
  empreendimentos: Empreendimento[];
  receber_notificacoes_email: boolean;
}

const ACTIVE_BACKOFFICE_STATUSES = [
  'recebido',
  'em_analise',
  'pendente_correcao',
  'aprovado',
  'em_processamento',
  'oc_ac_emitida',
  'aguardando_aceite',
  'aguardando_informacoes',
  'aguardando_nf_boleto',
  'nf_boleto_enviados',
  'enviado_pagamento',
  'liberado_fornecedor',
  'enviado_fornecedor',
  'aguardando_execucao',
] as const;

export default function Admin() {
  const { 
    isAdmin, 
    loading: authLoading, 
    user,
    isMasterUser, 
    impersonateUser, 
    stopImpersonation, 
    isImpersonating,
    impersonatedProfile 
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);
  const [editingNameUserId, setEditingNameUserId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [vacationModalOpen, setVacationModalOpen] = useState(false);
  const [vacationSourceUser, setVacationSourceUser] = useState<UserWithRoles | null>(null);
  const [vacationTargetUserId, setVacationTargetUserId] = useState('');
  const [vacationLoading, setVacationLoading] = useState(false);
  const [removeRoleDuringVacation, setRemoveRoleDuringVacation] = useState(true);
  
  const activeTab = searchParams.get('tab') || 'usuarios';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, approved, created_at, receber_notificacoes_email')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch all user empreendimentos
      const { data: allEmpreendimentos, error: empError } = await supabase
        .from('user_empreendimentos')
        .select('user_id, empreendimento');

      if (empError) throw empError;

      // Combine data
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => ({
        ...profile,
        receber_notificacoes_email: profile.receber_notificacoes_email ?? false,
        roles: (allRoles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role as AppRole),
        empreendimentos: (allEmpreendimentos || [])
          .filter((e) => e.user_id === profile.id)
          .map((e) => e.empreendimento as Empreendimento),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: AppRole, hasRole: boolean) => {
    setSavingUserId(userId);
    try {
      if (hasRole) {
        // Remove role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);

        if (error) throw error;
        toast.success(`Permissão "${ROLE_LABELS[role]}" removida`);
      } else {
        // Add role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (error) throw error;
        toast.success(`Permissão "${ROLE_LABELS[role]}" adicionada`);
      }

      // Update local state
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== userId) return user;
          return {
            ...user,
            roles: hasRole
              ? user.roles.filter((r) => r !== role)
              : [...user.roles, role],
          };
        })
      );
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar permissão');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleEmpreendimentoChange = async (userId: string, emp: Empreendimento, hasEmp: boolean) => {
    setSavingUserId(userId);
    try {
      if (hasEmp) {
        // Remove empreendimento
        const { error } = await supabase
          .from('user_empreendimentos')
          .delete()
          .eq('user_id', userId)
          .eq('empreendimento', emp);

        if (error) throw error;
        toast.success(`Empreendimento "${EMPREENDIMENTO_LABELS[emp]}" removido`);
      } else {
        // Add empreendimento
        const { error } = await supabase
          .from('user_empreendimentos')
          .insert({ user_id: userId, empreendimento: emp });

        if (error) throw error;
        toast.success(`Empreendimento "${EMPREENDIMENTO_LABELS[emp]}" adicionado`);
      }

      // Update local state
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== userId) return user;
          return {
            ...user,
            empreendimentos: hasEmp
              ? user.empreendimentos.filter((e) => e !== emp)
              : [...user.empreendimentos, emp],
          };
        })
      );
    } catch (error) {
      console.error('Error updating empreendimento:', error);
      toast.error('Erro ao atualizar empreendimento');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleApprovalChange = async (userId: string, approved: boolean) => {
    setSavingUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approved })
        .eq('id', userId);

      if (error) throw error;

      toast.success(approved ? 'Usuário aprovado!' : 'Aprovação removida');

      // Update local state
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== userId) return user;
          return { ...user, approved };
        })
      );
    } catch (error) {
      console.error('Error updating approval:', error);
      toast.error('Erro ao atualizar aprovação');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleEmailNotificationChange = async (userId: string, receberEmail: boolean) => {
    setSavingUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ receber_notificacoes_email: receberEmail })
        .eq('id', userId);

      if (error) throw error;

      toast.success(receberEmail ? 'Notificações por e-mail ativadas' : 'Notificações por e-mail desativadas');

      // Update local state
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== userId) return user;
          return { ...user, receber_notificacoes_email: receberEmail };
        })
      );
    } catch (error) {
      console.error('Error updating email notification:', error);
      toast.error('Erro ao atualizar notificações por e-mail');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleEditName = (userId: string, currentName: string | null) => {
    setEditingNameUserId(userId);
    setEditingNameValue(currentName || '');
  };

  const handleSaveName = async (userId: string) => {
    if (!editingNameValue.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    setSavingUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editingNameValue.trim() })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Nome atualizado com sucesso!');

      // Update local state
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== userId) return user;
          return { ...user, full_name: editingNameValue.trim() };
        })
      );
      
      setEditingNameUserId(null);
      setEditingNameValue('');
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Erro ao atualizar nome');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleImpersonate = async (targetUser: UserWithRoles) => {
    if (!isMasterUser) return;
    if (targetUser.id === user?.id) {
      toast.error('Você não pode impersonar a si mesmo');
      return;
    }
    
    setImpersonatingUserId(targetUser.id);
    try {
      await impersonateUser(targetUser.id);
      toast.success(`Agora você está visualizando como: ${targetUser.full_name || targetUser.email}`);
      navigate('/');
    } catch (error) {
      console.error('Error impersonating user:', error);
      toast.error('Erro ao trocar de perfil');
    } finally {
      setImpersonatingUserId(null);
    }
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    toast.success('Voltou ao seu perfil original');
  };

  const openVacationTransfer = (sourceUser: UserWithRoles) => {
    setVacationSourceUser(sourceUser);
    setVacationTargetUserId('');
    setRemoveRoleDuringVacation(true);
    setVacationModalOpen(true);
  };

  const handleVacationTransfer = async () => {
    if (!vacationSourceUser || !vacationTargetUserId || !user?.id) {
      toast.error('Selecione o usuário destino para concluir a transferência');
      return;
    }

    if (vacationTargetUserId === vacationSourceUser.id) {
      toast.error('O usuário destino não pode ser o mesmo que o usuário de origem');
      return;
    }

    setVacationLoading(true);
    try {
      // Fetch all active solicitations (handle >1000 rows with pagination)
      let allSolicitacoesAtivas: { id: string; protocolo: string | null; status: Database['public']['Enums']['request_status']; user_id: string }[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: page, error: pageError } = await supabase
          .from('solicitacoes')
          .select('id, protocolo, status, user_id')
          .in('status', [...ACTIVE_BACKOFFICE_STATUSES])
          .range(offset, offset + pageSize - 1);

        if (pageError) throw pageError;
        allSolicitacoesAtivas = allSolicitacoesAtivas.concat(page || []);
        hasMore = (page?.length || 0) === pageSize;
        offset += pageSize;
      }

      if (allSolicitacoesAtivas.length === 0) {
        toast.info('Não há solicitações ativas no backoffice para transferir');
        setVacationModalOpen(false);
        return;
      }

      const solIds = allSolicitacoesAtivas.map((s) => s.id);

      // Find last backoffice analyst who assumed each solicitation
      // Use 'Assumido pelo backoffice' action (correct heuristic) instead of status_novo='aprovado'
      const batchSize = 500;
      let allHistorico: { solicitacao_id: string; user_id: string; created_at: string }[] = [];

      for (let i = 0; i < solIds.length; i += batchSize) {
        const batch = solIds.slice(i, i + batchSize);
        const { data: historico, error: histError } = await supabase
          .from('historico_solicitacoes')
          .select('solicitacao_id, user_id, created_at')
          .in('solicitacao_id', batch)
          .eq('acao', 'Assumido pelo backoffice')
          .order('created_at', { ascending: false });

        if (histError) throw histError;
        allHistorico = allHistorico.concat(historico || []);
      }

      const ultimoResponsavelMap = new Map<string, string>();
      // Sort descending to pick the most recent assumption per solicitation
      allHistorico
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .forEach((h) => {
          if (!ultimoResponsavelMap.has(h.solicitacao_id)) {
            ultimoResponsavelMap.set(h.solicitacao_id, h.user_id);
          }
        });

      const solicitacoesDaCarteira = allSolicitacoesAtivas.filter(
        (s) => ultimoResponsavelMap.get(s.id) === vacationSourceUser.id
      );

      if (solicitacoesDaCarteira.length === 0) {
        toast.info('Este usuário não possui solicitações ativas assumidas no backoffice');
        setVacationModalOpen(false);
        return;
      }

      const targetUser = users.find((u) => u.id === vacationTargetUserId);
      const targetUserName = targetUser?.full_name || targetUser?.email || vacationTargetUserId;
      const sourceUserName = vacationSourceUser.full_name || vacationSourceUser.email;

      // 1. Create historico records marking new assumption
      const historicoTransferencia = solicitacoesDaCarteira.map((sol) => ({
        solicitacao_id: sol.id,
        user_id: user.id,
        acao: 'Assumido pelo backoffice',
        status_anterior: sol.status,
        status_novo: sol.status,
        motivo: `Redistribuição por férias: de ${sourceUserName} para ${targetUserName}`,
      }));

      const { error: insertError } = await supabase
        .from('historico_solicitacoes')
        .insert(historicoTransferencia);

      if (insertError) throw insertError;

      // 2. Create solicitacao_transfers audit records
      const transferRecords = solicitacoesDaCarteira.map((sol) => ({
        solicitacao_id: sol.id,
        from_user_id: vacationSourceUser.id,
        to_user_id: vacationTargetUserId,
        created_by: user.id,
        motivo: `Redistribuição por férias: de ${sourceUserName} para ${targetUserName}`,
      }));

      const { error: transferError } = await supabase
        .from('solicitacao_transfers')
        .insert(transferRecords);

      if (transferError) {
        console.warn('Erro ao registrar transfers (não-bloqueante):', transferError);
      }

      // 3. Optionally remove backoffice role
      if (removeRoleDuringVacation) {
        const { error: removeRoleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', vacationSourceUser.id)
          .eq('role', 'backoffice');

        if (removeRoleError) throw removeRoleError;

        setUsers((prev) =>
          prev.map((u) =>
            u.id === vacationSourceUser.id
              ? { ...u, roles: u.roles.filter((r) => r !== 'backoffice') }
              : u
          )
        );
      }

      // 4. Admin audit log
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: solicitacoesDaCarteira[0].id,
        user_id: user.id,
        acao: 'redistribuicao_ferias',
        motivo: `${solicitacoesDaCarteira.length} solicitação(ões) redistribuída(s) de ${sourceUserName} para ${targetUserName}`,
      });

      toast.success(`${solicitacoesDaCarteira.length} solicitação(ões) transferida(s) para ${targetUserName}`);
      setVacationModalOpen(false);
    } catch (error: any) {
      console.error('Error transferring vacation workload:', error);
      toast.error(error?.message || 'Não foi possível transferir a carteira de férias');
    } finally {
      setVacationLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.roles.includes('admin')).length,
    backoffice: users.filter((u) => u.roles.includes('backoffice')).length,
    pending: users.filter((u) => !u.approved).length,
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administração</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários e suas permissões
          </p>
        </div>

        {/* Impersonation Banner */}
        {isImpersonating && impersonatedProfile && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserCog className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-semibold text-warning-foreground">
                    Visualizando como: {impersonatedProfile.full_name || impersonatedProfile.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Você está vendo o sistema como outro usuário
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleStopImpersonation}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Voltar ao meu perfil
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs de navegação */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="usuarios" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="solicitacoes" className="gap-2">
              <FileText className="h-4 w-4" />
              Solicitações
            </TabsTrigger>
            <TabsTrigger value="rateio" className="gap-2">
              <Building2 className="h-4 w-4" />
              Rateio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card className={stats.pending > 0 ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20' : ''}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendentes de Aprovação</CardTitle>
                  <Clock className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.pending > 0 ? 'text-amber-600' : ''}`}>{stats.pending}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.admins}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Backoffice</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.backoffice}</div>
                </CardContent>
              </Card>
            </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>
              Lista de todos os usuários cadastrados e suas permissões
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
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
                    <TableHead>Usuário</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead className="text-center">Aprovado</TableHead>
                    <TableHead className="text-center">Solicitante</TableHead>
                    <TableHead className="text-center">Backoffice</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>E-mails</span>
                      </div>
                    </TableHead>
                    <TableHead>Empreendimentos</TableHead>
                    <TableHead className="text-center">Férias</TableHead>
                    {isMasterUser && <TableHead className="text-center">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isMasterUser ? 10 : 9} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((targetUser) => {
                      const isSaving = savingUserId === targetUser.id;
                      const isCurrentUser = targetUser.id === user?.id;
                      const isImpersonatingThis = impersonatingUserId === targetUser.id;
                      
                      return (
                        <TableRow key={targetUser.id} className={`${isCurrentUser ? 'bg-muted/50' : ''} ${!targetUser.approved ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {!targetUser.approved && (
                                <Clock className="h-4 w-4 text-amber-500" />
                              )}
                              {editingNameUserId === targetUser.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={editingNameValue}
                                    onChange={(e) => setEditingNameValue(e.target.value)}
                                    className="h-7 w-40 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveName(targetUser.id);
                                      if (e.key === 'Escape') setEditingNameUserId(null);
                                    }}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-green-600 hover:text-green-700"
                                    onClick={() => handleSaveName(targetUser.id)}
                                    disabled={isSaving}
                                  >
                                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground"
                                    onClick={() => setEditingNameUserId(null)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div 
                                  className="flex items-center gap-1 group cursor-pointer hover:text-primary"
                                  onClick={() => handleEditName(targetUser.id, targetUser.full_name)}
                                >
                                  <span>{targetUser.full_name || '-'}</span>
                                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">Você</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{targetUser.email}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Button
                                variant={targetUser.approved ? "ghost" : "default"}
                                size="sm"
                                onClick={() => handleApprovalChange(targetUser.id, !targetUser.approved)}
                                disabled={isSaving}
                                className={`gap-1 ${targetUser.approved ? 'text-green-600 hover:text-green-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                              >
                                {targetUser.approved ? (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="hidden sm:inline">Aprovado</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4" />
                                    <span className="hidden sm:inline">Aprovar</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={targetUser.roles.includes('solicitante')}
                                onCheckedChange={() =>
                                  handleRoleChange(targetUser.id, 'solicitante', targetUser.roles.includes('solicitante'))
                                }
                                disabled={isSaving}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={targetUser.roles.includes('backoffice')}
                                onCheckedChange={() =>
                                  handleRoleChange(targetUser.id, 'backoffice', targetUser.roles.includes('backoffice'))
                                }
                                disabled={isSaving}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={targetUser.roles.includes('admin')}
                                onCheckedChange={() =>
                                  handleRoleChange(targetUser.id, 'admin', targetUser.roles.includes('admin'))
                                }
                                disabled={isSaving}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={targetUser.receber_notificacoes_email}
                                onCheckedChange={() =>
                                  handleEmailNotificationChange(targetUser.id, !targetUser.receber_notificacoes_email)
                                }
                                disabled={isSaving}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {EMPREENDIMENTOS.map((emp) => (
                                <label key={emp} className="flex items-center gap-1 text-xs">
                                  <Checkbox
                                    checked={targetUser.empreendimentos.includes(emp)}
                                    onCheckedChange={() =>
                                      handleEmpreendimentoChange(targetUser.id, emp, targetUser.empreendimentos.includes(emp))
                                    }
                                    disabled={isSaving}
                                  />
                                  <span className={targetUser.empreendimentos.includes(emp) ? 'font-medium' : 'text-muted-foreground'}>
                                    {EMPREENDIMENTO_LABELS[emp].replace('Mega ', '')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {targetUser.roles.includes('backoffice') ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => openVacationTransfer(targetUser)}
                              >
                                Modo férias
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {isMasterUser && (
                            <TableCell className="text-center">
                              {!isCurrentUser && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleImpersonate(targetUser)}
                                  disabled={isImpersonatingThis}
                                  className="gap-1 text-xs"
                                >
                                  {isImpersonatingThis ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <UserCog className="h-3 w-3" />
                                  )}
                                  Entrar
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="solicitacoes" className="mt-6">
            <SolicitacoesManagement />
          </TabsContent>

          <TabsContent value="rateio" className="mt-6">
            <RateioConfigTab />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={vacationModalOpen} onOpenChange={setVacationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redistribuir solicitações por férias</DialogTitle>
            <DialogDescription>
              Transfere todas as solicitações ativas assumidas por {vacationSourceUser?.full_name || vacationSourceUser?.email} para outro usuário com permissão de backoffice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Novo responsável do backoffice</Label>
              <Select value={vacationTargetUserId} onValueChange={setVacationTargetUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o usuário destino" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.roles.includes('backoffice') && u.approved && u.id !== vacationSourceUser?.id)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={removeRoleDuringVacation}
                onCheckedChange={(checked) => setRemoveRoleDuringVacation(checked === true)}
              />
              Remover permissão de backoffice do usuário durante as férias
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVacationModalOpen(false)} disabled={vacationLoading}>
              Cancelar
            </Button>
            <Button onClick={handleVacationTransfer} disabled={vacationLoading || !vacationTargetUserId}>
              {vacationLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Transferir carteira
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
