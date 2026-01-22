import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  type Solicitacao, 
  type Fornecedor, 
  type Profile, 
  type Cliente, 
  type Anexo, 
  type DocumentoEmitido, 
  type DocumentoFiscal,
  type HistoricoSolicitacao
} from '@/types';

// Fields shared by all fornecedor types
interface FornecedorFields {
  cnpj?: string;
  razao?: string;
  nome_fantasia?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  is_mei?: boolean;
  cep?: string;
  bairro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  cnae_principal_codigo?: number;
  cnae_principal_descricao?: string;
  cnaes_secundarios?: Array<{codigo: number; descricao: string}>;
  situacao_cadastral?: number;
  situacao_cadastral_descricao?: string;
  data_situacao_cadastral?: string;
  natureza_juridica?: string;
  porte?: string;
  capital_social?: number;
  data_inicio_atividade?: string;
}

export interface SolicitacaoDetalhes {
  solicitacao: Solicitacao & {
    // Fornecedor Escolhido
    fornecedor_cnpj?: string;
    fornecedor_razao?: string;
    fornecedor_nome_fantasia?: string;
    fornecedor_email?: string;
    fornecedor_telefone?: string;
    fornecedor_endereco?: string;
    fornecedor_cidade?: string;
    fornecedor_uf?: string;
    fornecedor_is_mei?: boolean;
    fornecedor_cep?: string;
    fornecedor_bairro?: string;
    fornecedor_logradouro?: string;
    fornecedor_numero?: string;
    fornecedor_complemento?: string;
    fornecedor_cnae_principal_codigo?: number;
    fornecedor_cnae_principal_descricao?: string;
    fornecedor_cnaes_secundarios?: Array<{codigo: number; descricao: string}>;
    fornecedor_situacao_cadastral?: number;
    fornecedor_situacao_cadastral_descricao?: string;
    fornecedor_data_situacao_cadastral?: string;
    fornecedor_natureza_juridica?: string;
    fornecedor_porte?: string;
    fornecedor_capital_social?: number;
    fornecedor_data_inicio_atividade?: string;
    // Concorrente 1 (completo)
    concorrente1_id?: string;
    concorrente1_cnpj?: string;
    concorrente1_razao?: string;
    concorrente1_nome_fantasia?: string;
    concorrente1_email?: string;
    concorrente1_telefone?: string;
    concorrente1_endereco?: string;
    concorrente1_cidade?: string;
    concorrente1_uf?: string;
    concorrente1_is_mei?: boolean;
    concorrente1_cep?: string;
    concorrente1_bairro?: string;
    concorrente1_logradouro?: string;
    concorrente1_numero?: string;
    concorrente1_complemento?: string;
    concorrente1_cnae_principal_codigo?: number;
    concorrente1_cnae_principal_descricao?: string;
    concorrente1_cnaes_secundarios?: Array<{codigo: number; descricao: string}>;
    concorrente1_situacao_cadastral?: number;
    concorrente1_situacao_cadastral_descricao?: string;
    concorrente1_data_situacao_cadastral?: string;
    concorrente1_natureza_juridica?: string;
    concorrente1_porte?: string;
    concorrente1_capital_social?: number;
    concorrente1_data_inicio_atividade?: string;
    // Concorrente 2 (completo)
    concorrente2_id?: string;
    concorrente2_cnpj?: string;
    concorrente2_razao?: string;
    concorrente2_nome_fantasia?: string;
    concorrente2_email?: string;
    concorrente2_telefone?: string;
    concorrente2_endereco?: string;
    concorrente2_cidade?: string;
    concorrente2_uf?: string;
    concorrente2_is_mei?: boolean;
    concorrente2_cep?: string;
    concorrente2_bairro?: string;
    concorrente2_logradouro?: string;
    concorrente2_numero?: string;
    concorrente2_complemento?: string;
    concorrente2_cnae_principal_codigo?: number;
    concorrente2_cnae_principal_descricao?: string;
    concorrente2_cnaes_secundarios?: Array<{codigo: number; descricao: string}>;
    concorrente2_situacao_cadastral?: number;
    concorrente2_situacao_cadastral_descricao?: string;
    concorrente2_data_situacao_cadastral?: string;
    concorrente2_natureza_juridica?: string;
    concorrente2_porte?: string;
    concorrente2_capital_social?: number;
    concorrente2_data_inicio_atividade?: string;
    // Justificativas
    justificativa_sem_chamado?: string;
    justificativa_sem_memorial?: string;
  };
  solicitante: Profile | null;
  cliente: Cliente | null;
  anexos: Anexo[];
  documentos_emitidos: (DocumentoEmitido & { emitido_por_nome?: string })[];
  documentos_fiscais: (DocumentoFiscal & { baixa_por_nome?: string })[];
  historico: (HistoricoSolicitacao & { usuario_nome?: string })[];
}

export function useSolicitacaoDetalhes() {
  const [detalhes, setDetalhes] = useState<SolicitacaoDetalhes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDetalhes = useCallback(async (solicitacaoId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_solicitacao_detalhes', {
        p_id: solicitacaoId,
      });

      if (rpcError) throw rpcError;

      setDetalhes(data as unknown as SolicitacaoDetalhes);
    } catch (err) {
      console.error('Error fetching solicitacao details:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch details'));
    } finally {
      setLoading(false);
    }
  }, []);

  const clearDetalhes = useCallback(() => {
    setDetalhes(null);
    setError(null);
  }, []);

  return {
    detalhes,
    loading,
    error,
    fetchDetalhes,
    clearDetalhes,
  };
}
