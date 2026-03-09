import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { addDays, differenceInDays, isPast } from 'date-fns';
import type { Empreendimento, TipoGarantia } from '@/types';

export type GarantiaStatus = 'vigente' | 'expirando_breve' | 'expirando' | 'expirada';

const STATUS_PRIORITY: Record<GarantiaStatus, number> = {
  vigente: 0,
  expirando_breve: 1,
  expirando: 2,
  expirada: 3,
};

export interface GarantiaDetalhe {
  tipo: 'servico' | 'produto' | 'geral';
  label: string;
  diasContratados: number;
  dataExpiracao: Date;
  diasRestantes: number;
  expirada: boolean;
  status: GarantiaStatus;
}

export interface GarantiaItem {
  id: string;
  protocolo: string;
  descricao: string;
  empreendimento: Empreendimento;
  valor: number;
  tipo_garantia: TipoGarantia;
  dias_garantia: number | null;
  dias_garantia_servico: number | null;
  dias_garantia_produto: number | null;
  data_conclusao: string;
  fornecedor_razao_social: string | null;
  fornecedor_nome_fantasia: string | null;
  fornecedor_cnpj: string | null;
  infraspeak_registrada: boolean;
  // Computed
  garantias: GarantiaDetalhe[];
  statusGeral: GarantiaStatus;
  proximaExpiracaoDias: number; // min days remaining across all garantias
}

function calcularGarantiaDetalhe(
  tipo: 'servico' | 'produto' | 'geral',
  label: string,
  dias: number,
  dataConclusao: string
): GarantiaDetalhe {
  const dataInicio = new Date(dataConclusao);
  const dataExpiracao = addDays(dataInicio, dias);
  const diasRestantes = differenceInDays(dataExpiracao, new Date());
  const expirada = isPast(dataExpiracao);

  let status: GarantiaStatus;
  if (expirada || diasRestantes <= 0) {
    status = 'expirada';
  } else if (diasRestantes <= 30) {
    status = 'expirando';
  } else if (diasRestantes <= 60) {
    status = 'expirando_breve';
  } else {
    status = 'vigente';
  }

  return { tipo, label, diasContratados: dias, dataExpiracao, diasRestantes, expirada, status };
}

function processarGarantias(item: any): GarantiaItem {
  const garantias: GarantiaDetalhe[] = [];

  if (item.tipo_garantia === 'ambos') {
    if (item.dias_garantia_servico) {
      garantias.push(calcularGarantiaDetalhe('servico', 'Serviço', item.dias_garantia_servico, item.data_conclusao));
    }
    if (item.dias_garantia_produto) {
      garantias.push(calcularGarantiaDetalhe('produto', 'Produto', item.dias_garantia_produto, item.data_conclusao));
    }
  } else {
    const dias = item.dias_garantia || 0;
    const label = item.tipo_garantia === 'servico' ? 'Serviço' : 'Produto';
    garantias.push(calcularGarantiaDetalhe(item.tipo_garantia as 'servico' | 'produto', label, dias, item.data_conclusao));
  }

  // Status geral = pior status entre as garantias
  let statusGeral: GarantiaStatus = 'vigente';
  for (const g of garantias) {
    if (STATUS_PRIORITY[g.status] > STATUS_PRIORITY[statusGeral]) {
      statusGeral = g.status;
    }
  }

  // Próxima expiração = menor dias restantes (entre não-expiradas), ou -Infinity se tudo expirado
  const proximaExpiracaoDias = garantias.reduce((min, g) => {
    return Math.min(min, g.diasRestantes);
  }, Infinity);

  return {
    id: item.id,
    protocolo: item.protocolo,
    descricao: item.descricao,
    empreendimento: item.empreendimento,
    valor: item.valor,
    tipo_garantia: item.tipo_garantia,
    dias_garantia: item.dias_garantia,
    dias_garantia_servico: item.dias_garantia_servico,
    dias_garantia_produto: item.dias_garantia_produto,
    data_conclusao: item.data_conclusao,
    fornecedor_razao_social: item.fornecedores?.razao_social || null,
    fornecedor_nome_fantasia: item.fornecedores?.nome_fantasia || null,
    fornecedor_cnpj: item.fornecedores?.cnpj || null,
    infraspeak_registrada: item.infraspeak_registrada ?? false,
    garantias,
    statusGeral,
    proximaExpiracaoDias: isFinite(proximaExpiracaoDias) ? proximaExpiracaoDias : -9999,
  };
}

export type StatusFiltro = 'todos' | 'vigente' | 'expirando_breve' | 'expirando' | 'expirada';
export type TipoFiltro = 'todos' | 'servico' | 'produto' | 'ambos';
export type OrdemFiltro = 'expiracao_asc' | 'expiracao_desc' | 'valor_desc' | 'recente';

