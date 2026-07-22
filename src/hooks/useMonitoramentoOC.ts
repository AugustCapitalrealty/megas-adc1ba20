import { useEffect, useState, useCallback, useMemo } from 'react';
import { differenceInDays, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Empreendimento } from '@/types';

export interface OCItem {
  id: string; // documento_emitido.id
  numero_documento: string;
  data_oc: string;
  dias_aberto: number;
  tem_nf: boolean;
  ultima_justificativa: string | null;
  previsao_nf: string | null;
  previsao_execucao: string | null;
  ultima_acao_em: string | null;
  ultima_acao_tipo: string | null;
}

export interface OCGroupRow {
  // chave = solicitação
  solicitacao_id: string;
  protocolo: string;
  fornecedor_razao: string | null;
  valor: number;
  empreendimento: Empreendimento;
  natureza_orcamentaria: string;
  status: string;
  cancelamento_pendente: boolean;
  user_id: string;
  solicitante_nome: string | null;
  // OCs agregadas
  ocs: OCItem[];
  // resumo (a OC "mais crítica" — maior aging)
  primary: OCItem;
  has_multiple: boolean;
}

export interface OcKpis {
  total_ativas: number;
  sem_nf: number;
  pendente_justificativa: number;
  cancelamento_pendente: number;
  // deltas vs período anterior (% de variação, pode ser negativo)
  delta_total: number;
  delta_sem_nf: number;
  delta_pendente: number;
  delta_cancel: number;
}

export interface OcDistribution {
  pendente: number;
  adiado: number;
}

const isCurrentMonth = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const isFutureDate = (iso: string | null): boolean => {
  if (!iso) return false;
  const today = new Date().toISOString().slice(0, 10);
  return iso >= today;
};

const QUERY_CHUNK_SIZE = 100;

const chunkArray = <T,>(items: T[], size = QUERY_CHUNK_SIZE): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const fetchInChunks = async <T,>(
  ids: string[],
  query: (batchIds: string[]) => PromiseLike<{ data: T[] | null; error: unknown | null }>
): Promise<T[]> => {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const responses = await Promise.all(chunkArray(uniqueIds).map(batchIds => query(batchIds)));
  const failed = responses.find(response => response.error);
  if (failed?.error) throw failed.error;

  return responses.flatMap(response => response.data || []);
};

/**
 * Status visual da OC (computado a partir do estado da solicitação + OC).
 */
export type OcVisualStatus =
  | 'em_prazo'
  | 'atencao'
  | 'pendente_justificativa'
  | 'aguardando_nf'
  | 'adiado'
  | 'cancel_solicitado'
  | 'cancelado';

export const DEFAULT_DIA_CORTE_JUSTIFICATIVA = 23;

export const computeOcStatus = (
  oc: OCItem,
  group: Pick<OCGroupRow, 'status' | 'cancelamento_pendente'>,
  diaCorte: number = DEFAULT_DIA_CORTE_JUSTIFICATIVA
): OcVisualStatus => {
  if (group.status === 'cancelado') return 'cancelado';
  if (group.cancelamento_pendente) return 'cancel_solicitado';
  if (oc.tem_nf) return 'aguardando_nf';

  const previsaoValida = isFutureDate(oc.previsao_nf);
  if (previsaoValida) return 'adiado';

  const dia = new Date().getDate();
  // Critério de pendência: OC do mês anterior, OU mês atual a partir do dia de corte sem previsão válida
  if (!isCurrentMonth(oc.data_oc)) return 'pendente_justificativa';
  if (dia >= diaCorte && !oc.tem_nf && !previsaoValida) return 'pendente_justificativa';
  if (oc.dias_aberto >= 15) return 'atencao';
  return 'em_prazo';
};

export const computeGroupStatus = (group: OCGroupRow, diaCorte: number = DEFAULT_DIA_CORTE_JUSTIFICATIVA): OcVisualStatus => {
  // Status do grupo = pior status entre as OCs (priorização)
  const order: OcVisualStatus[] = [
    'cancelado',
    'cancel_solicitado',
    'pendente_justificativa',
    'atencao',
    'adiado',
    'em_prazo',
    'aguardando_nf',
  ];
  const statuses = group.ocs.map(o => computeOcStatus(o, group, diaCorte));
  for (const s of order) if (statuses.includes(s)) return s;
  return 'em_prazo';
};

/**
 * Compute aggregated KPIs/distribution/aging from an arbitrary set of groups.
 * Used to make hero cards reactive to filters (empreendimento + busca).
 */
export interface OcAggregates {
  kpis: OcKpis;
  distribution: OcDistribution;
  topOfensores: { group: OCGroupRow; oc: OCItem }[];
  valorEmAberto: number;
  agingMedio: number;
}

