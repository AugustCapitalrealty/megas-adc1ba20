import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Search, Shield, Users, UserCheck, UserCog, X, Building2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { AppRole, ROLE_LABELS, Empreendimento, EMPREENDIMENTO_LABELS } from '@/types';

const EMPREENDIMENTOS: Empreendimento[] = ['mega_curitiba', 'mega_itajai', 'mega_esteio', 'todos'];

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  approved: boolean;
  created_at: string;
  roles: AppRole[];
  empreendimentos: Empreendimento[];
}

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
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);

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
        .select('id, email, full_name, approved, created_at')
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
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
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
                    <TableHead>Empreendimentos</TableHead>
                    {isMasterUser && <TableHead className="text-center">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isMasterUser ? 8 : 7} className="text-center py-8 text-muted-foreground">
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
                              {targetUser.full_name || '-'}
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
      </div>
    </AppLayout>
  );
}