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

export interface SolicitacaoDetalhes {
  solicitacao: Solicitacao & {
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
    concorrente1_cnpj?: string;
    concorrente1_razao?: string;
    concorrente2_cnpj?: string;
    concorrente2_razao?: string;
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
