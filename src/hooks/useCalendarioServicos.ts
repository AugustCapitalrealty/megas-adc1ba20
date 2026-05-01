import { useCallback, useEffect, useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, subDays, addDays, parseISO } from 'date-fns';
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
  | 'em_processamento'
  | 'previsao_sem_oc'
  | 'previsao_sem_oc_risco';

export type ServicoPosicao = 'inicio' | 'meio' | 'fim' | 'unico';

const STATUS_COM_OC = new Set([
  'oc_ac_emitida',
  'aguardando_aceite',
  'liberado_fornecedor',
  'enviado_fornecedor',
  'aguardando_execucao',
  'aguardando_nf_boleto',
  'nf_boleto_enviados',
  'enviado_pagamento',
  'concluida',
]);

export interface ServicoCalendario {
  id: string;
  protocolo: string;
  status: string;
  cancelamento_pendente: boolean;
  empreendimento: Empreendimento;
  valor: number;
  descricao: string;
  data_execucao_servico: string | null; // YYYY-MM-DD
  data_inicio: string | null;
  data_fim: string | null;
  tipo_contratacao: string | null;
  contrato_mensal: boolean;
  tem_oc: boolean;
  user_id: string;
  solicitante_nome: string | null;
  fornecedor_id: string | null;
  fornecedor_razao: string | null;
  visual: CalendarioStatusVisual;
}

export interface ServicoCalendarioDia extends ServicoCalendario {
  posicao: ServicoPosicao;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Adiciona N dias corridos a uma data ISO (YYYY-MM-DD), retornando ISO. */
function addDaysISO(iso: string, days: number): string {
  return addDays(parseISO(iso), days).toISOString().slice(0, 10);
}

/** Mapeia o status real da solicitação para o status visual usado no calendário. */
export function computeCalendarioVisual(sol: {
  status: string;
  cancelamento_pendente: boolean;
  data_execucao_servico: string | null;
  data_fim?: string | null;
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
    const ref = sol.data_execucao_servico ?? sol.data_fim ?? null;
    if (!ref) return 'agendado';
    return ref > todayISO() ? 'agendado' : 'atrasado';
  }
  if (sol.status === 'enviado_fornecedor' || sol.status === 'liberado_fornecedor') {
    return 'oc_enviada';
  }
  if (sol.status === 'aguardando_aceite' || sol.status === 'oc_ac_emitida') {
    return 'oc_nao_liberada';
  }

  // Status pré-OC com previsão informada: avaliar risco.
  if (!STATUS_COM_OC.has(sol.status)) {
    const ref = sol.data_execucao_servico ?? sol.data_fim ?? null;
    if (ref) {
      const today = todayISO();
      const limite = addDaysISO(today, 3);
      if (ref <= limite) return 'previsao_sem_oc_risco';
      return 'previsao_sem_oc';
    }
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
      const SELECT =
        'id, protocolo, status, cancelamento_pendente, empreendimento, valor, descricao, data_execucao_servico, data_inicio, data_fim, tipo_contratacao, contrato_mensal, user_id, fornecedor_id, tipo_entrega';

      const buildBase = () => {
        let q = supabase.from('solicitacoes').select(SELECT);
        if (!hasAllAccess && userEmpreendimentos.length > 0) {
          q = q.in('empreendimento', userEmpreendimentos as Empreendimento[]);
        }
        return q;
      };

      // A) tem data_execucao_servico no range (qualquer tipo_entrega = serviço; mantém compat)
      const queryA = buildBase()
        .eq('tipo_entrega', 'servico')
        .not('data_execucao_servico', 'is', null)
        .gte('data_execucao_servico', range.from)
        .lte('data_execucao_servico', range.to);

      // B) AC de serviço com janela [data_inicio, data_fim] que intersecta o range
      const queryB = buildBase()
        .eq('tipo_contratacao', 'servicos')
        .not('data_inicio', 'is', null)
        .not('data_fim', 'is', null)
        .lte('data_inicio', range.to)
        .gte('data_fim', range.from);

      const [resA, resB] = await Promise.all([queryA, queryB]);
      if (resA.error) throw resA.error;
      if (resB.error) throw resB.error;

      const map = new Map<string, any>();
      [...(resA.data || []), ...(resB.data || [])].forEach((r: any) => {
        if (!map.has(r.id)) map.set(r.id, r);
      });
      const rows = Array.from(map.values());

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
        data_execucao_servico: r.data_execucao_servico || null,
        data_inicio: r.data_inicio || null,
        data_fim: r.data_fim || null,
        tipo_contratacao: r.tipo_contratacao || null,
        contrato_mensal: !!r.contrato_mensal,
        tem_oc: STATUS_COM_OC.has(r.status),
        user_id: r.user_id,
        solicitante_nome: profileMap[r.user_id] || null,
        fornecedor_id: r.fornecedor_id,
        fornecedor_razao: r.fornecedor_id ? fornecedorMap[r.fornecedor_id] || null : null,
        visual: computeCalendarioVisual({
          status: r.status,
          cancelamento_pendente: r.cancelamento_pendente || false,
          data_execucao_servico: r.data_execucao_servico || null,
          data_fim: r.data_fim || null,
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

  // Agrupamento por dia (chave YYYY-MM-DD), expandindo serviços com período em vários dias.
  const byDay = useMemo(() => {
    const map = new Map<string, ServicoCalendarioDia[]>();
    const push = (key: string, item: ServicoCalendarioDia) => {
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    };
    servicos.forEach(s => {
      const hasRange = !!(s.data_inicio && s.data_fim && s.data_inicio <= s.data_fim);
      if (s.contrato_mensal && hasRange) {
        // Contrato mensal: 1 chip por mês entre data_inicio e data_fim,
        // ancorado no dia 1 (ou na data_inicio dentro do primeiro mês).
        const di = parseISO(s.data_inicio!);
        const df = parseISO(s.data_fim!);
        let cursor = startOfMonth(di);
        const lastMonth = startOfMonth(df);
        while (cursor <= lastMonth) {
          const anchor = cursor > di ? cursor : di;
          if (anchor > df) break;
          const key = anchor.toISOString().slice(0, 10);
          push(key, { ...s, posicao: 'unico' });
          cursor = addDays(endOfMonth(cursor), 1); // próximo mês
        }
      } else if (hasRange) {
        // Demais ACs com período: chip pontual apenas no início (evita poluição).
        push(s.data_inicio!, { ...s, posicao: 'unico' });
      } else if (s.data_execucao_servico) {
        push(s.data_execucao_servico, { ...s, posicao: 'unico' });
      }
    });
    return map;
  }, [servicos]);

  return { loading, servicos, byDay, refetch: fetchData };
}