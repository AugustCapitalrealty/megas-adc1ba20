import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import {
  EMPREENDIMENTO_LABELS,
  INSTRUMENTO_JURIDICO_LABELS_SHORT,
  type Empreendimento,
  type InstrumentoJuridico,
} from '@/types';
import { Loader2, ShieldAlert, Plus, XCircle, Inbox, Search } from 'lucide-react';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { InstrumentoJuridicoBadge } from '@/components/InstrumentoJuridicoBadge';

interface ComplianceRow {
  id: string;
  protocolo: string;
  empreendimento: Empreendimento;
  instrumento_juridico: InstrumentoJuridico;
  valor: number;
  created_at: string;
  solicitante_nome: string | null;
  fornecedor_razao: string | null;
}

const EMPREENDIMENTO_BADGE_COLORS: Record<string, string> = {
  mega_curitiba: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  mega_itajai: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
  mega_esteio: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  mega_canoas: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
};

export function ProjurisCompliance() {
  const { user } = useAuth();
  const { empreendimentos: userEmpreendimentos, loading: loadingEmpreendimentos, hasAllAccess } = useUserEmpreendimentos(user?.id);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ComplianceRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Projuris modal
  const [addProjurisId, setAddProjurisId] = useState<string | null>(null);
  const [projurisNumber, setProjurisNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // Not applicable modal
  const [naId, setNaId] = useState<string | null>(null);
  const [naJustificativa, setNaJustificativa] = useState('');
  const [savingNa, setSavingNa] = useState(false);

  useEffect(() => {
    if (!loadingEmpreendimentos) fetchData();
  }, [loadingEmpreendimentos]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sols } = await supabase
        .from('solicitacoes')
        .select('id, protocolo, empreendimento, instrumento_juridico, valor, created_at, user_id, fornecedor_id')
        .is('numero_projuris', null)
        .in('instrumento_juridico', ['termo_contratacao', 'contrato_prestacao', 'contrato_fornecimento', 'contrato_empreitada'])
        .not('status', 'in', '(concluida,cancelado,rejeitado)');

      if (!sols || sols.length === 0) { setRows([]); setLoading(false); return; }

      const filteredSols = sols.filter(s =>
        hasAllAccess || userEmpreendimentos.includes(s.empreendimento as Empreendimento)
      );

      // Get user names
      const userIds = [...new Set(filteredSols.map(s => s.user_id))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        if (profiles) userMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || '']));
      }

      // Get fornecedor names
      const fornecedorIds = [...new Set(filteredSols.map(s => s.fornecedor_id).filter(Boolean))];
      let fornecedorMap: Record<string, string> = {};
      if (fornecedorIds.length > 0) {
        const { data: fornecedores } = await supabase.from('fornecedores').select('id, razao_social, nome_fantasia').in('id', fornecedorIds);
        if (fornecedores) fornecedorMap = Object.fromEntries(fornecedores.map(f => [f.id, f.nome_fantasia || f.razao_social || '']));
      }

      const result: ComplianceRow[] = filteredSols.map(sol => ({
        id: sol.id,
        protocolo: sol.protocolo || '',
        empreendimento: sol.empreendimento as Empreendimento,
        instrumento_juridico: sol.instrumento_juridico as InstrumentoJuridico,
        valor: sol.valor,
        created_at: sol.created_at,
        solicitante_nome: userMap[sol.user_id] || null,
        fornecedor_razao: sol.fornecedor_id ? fornecedorMap[sol.fornecedor_id] || null : null,
      }));

      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRows(result);
    } catch (error) {
      console.error('Error fetching compliance:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r =>
      r.protocolo?.toLowerCase().includes(term) ||
      r.solicitante_nome?.toLowerCase().includes(term) ||
      r.fornecedor_razao?.toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const handleAddProjuris = async () => {
    if (!addProjurisId || !projurisNumber.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('solicitacoes')
        .update({ numero_projuris: projurisNumber.trim() })
        .eq('id', addProjurisId);

      if (error) throw error;

      // Log in historico
      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: addProjurisId,
        user_id: user!.id,
        acao: 'numero_projuris_adicionado',
        motivo: `Número Projuris ${projurisNumber.trim()} adicionado via painel de compliance`,
      });

      toast.success('Número Projuris adicionado com sucesso');
      setRows(prev => prev.filter(r => r.id !== addProjurisId));
      setAddProjurisId(null);
      setProjurisNumber('');
    } catch (error) {
      console.error('Error adding projuris:', error);
      toast.error('Erro ao adicionar número Projuris');
    } finally {
      setSaving(false);
    }
  };

  const handleNotApplicable = async () => {
    if (!naId || !naJustificativa.trim()) return;
    setSavingNa(true);
    try {
      // Register justification in historico — this doesn't remove the row because instrumento_juridico stays the same
      // But we add projuris as 'N/A' to mark it as reviewed
      const { error } = await supabase
        .from('solicitacoes')
        .update({ numero_projuris: 'N/A' })
        .eq('id', naId);

      if (error) throw error;

      await supabase.from('historico_solicitacoes').insert({
        solicitacao_id: naId,
        user_id: user!.id,
        acao: 'projuris_nao_aplicavel',
        motivo: naJustificativa.trim(),
      });

      toast.success('Marcado como não aplicável');
      setRows(prev => prev.filter(r => r.id !== naId));
      setNaId(null);
      setNaJustificativa('');
    } catch (error) {
      console.error('Error marking as N/A:', error);
      toast.error('Erro ao marcar como não aplicável');
    } finally {
      setSavingNa(false);
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading || loadingEmpreendimentos) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="space-y-6">
        {/* KPI */}
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><ShieldAlert className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold">{rows.length}</p>
                <p className="text-xs text-muted-foreground">Solicitações sem Projuris (deveria ter)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar protocolo, solicitante..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <span className="text-sm text-muted-foreground">{filteredRows.length} registro(s)</span>
        </div>

        {filteredRows.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Inbox className="h-10 w-10 opacity-40" />
                <p className="text-sm font-medium">
                  {rows.length === 0 ? 'Todas as solicitações estão em conformidade!' : 'Nenhum resultado encontrado'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ScrollArea className="h-[550px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Data Criação</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Empreendimento</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Instrumento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm font-medium">#{row.protocolo}</TableCell>
                      <TableCell className="text-sm">{formatBR(row.created_at, 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-sm">{row.solicitante_nome || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', EMPREENDIMENTO_BADGE_COLORS[row.empreendimento] || '')}>
                          {EMPREENDIMENTO_LABELS[row.empreendimento] || row.empreendimento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">{row.fornecedor_razao || '—'}</TableCell>
                      <TableCell><InstrumentoJuridicoBadge instrumento={row.instrumento_juridico} /></TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(row.valor)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setAddProjurisId(row.id); setProjurisNumber(''); }}>
                            <Plus className="h-3.5 w-3.5" />Projuris
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={() => { setNaId(row.id); setNaJustificativa(''); }}>
                            <XCircle className="h-3.5 w-3.5" />N/A
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}
      </div>

      {/* Add Projuris Modal */}
      <Dialog open={!!addProjurisId} onOpenChange={(open) => !open && setAddProjurisId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Número Projuris</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Ex: PJ-2026-001234" value={projurisNumber} onChange={(e) => setProjurisNumber(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProjurisId(null)}>Cancelar</Button>
            <Button onClick={handleAddProjuris} disabled={!projurisNumber.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Not Applicable Modal */}
      <Dialog open={!!naId} onOpenChange={(open) => !open && setNaId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como Não Aplicável</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Informe a justificativa para marcar esta solicitação como não necessitando de Projuris:</p>
            <Textarea placeholder="Justificativa obrigatória..." value={naJustificativa} onChange={(e) => setNaJustificativa(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNaId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleNotApplicable} disabled={!naJustificativa.trim() || savingNa}>
              {savingNa ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
