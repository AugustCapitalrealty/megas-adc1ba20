import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserEmpreendimentos } from '@/hooks/useUserEmpreendimentos';
import { addDays, differenceInDays, isPast } from 'date-fns';
import type { Empreendimento, TipoGarantia } from '@/types';

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
  // Computed fields
  garantias: GarantiaDetalhe[];
  statusGeral: 'vigente' | 'expirando' | 'expirada';
}

export interface GarantiaDetalhe {
  tipo: 'servico' | 'produto' | 'geral';
  label: string;
  diasContratados: number;
  dataExpiracao: Date;
  diasRestantes: number;
  expirada: boolean;
  status: 'vigente' | 'expirando' | 'expirada';
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

  let status: 'vigente' | 'expirando' | 'expirada';
  if (expirada || diasRestantes <= 0) {
    status = 'expirada';
  } else if (diasRestantes <= 30) {
    status = 'expirando';
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
  let statusGeral: 'vigente' | 'expirando' | 'expirada' = 'vigente';
  for (const g of garantias) {
    if (g.status === 'expirada') { statusGeral = 'expirada'; break; }
    if (g.status === 'expirando') statusGeral = 'expirando';
  }

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
  };
}

export type StatusFiltro = 'todos' | 'vigente' | 'expirando' | 'expirada';
export type TipoFiltro = 'todos' | 'servico' | 'produto' | 'ambos';

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

      // Filtrar por empreendimentos do usuário
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
    } catch (err) {
      setError('Erro ao carregar garantias');
    } finally {
      setLoading(false);
    }
  };

  // Filtros aplicados
  const garantiasFiltradas = garantias.filter(g => {
    if (filtroEmpreendimento !== 'todos' && g.empreendimento !== filtroEmpreendimento) return false;
    if (filtroTipo !== 'todos' && g.tipo_garantia !== filtroTipo) return false;
    if (filtroStatus !== 'todos' && g.statusGeral !== filtroStatus) return false;
    if (busca) {
      const search = busca.toLowerCase();
      const matchProtocolo = g.protocolo?.toLowerCase().includes(search);
      const matchDescricao = g.descricao?.toLowerCase().includes(search);
      const matchFornecedor = g.fornecedor_razao_social?.toLowerCase().includes(search) ||
        g.fornecedor_nome_fantasia?.toLowerCase().includes(search);
      if (!matchProtocolo && !matchDescricao && !matchFornecedor) return false;
    }
    return true;
  });

  // KPIs
  const kpis = {
    vigentes: garantias.filter(g => g.statusGeral === 'vigente').length,
    expirando: garantias.filter(g => g.statusGeral === 'expirando').length,
    expiradas: garantias.filter(g => g.statusGeral === 'expirada').length,
    total: garantias.length,
  };

  const toggleInfraspeak = async (id: string, currentValue: boolean) => {
    const { error: updateError } = await supabase
      .from('solicitacoes')
      .update({ infraspeak_registrada: !currentValue } as any)
      .eq('id', id);
    
    if (!updateError) {
      setGarantias(prev => prev.map(g => 
        g.id === id ? { ...g, infraspeak_registrada: !currentValue } : g
      ));
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
    refetch: fetchGarantias,
    toggleInfraspeak,
  };
}