export function useGarantiasVigentes() {
  const { user } = useAuth();
  const { empreendimentos, hasAllAccess, loading: loadingEmp } = useUserEmpreendimentos(user?.id);
  const [garantias, setGarantias] = useState<GarantiaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroEmpreendimento, setFiltroEmpreendimento] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todos');
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<OrdemFiltro>('expiracao_asc');

  useEffect(() => {
    if (loadingEmp) return;
    fetchGarantias();
  }, [loadingEmp, empreendimentos, hasAllAccess]);

  const fetchGarantias = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('solicitacoes')
        .select(`
          id, protocolo, descricao, empreendimento, valor,
          tipo_garantia, dias_garantia, dias_garantia_servico, dias_garantia_produto,
          data_conclusao, infraspeak_registrada,
          fornecedores:fornecedor_id (razao_social, nome_fantasia, cnpj)
        `)
        .eq('status', 'concluida')
        .not('tipo_garantia', 'is', null)
        .neq('tipo_garantia', 'nenhuma')
        .not('data_conclusao', 'is', null)
        .order('data_conclusao', { ascending: false });

      if (!hasAllAccess && empreendimentos.length > 0) {
        query = query.in('empreendimento', empreendimentos);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const processados = (data || []).map(processarGarantias);
      setGarantias(processados);
    } catch {
      setError('Erro ao carregar garantias');
    } finally {
      setLoading(false);
    }
  };

  // Filtros + ordenação via useMemo
  const garantiasFiltradas = useMemo(() => {
    const filtered = garantias.filter(g => {
      if (filtroEmpreendimento !== 'todos' && g.empreendimento !== filtroEmpreendimento) return false;
      if (filtroTipo !== 'todos' && g.tipo_garantia !== filtroTipo) return false;
      if (filtroStatus !== 'todos' && g.statusGeral !== filtroStatus) return false;
      if (busca) {
        const search = busca.toLowerCase();
        const matchProtocolo = g.protocolo?.toLowerCase().includes(search);
        const matchDescricao = g.descricao?.toLowerCase().includes(search);
        const matchFornecedor =
          g.fornecedor_razao_social?.toLowerCase().includes(search) ||
          g.fornecedor_nome_fantasia?.toLowerCase().includes(search);
        if (!matchProtocolo && !matchDescricao && !matchFornecedor) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      switch (ordem) {
        case 'expiracao_asc':
          return a.proximaExpiracaoDias - b.proximaExpiracaoDias;
        case 'expiracao_desc':
          return b.proximaExpiracaoDias - a.proximaExpiracaoDias;
        case 'valor_desc':
          return b.valor - a.valor;
        case 'recente':
          return new Date(b.data_conclusao).getTime() - new Date(a.data_conclusao).getTime();
        default:
          return 0;
      }
    });
  }, [garantias, filtroEmpreendimento, filtroTipo, filtroStatus, busca, ordem]);

  // KPIs
  const kpis = useMemo(() => {
    const vigentes = garantias.filter(g => g.statusGeral === 'vigente');
    const expirando = garantias.filter(g => g.statusGeral === 'expirando');
    const expirandoBreve = garantias.filter(g => g.statusGeral === 'expirando_breve');
    const expiradas = garantias.filter(g => g.statusGeral === 'expirada');

    const valorVigentes = vigentes.reduce((s, g) => s + g.valor, 0);
    const valorExpirando = [...expirando, ...expirandoBreve].reduce((s, g) => s + g.valor, 0);
    const valorTotal = garantias.reduce((s, g) => s + g.valor, 0);

    const proximaExpiracao = expirando.length > 0
      ? Math.min(...expirando.map(g => g.proximaExpiracaoDias))
      : null;

    return {
      vigentes: vigentes.length,
      expirando: expirando.length,
      expirando_breve: expirandoBreve.length,
      expiradas: expiradas.length,
      total: garantias.length,
      valorVigentes,
      valorExpirando,
      valorTotal,
      proximaExpiracao,
    };
  }, [garantias]);

  const toggleInfraspeak = async (id: string, currentValue: boolean) => {
    const { error: updateError } = await supabase
      .from('solicitacoes')
      .update({ infraspeak_registrada: !currentValue } as any)
      .eq('id', id);

    if (!updateError) {
      setGarantias(prev =>
        prev.map(g => (g.id === id ? { ...g, infraspeak_registrada: !currentValue } : g))
      );
    }
    return !updateError;
  };

  return {
    garantias: garantiasFiltradas,
    kpis,
    loading: loading || loadingEmp,
    error,
    filtroEmpreendimento, setFiltroEmpreendimento,
    filtroTipo, setFiltroTipo,
    filtroStatus, setFiltroStatus,
    busca, setBusca,
    ordem, setOrdem,
    refetch: fetchGarantias,
    toggleInfraspeak,
  };
}
