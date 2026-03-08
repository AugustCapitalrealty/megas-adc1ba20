import type { Solicitacao, Fornecedor, DocumentoEmitido, DocumentoFiscal } from '@/types';

export interface SolicitacaoComFornecedor extends Solicitacao {
  fornecedor?: Fornecedor | null;
  documentoEmitido?: DocumentoEmitido | null;
  documentosEmitidos?: DocumentoEmitido[];
  documentosFiscais?: DocumentoFiscal[];
  solicitante_nome?: string | null;
}

export interface RejectionInfo {
  solicitacao_id: string;
  motivo: string | null;
  created_at: string;
  anexos_com_problema?: string[] | null;
}

export interface InfoRequest {
  solicitacao_id: string;
  motivo: string | null;
  created_at: string;
  anexos_com_problema?: string[] | null;
}
