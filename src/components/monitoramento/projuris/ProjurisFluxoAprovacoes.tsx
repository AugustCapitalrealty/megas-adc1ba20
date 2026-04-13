import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import {
  EMPREENDIMENTO_LABELS,
  ETAPA_JURIDICA_LABELS,
  ETAPAS_JURIDICAS_ORDEM,
  type Empreendimento,
  type EtapaJuridica,
} from '@/types';
import { Loader2, Clock, AlertTriangle, ChevronDown, ChevronUp, Inbox, ArrowRight } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface AcompEntry {
  solicitacao_id: string;
  etapa: EtapaJuridica;
  created_at: string;
  observacao: string | null;
  user_name: string | null;
}

interface ContratoFluxo {
  id: string;
  protocolo: string;
  empreendimento: Empreendimento;
  fornecedor_razao: string | null;
  etapas: { etapa: EtapaJuridica; data: string; dias_na_etapa: number; observacao: string | null; user_name: string | null }[];
  etapa_atual: EtapaJuridica;
  dias_total: number;
}

export function ProjurisFluxoAprovacoes() {
  const { user } = useAuth();
  const { empreendimentos: userEmpreendimentos, loading: loadingEmpreendimentos, hasAllAccess } = useUserEmpreendimentos(user?.id);
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<ContratoFluxo[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loadingEmpreendimentos) fetchData();
  }, [loadingEmpreendimentos]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get active solicitacoes with projuris
      const { data: sols } = await supabase
        .from('solicitacoes')
        .select('id, protocolo, empreendimento, fornecedor_id')
        .not('numero_projuris', 'is', null)
        .not('status', 'in', '(concluida,cancelado,rejeitado)');

      if (!sols || sols.length === 0) { setContratos([]); setLoading(false); return; }

      const filteredSols = sols.filter(s =>
        hasAllAccess || userEmpreendimentos.includes(s.empreendimento as Empreendimento)
      );
      const solIds = filteredSols.map(s => s.id);

      // Get all acompanhamento for these
      const { data: acomps } = await supabase
        .from('acompanhamento_juridico')
        .select('solicitacao_id, etapa, created_at, observacao, user_id')
        .in('solicitacao_id', solIds)
        .order('created_at', { ascending: true });

      if (!acomps || acomps.length === 0) { setContratos([]); setLoading(false); return; }

      // Get user names
      const userIds = [...new Set(acomps.map(a => a.user_id))];
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

      // Group acompanhamento by solicitacao
      const acompBySol: Record<string, AcompEntry[]> = {};
      acomps.forEach(a => {
        if (!acompBySol[a.solicitacao_id]) acompBySol[a.solicitacao_id] = [];
        acompBySol[a.solicitacao_id].push({
          solicitacao_id: a.solicitacao_id,
          etapa: a.etapa as EtapaJuridica,
          created_at: a.created_at,
          observacao: a.observacao,
          user_name: userMap[a.user_id] || null,
        });
      });

      const result: ContratoFluxo[] = filteredSols
        .filter(sol => acompBySol[sol.id] && acompBySol[sol.id].length > 0)
        .map(sol => {
          const entries = acompBySol[sol.id];
          const etapas = entries.map((entry, i) => {
            const nextDate = i < entries.length - 1 ? new Date(entries[i + 1].created_at) : new Date();
            const dias = differenceInDays(nextDate, new Date(entry.created_at));
            return {
              etapa: entry.etapa,
              data: entry.created_at,
              dias_na_etapa: dias,
              observacao: entry.observacao,
              user_name: entry.user_name,
            };
          });
          const lastEntry = entries[entries.length - 1];
          const diasTotal = differenceInDays(new Date(), new Date(entries[0].created_at));
          return {
            id: sol.id,
            protocolo: sol.protocolo || '',
            empreendimento: sol.empreendimento as Empreendimento,
            fornecedor_razao: sol.fornecedor_id ? fornecedorMap[sol.fornecedor_id] || null : null,
            etapas,
            etapa_atual: lastEntry.etapa as EtapaJuridica,
            dias_total: diasTotal,
          };
        });

      result.sort((a, b) => b.dias_total - a.dias_total);
      setContratos(result);
    } catch (error) {
      console.error('Error fetching fluxo aprovacoes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate bottleneck: etapa with highest average time
  const gargalo = useMemo(() => {
    const etapaTotals: Record<string, { total: number; count: number }> = {};
    contratos.forEach(c => {
      c.etapas.forEach(e => {
        if (!etapaTotals[e.etapa]) etapaTotals[e.etapa] = { total: 0, count: 0 };
        etapaTotals[e.etapa].total += e.dias_na_etapa;
        etapaTotals[e.etapa].count += 1;
      });
    });
    let maxAvg = 0;
    let maxEtapa: EtapaJuridica | null = null;
    Object.entries(etapaTotals).forEach(([etapa, { total, count }]) => {
      const avg = total / count;
      if (avg > maxAvg) { maxAvg = avg; maxEtapa = etapa as EtapaJuridica; }
    });
    return maxEtapa ? { etapa: maxEtapa, media: Math.round(maxAvg) } : null;
  }, [contratos]);

  if (loading || loadingEmpreendimentos) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Gargalo KPI */}
      {gargalo && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-sm font-medium">Etapa com maior tempo médio (gargalo)</p>
                <p className="text-lg font-bold">{ETAPA_JURIDICA_LABELS[gargalo.etapa]} — {gargalo.media} dias em média</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {contratos.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">Nenhum contrato com fluxo jurídico registrado</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {contratos.map(contrato => {
              const isExpanded = expandedId === contrato.id;
              return (
                <Card key={contrato.id} className="overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : contrato.id)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-medium">#{contrato.protocolo}</span>
                      <Badge variant="outline" className="text-xs">
                        {EMPREENDIMENTO_LABELS[contrato.empreendimento] || contrato.empreendimento}
                      </Badge>
                      <span className="text-sm text-muted-foreground truncate max-w-[200px]">{contrato.fornecedor_razao || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">{ETAPA_JURIDICA_LABELS[contrato.etapa_atual]}</Badge>
                      <span className="text-xs text-muted-foreground">{contrato.dias_total}d total</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <CardContent className="pt-0 pb-4">
                      <div className="flex items-start gap-2 flex-wrap">
                        {contrato.etapas.map((etapa, i) => {
                          const isLast = i === contrato.etapas.length - 1;
                          const isSlow = etapa.dias_na_etapa > 7;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className={cn(
                                'rounded-lg border p-3 text-xs space-y-1 min-w-[140px]',
                                isLast && 'border-primary bg-primary/5',
                                isSlow && !isLast && 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10',
                              )}>
                                <p className="font-medium">{ETAPA_JURIDICA_LABELS[etapa.etapa]}</p>
                                <p className="text-muted-foreground">{formatBR(etapa.data, 'dd/MM/yyyy')}</p>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span className={cn(isSlow && 'text-red-600 font-medium')}>{etapa.dias_na_etapa}d</span>
                                </div>
                                {etapa.user_name && <p className="text-muted-foreground truncate">{etapa.user_name}</p>}
                                {etapa.observacao && <p className="text-muted-foreground italic truncate max-w-[150px]">{etapa.observacao}</p>}
                              </div>
                              {!isLast && <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
