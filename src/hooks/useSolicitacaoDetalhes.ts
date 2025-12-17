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
    concorrente1_cnpj?: string;
    concorrente1_razao?: string;
    concorrente2_cnpj?: string;
    concorrente2_razao?: string;
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
