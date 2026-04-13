import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { EMPREENDIMENTO_LABELS, type Empreendimento, type InstrumentoJuridico } from '@/types';
import { Loader2, Clock, AlertTriangle, Inbox, Eye } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { OCDetalhesModal } from '@/components/monitoramento/OCDetalhesModal';
import { InstrumentoJuridicoBadge } from '@/components/InstrumentoJuridicoBadge';

interface ParadoRow {
  id: string;
  protocolo: string;
  numero_projuris: string;
  empreendimento: Empreendimento;
  fornecedor_razao: string | null;
  valor: number;
  instrumento_juridico: InstrumentoJuridico | null;
  data_envio_assinatura: string;
  dias_parado: number;
}

const EMPREENDIMENTO_BADGE_COLORS: Record<string, string> = {
  mega_curitiba: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  mega_itajai: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
  mega_esteio: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  mega_canoas: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
};

export function ProjurisParadosAssinatura() {
  const { user } = useAuth();
  const { empreendimentos: userEmpreendimentos, loading: loadingEmpreendimentos, hasAllAccess } = useUserEmpreendimentos(user?.id);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ParadoRow[]>([]);
  const [detailId, setDetailId] = useState<{ id: string; protocolo: string } | null>(null);

  useEffect(() => {
    if (!loadingEmpreendimentos) fetchData();
  }, [loadingEmpreendimentos]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get all acompanhamento_juridico entries for assinatura stages
      const { data: acomps } = await supabase
        .from('acompanhamento_juridico')
        .select('solicitacao_id, etapa, created_at')
        .in('etapa', ['enviado_assinatura', 'assinado_fornecedor', 'assinado_contratante'])
        .order('created_at', { ascending: true });

      if (!acomps || acomps.length === 0) { setRows([]); setLoading(false); return; }

      // Get latest etapa per solicitacao to ensure they're still in assinatura
      const latestBySOl: Record<string, { etapa: string; created_at: string }> = {};
      // We need ALL etapas to find the latest
      const { data: allAcomps } = await supabase
        .from('acompanhamento_juridico')
        .select('solicitacao_id, etapa, created_at')
        .in('solicitacao_id', [...new Set(acomps.map(a => a.solicitacao_id))])
        .order('created_at', { ascending: true });

      (allAcomps || []).forEach(a => {
        latestBySOl[a.solicitacao_id] = { etapa: a.etapa, created_at: a.created_at };
      });

      // Only keep those whose latest etapa is an assinatura one
      const assinaturaEtapas = ['enviado_assinatura', 'assinado_fornecedor', 'assinado_contratante'];
      const solIdsInAssinatura = Object.entries(latestBySOl)
        .filter(([, v]) => assinaturaEtapas.includes(v.etapa))
        .map(([id]) => id);

      if (solIdsInAssinatura.length === 0) { setRows([]); setLoading(false); return; }

      const { data: sols } = await supabase
        .from('solicitacoes')
        .select('id, protocolo, numero_projuris, empreendimento, valor, instrumento_juridico, status, fornecedor_id')
        .in('id', solIdsInAssinatura)
        .not('status', 'in', '(concluida,cancelado,rejeitado)');

      if (!sols || sols.length === 0) { setRows([]); setLoading(false); return; }

      const filteredSols = sols.filter(s =>
        hasAllAccess || userEmpreendimentos.includes(s.empreendimento as Empreendimento)
      );

      const fornecedorIds = [...new Set(filteredSols.map(s => s.fornecedor_id).filter(Boolean))];
      let fornecedorMap: Record<string, string> = {};
      if (fornecedorIds.length > 0) {
        const { data: fornecedores } = await supabase.from('fornecedores').select('id, razao_social, nome_fantasia').in('id', fornecedorIds);
        if (fornecedores) fornecedorMap = Object.fromEntries(fornecedores.map(f => [f.id, f.nome_fantasia || f.razao_social || '']));
      }

      const result: ParadoRow[] = filteredSols.map(sol => {
        const latest = latestBySOl[sol.id];
        const dias = differenceInDays(new Date(), new Date(latest.created_at));
        return {
          id: sol.id,
          protocolo: sol.protocolo || '',
          numero_projuris: sol.numero_projuris || '',
          empreendimento: sol.empreendimento as Empreendimento,
          fornecedor_razao: sol.fornecedor_id ? fornecedorMap[sol.fornecedor_id] || null : null,
          valor: sol.valor,
          instrumento_juridico: (sol.instrumento_juridico as InstrumentoJuridico) || null,
          data_envio_assinatura: latest.created_at,
          dias_parado: dias,
        };
      });

      result.sort((a, b) => b.dias_parado - a.dias_parado);
      setRows(result);
    } catch (error) {
      console.error('Error fetching parados assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpis = useMemo(() => ({
    total: rows.length,
    critico: rows.filter(r => r.dias_parado > 7).length,
    atencao: rows.filter(r => r.dias_parado >= 3 && r.dias_parado <= 7).length,
  }), [rows]);

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getDiasParadoBadge = (dias: number) => {
    if (dias > 7) return <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 text-xs">{dias}d — Crítico</Badge>;
    if (dias >= 3) return <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 text-xs">{dias}d — Atenção</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 text-xs">{dias}d</Badge>;
  };

  if (loading || loadingEmpreendimentos) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
                <div><p className="text-2xl font-bold">{kpis.total}</p><p className="text-xs text-muted-foreground">Em Assinatura</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
                <div><p className="text-2xl font-bold">{kpis.critico}</p><p className="text-xs text-muted-foreground">Críticos (&gt;7 dias)</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-600" /></div>
                <div><p className="text-2xl font-bold">{kpis.atencao}</p><p className="text-xs text-muted-foreground">Atenção (3-7 dias)</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Inbox className="h-10 w-10 opacity-40" />
                <p className="text-sm font-medium">Nenhum contrato parado para assinatura</p>
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
                    <TableHead>Nº Projuris</TableHead>
                    <TableHead>Empreendimento</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Instrumento</TableHead>
                    <TableHead>Enviado para Assinatura</TableHead>
                    <TableHead>Dias Parado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => (
                    <TableRow
                      key={row.id}
                      className={cn('cursor-pointer', row.dias_parado > 7 && 'bg-red-50/50 dark:bg-red-900/5')}
                      onClick={() => setDetailId({ id: row.id, protocolo: row.protocolo })}
                    >
                      <TableCell className="font-mono text-sm font-medium">#{row.protocolo}</TableCell>
                      <TableCell className="text-sm font-medium">{row.numero_projuris}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', EMPREENDIMENTO_BADGE_COLORS[row.empreendimento] || '')}>
                          {EMPREENDIMENTO_LABELS[row.empreendimento] || row.empreendimento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{row.fornecedor_razao || '—'}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(row.valor)}</TableCell>
                      <TableCell><InstrumentoJuridicoBadge instrumento={row.instrumento_juridico} /></TableCell>
                      <TableCell className="text-sm">{formatBR(row.data_envio_assinatura, 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{getDiasParadoBadge(row.dias_parado)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDetailId({ id: row.id, protocolo: row.protocolo }); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}
      </div>

      <OCDetalhesModal
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        solicitacaoId={detailId?.id || null}
        protocolo={detailId?.protocolo || null}
      />
    </>
  );
}