export function computeAggregates(groups: OCGroupRow[], diaCorte: number = DEFAULT_DIA_CORTE_JUSTIFICATIVA): OcAggregates {
  let semNf = 0;
  let pendente = 0;
  let cancel = 0;
  let totalAtivas = 0;
  let valorEmAberto = 0;
  let agingSoma = 0;
  let agingCount = 0;

  const dist: OcDistribution = { pendente: 0, adiado: 0 };
  const ofensores: { group: OCGroupRow; oc: OCItem }[] = [];

  groups.forEach(g => {
    const ativo = g.status !== 'cancelado' && g.status !== 'concluida';
    if (ativo) totalAtivas += g.ocs.length;
    if (g.cancelamento_pendente) cancel++;

    let groupTemNfPendente = false;
    g.ocs.forEach(oc => {
      const st = computeOcStatus(oc, g, diaCorte);
      if (ativo && !oc.tem_nf) {
        semNf++;
        groupTemNfPendente = true;
      }
      if (st === 'pendente_justificativa') {
        pendente++;
        ofensores.push({ group: g, oc });
      }

      if (!oc.tem_nf && ativo) {
        agingSoma += oc.dias_aberto;
        agingCount++;
      }
    });
    if (groupTemNfPendente) valorEmAberto += Number(g.valor) || 0;

    // Distribuição operacional conta GRUPOS (solicitações) pelo pior status
    // do grupo, alinhando com cards e abas.
    const groupStatus = computeGroupStatus(g, diaCorte);
    if (groupStatus === 'pendente_justificativa' || groupStatus === 'atencao') {
      dist.pendente++;
    } else if (groupStatus === 'adiado') {
      dist.adiado++;
    }
  });

  return {
    kpis: {
      total_ativas: totalAtivas,
      sem_nf: semNf,
      pendente_justificativa: pendente,
      cancelamento_pendente: cancel,
      delta_total: 0,
      delta_sem_nf: 0,
      delta_pendente: 0,
      delta_cancel: 0,
    },
    distribution: dist,
    topOfensores: ofensores.sort((a, b) => b.oc.dias_aberto - a.oc.dias_aberto).slice(0, 5),
    valorEmAberto,
    agingMedio: agingCount === 0 ? 0 : Math.round(agingSoma / agingCount),
  };
}

