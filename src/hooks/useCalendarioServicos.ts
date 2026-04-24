import { useCallback, useEffect, useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, subDays, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Empreendimento } from '@/types';

export type CalendarioStatusVisual =
  | 'agendado'
  | 'atrasado'
  | 'oc_enviada'
  | 'oc_nao_liberada'
  | 'aguardando_nf'
  | 'concluido'
  | 'cancel_solicitado'
  | 'cancelado'
  | 'em_processamento';

export interface ServicoCalendario {
  id: string;
  protocolo: string;
  status: string;
  cancelamento_pendente: boolean;
  empreendimento: Empreendimento;
  valor: number;
  descricao: string;
  data_execucao_servico: string; // YYYY-MM-DD
  user_id: string;
  solicitante_nome: string | null;
  fornecedor_id: string | null;
  fornecedor_razao: string | null;
  visual: CalendarioStatusVisual;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Mapeia o status real da solicitação para o status visual usado no calendário. */
export function computeCalendarioVisual(sol: {
  status: string;
  cancelamento_pendente: boolean;
  data_execucao_servico: string;
}): CalendarioStatusVisual {
  if (sol.status === 'cancelado' || sol.status === 'rejeitado') return 'cancelado';
  if (sol.cancelamento_pendente) return 'cancel_solicitado';

  if (
    sol.status === 'concluida' ||
    sol.status === 'enviado_pagamento' ||
    sol.status === 'nf_boleto_enviados'
  ) {
    return 'concluido';
  }
  if (sol.status === 'aguardando_nf_boleto') return 'aguardando_nf';

  if (sol.status === 'aguardando_execucao') {
    return sol.data_execucao_servico > todayISO() ? 'agendado' : 'atrasado';
  }
  if (sol.status === 'enviado_fornecedor' || sol.status === 'liberado_fornecedor') {
    return 'oc_enviada';
  }
  if (sol.status === 'aguardando_aceite' || sol.status === 'oc_ac_emitida') {
    return 'oc_nao_liberada';
  }
  return 'em_processamento';
}

export function useCalendarioServicos(opts: {
  refMonth: Date;
  userEmpreendimentos: string[];
  hasAllAccess: boolean;
  enabled: boolean;
}) {
  const { refMonth, userEmpreendimentos, hasAllAccess, enabled } = opts;
  const [loading, setLoading] = useState(true);
  const [servicos, setServicos] = useState<ServicoCalendario[]>([]);

  // Range do mês visível, com folga de 7 dias para preencher bordas da grade.
  const range = useMemo(() => {
    const from = subDays(startOfMonth(refMonth), 7);
    const to = addDays(endOfMonth(refMonth), 7);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [refMonth]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('solicitacoes')
        .select(
          'id, protocolo, status, cancelamento_pendente, empreendimento, valor, descricao, data_execucao_servico, user_id, fornecedor_id, tipo_entrega'
        )
        .eq('tipo_entrega', 'servico')
        .not('data_execucao_servico', 'is', null)
        .gte('data_execucao_servico', range.from)
        .lte('data_execucao_servico', range.to);

      if (!hasAllAccess && userEmpreendimentos.length > 0) {
        query = query.in('empreendimento', userEmpreendimentos as Empreendimento[]);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = data || [];

      const fornecedorIds = [...new Set(rows.map(r => r.fornecedor_id).filter(Boolean))] as string[];
      const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[];

      const [fornecedoresRes, profilesRes] = await Promise.all([
        fornecedorIds.length
          ? supabase
              .from('fornecedores')
              .select('id, razao_social, nome_fantasia')
              .in('id', fornecedorIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? supabase.from('profiles').select('id, full_name').in('id', userIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const fornecedorMap: Record<string, string> = Object.fromEntries(
        (fornecedoresRes.data || []).map((f: any) => [
          f.id,
          f.nome_fantasia || f.razao_social || '',
        ])
      );
      const profileMap: Record<string, string> = Object.fromEntries(
        (profilesRes.data || []).map((p: any) => [p.id, p.full_name || ''])
      );

      const list: ServicoCalendario[] = rows.map((r: any) => ({
        id: r.id,
        protocolo: r.protocolo,
        status: r.status,
        cancelamento_pendente: r.cancelamento_pendente || false,
        empreendimento: r.empreendimento,
        valor: Number(r.valor) || 0,
        descricao: r.descricao || '',
        data_execucao_servico: r.data_execucao_servico,
        user_id: r.user_id,
        solicitante_nome: profileMap[r.user_id] || null,
        fornecedor_id: r.fornecedor_id,
        fornecedor_razao: r.fornecedor_id ? fornecedorMap[r.fornecedor_id] || null : null,
        visual: computeCalendarioVisual({
          status: r.status,
          cancelamento_pendente: r.cancelamento_pendente || false,
          data_execucao_servico: r.data_execucao_servico,
        }),
      }));

      setServicos(list);
    } catch (err) {
      console.error('useCalendarioServicos fetch error', err);
      setServicos([]);
    } finally {
      setLoading(false);
    }
  }, [hasAllAccess, range.from, range.to, userEmpreendimentos]);

  useEffect(() => {
    if (enabled) fetchData();
  }, [enabled, fetchData]);

  // Agrupamento por dia (chave YYYY-MM-DD)
  const byDay = useMemo(() => {
    const map = new Map<string, ServicoCalendario[]>();
    servicos.forEach(s => {
      const arr = map.get(s.data_execucao_servico) || [];
      arr.push(s);
      map.set(s.data_execucao_servico, arr);
    });
    return map;
  }, [servicos]);

  return { loading, servicos, byDay, refetch: fetchData };
}