export function useMonitoramentoOC(opts: {
  userEmpreendimentos: string[];
  hasAllAccess: boolean;
  enabled: boolean;
}) {
  const { enabled } = opts;
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [groups, setGroups] = useState<OCGroupRow[]>([]);
  const [historicalKpis, setHistoricalKpis] = useState<{ prev: OcKpis | null }>({ prev: null });
  const [diaCorte, setDiaCorte] = useState<number>(DEFAULT_DIA_CORTE_JUSTIFICATIVA);
  const [configId, setConfigId] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('monitoramento_oc_config')
      .select('id, dia_corte_justificativa')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setConfigId(data.id);
      setDiaCorte(Number(data.dia_corte_justificativa) || DEFAULT_DIA_CORTE_JUSTIFICATIVA);
    }
  }, []);

  const updateDiaCorte = useCallback(async (novoDia: number) => {
    const dia = Math.min(28, Math.max(1, Math.round(novoDia)));
    const { data: { user } } = await supabase.auth.getUser();
    if (configId) {
      const { error } = await (supabase as any)
        .from('monitoramento_oc_config')
        .update({ dia_corte_justificativa: dia, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
        .eq('id', configId);
      if (error) throw error;
    } else {
      const { data, error } = await (supabase as any)
        .from('monitoramento_oc_config')
        .insert({ dia_corte_justificativa: dia, updated_by: user?.id ?? null })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) setConfigId(data.id);
    }
    setDiaCorte(dia);
  }, [configId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data: docs, error: docsError } = await supabase
        .from('documentos_emitidos')
        .select('id, solicitacao_id, numero_documento, created_at, tipo_documento')
        .eq('tipo_documento', 'OC')
        .order('created_at', { ascending: false });
      if (docsError) throw docsError;

      if (!docs || docs.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // Dedupe defensivo (caso constraint seja burlada por race ou fallback)
      const seen = new Set<string>();
      const uniqueDocs = docs.filter(d => {
        const key = `${d.solicitacao_id}|${d.numero_documento}|${d.tipo_documento}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const solIds = [...new Set(uniqueDocs.map(d => d.solicitacao_id))];

      const [sols, fiscais, acompanhamentos] = await Promise.all([
        fetchInChunks<any>(solIds, batchIds =>
          supabase
            .from('solicitacoes')
            .select('id, protocolo, valor, empreendimento, status, cancelamento_pendente, fornecedor_id, natureza_orcamentaria, user_id')
            .in('id', batchIds)
        ),
        fetchInChunks<any>(solIds, batchIds =>
          supabase
            .from('documentos_fiscais')
            .select('solicitacao_id')
            .in('solicitacao_id', batchIds)
        ),
        fetchInChunks<any>(solIds, batchIds =>
          supabase
            .from('historico_solicitacoes')
            .select('solicitacao_id, acao, motivo, mensagem, previsao_execucao, previsao_nf, created_at')
            .eq('categoria', 'acompanhamento_oc')
            .in('solicitacao_id', batchIds)
            .order('created_at', { ascending: false })
        ),
      ]);

      const fornecedorIds = [...new Set(sols.map(s => (s as any).fornecedor_id).filter(Boolean))];
      const userIds = [...new Set(sols.map(s => s.user_id).filter(Boolean))];

      const [fornecedores, profiles] = await Promise.all([
        fetchInChunks<any>(fornecedorIds, batchIds =>
          supabase.from('fornecedores').select('id, razao_social, nome_fantasia').in('id', batchIds)
        ),
        fetchInChunks<any>(userIds, batchIds =>
          supabase.from('profiles').select('id, full_name').in('id', batchIds)
        ),
      ]);

      const fornecedorMap: Record<string, string> = Object.fromEntries(
        fornecedores.map((f: any) => [f.id, f.nome_fantasia || f.razao_social || ''])
      );
      const profileMap: Record<string, string> = Object.fromEntries(
        profiles.map((p: any) => [p.id, p.full_name || ''])
      );

      const nfSet = new Set(fiscais.map(f => f.solicitacao_id));

      const latestAcomp: Record<string, any> = {};
      acompanhamentos.forEach((a: any) => {
        // Normalize unified-history shape into the legacy oc_acompanhamento shape
        // expected by the rest of this hook.
        const normalized = {
          ...a,
          tipo_acao: a.tipo_acao ?? a.acao,
          justificativa: a.justificativa ?? a.motivo ?? a.mensagem ?? null,
        };
        if (!latestAcomp[a.solicitacao_id]) latestAcomp[a.solicitacao_id] = normalized;
      });

      const solMap = Object.fromEntries(sols.map(s => [s.id, s]));

      // Agrupar OCs por solicitação
      const grouped = new Map<string, OCGroupRow>();
      uniqueDocs.forEach(doc => {
        const sol = solMap[doc.solicitacao_id] as any;
        if (!sol) return;
        if (sol.natureza_orcamentaria === 'agua' || sol.natureza_orcamentaria === 'energia_eletrica') return;
        if (sol.status === 'concluida') return;

        const acomp = latestAcomp[sol.id];
        const previsaoNfBruta = acomp?.previsao_nf || null;
        const previsaoNfValida = previsaoNfBruta && previsaoNfBruta >= new Date().toISOString().slice(0, 10) ? previsaoNfBruta : null;

      // Excluir grupos canceladas/rejeitadas/cancelamento aprovado
      if (sol.status === 'cancelado' || sol.status === 'rejeitado') return;
      if (acomp?.tipo_acao === 'cancelamento_aprovado') return;

        const oc: OCItem = {
          id: doc.id,
          numero_documento: doc.numero_documento,
          data_oc: doc.created_at,
          dias_aberto: differenceInDays(new Date(), new Date(doc.created_at)),
          tem_nf: nfSet.has(sol.id),
          ultima_justificativa: acomp?.justificativa || null,
          previsao_nf: previsaoNfValida,
          previsao_execucao: acomp?.previsao_execucao || null,
          ultima_acao_em: acomp?.created_at || null,
          ultima_acao_tipo: acomp?.tipo_acao || null,
        };

        const existing = grouped.get(sol.id);
        if (existing) {
          existing.ocs.push(oc);
        } else {
          grouped.set(sol.id, {
            solicitacao_id: sol.id,
            protocolo: sol.protocolo,
            fornecedor_razao: sol.fornecedor_id ? fornecedorMap[sol.fornecedor_id] || null : null,
            valor: sol.valor,
            empreendimento: sol.empreendimento,
            natureza_orcamentaria: sol.natureza_orcamentaria,
            status: sol.status,
            cancelamento_pendente: sol.cancelamento_pendente || false,
            user_id: sol.user_id,
            solicitante_nome: profileMap[sol.user_id] || null,
            ocs: [oc],
            primary: oc,
            has_multiple: false,
          });
        }
      });

      // Definir primary = OC mais antiga (maior aging) e flag de múltiplas
      const result: OCGroupRow[] = [];
      grouped.forEach(g => {
        g.ocs.sort((a, b) => b.dias_aberto - a.dias_aberto);
        g.primary = g.ocs[0];
        g.has_multiple = g.ocs.length > 1;
        result.push(g);
      });

      result.sort((a, b) => b.primary.dias_aberto - a.primary.dias_aberto);
      setGroups(result);
    } catch (err) {
      console.error('useMonitoramentoOC fetch error', err);
      setFetchError(err instanceof Error ? err.message : 'Não foi possível carregar os dados de OC x NF.');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      fetchData();
      fetchConfig();
    }
  }, [enabled, fetchData, fetchConfig]);

  // KPIs computados
  const kpis: OcKpis = useMemo(() => {
    const ativas = groups.filter(g => g.status !== 'cancelado' && g.status !== 'concluida');
    let semNf = 0;
    let pendente = 0;
    let cancel = 0;
    ativas.forEach(g => {
      // Cada OC contabiliza individualmente para os KPIs operacionais
      g.ocs.forEach(oc => {
        const st = computeOcStatus(oc, g, diaCorte);
        if (!oc.tem_nf) semNf++;
        if (st === 'pendente_justificativa') pendente++;
      });
      if (g.cancelamento_pendente) cancel++;
    });
    const totalAtivas = ativas.reduce((acc, g) => acc + g.ocs.length, 0);

    // Deltas comparativos: aproximação simples — vamos comparar com snapshot histórico se disponível
    const prev = historicalKpis.prev;
    const delta = (curr: number, prv: number | undefined) => {
      if (!prv || prv === 0) return 0;
      return Math.round(((curr - prv) / prv) * 100);
    };

    return {
      total_ativas: totalAtivas,
      sem_nf: semNf,
      pendente_justificativa: pendente,
      cancelamento_pendente: cancel,
      delta_total: delta(totalAtivas, prev?.total_ativas),
      delta_sem_nf: delta(semNf, prev?.sem_nf),
      delta_pendente: delta(pendente, prev?.pendente_justificativa),
      delta_cancel: delta(cancel, prev?.cancelamento_pendente),
    };
  }, [groups, historicalKpis, diaCorte]);

  const distribution: OcDistribution = useMemo(() => {
    const dist: OcDistribution = { pendente: 0, adiado: 0 };
    groups.forEach(g => {
      g.ocs.forEach(oc => {
        const st = computeOcStatus(oc, g, diaCorte);
        if (st === 'pendente_justificativa') dist.pendente++;
        else if (st === 'adiado') dist.adiado++;
      });
    });
    return dist;
  }, [groups, diaCorte]);

  // Top ofensores: OCs (não grupos) com maior aging e sem justificativa válida
  const topOfensores = useMemo(() => {
    const candidates: { group: OCGroupRow; oc: OCItem }[] = [];
    groups.forEach(g => {
      g.ocs.forEach(oc => {
        const st = computeOcStatus(oc, g, diaCorte);
        if (st === 'pendente_justificativa') candidates.push({ group: g, oc });
      });
    });
    return candidates.sort((a, b) => b.oc.dias_aberto - a.oc.dias_aberto).slice(0, 5);
  }, [groups, diaCorte]);

  // Meta do mês: % de OCs do mês com NF emitida (meta 90%)
  const metaMes = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    let totalMes = 0;
    let comNf = 0;
    groups.forEach(g => {
      g.ocs.forEach(oc => {
        if (new Date(oc.data_oc) >= start) {
          totalMes++;
          if (oc.tem_nf) comNf++;
        }
      });
    });
    const pct = totalMes === 0 ? 0 : Math.round((comNf / totalMes) * 100);
    return { totalMes, comNf, pct, meta: 90 };
  }, [groups]);

  const valorEmAberto = useMemo(() => {
    let total = 0;
    groups.forEach(g => {
      // soma o valor da solicitação se houver alguma OC sem NF
      if (g.ocs.some(oc => !oc.tem_nf)) total += Number(g.valor) || 0;
    });
    return total;
  }, [groups]);

  const agingMedio = useMemo(() => {
    let soma = 0;
    let count = 0;
    groups.forEach(g => {
      g.ocs.forEach(oc => {
        if (!oc.tem_nf) {
          soma += oc.dias_aberto;
          count++;
        }
      });
    });
    return count === 0 ? 0 : Math.round(soma / count);
  }, [groups]);

  return {
    loading,
    fetchError,
    groups,
    kpis,
    distribution,
    topOfensores,
    metaMes,
    valorEmAberto,
    agingMedio,
    refetch: fetchData,
    diaCorte,
    updateDiaCorte,
  };
}