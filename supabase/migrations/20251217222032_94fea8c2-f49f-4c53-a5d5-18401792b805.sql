-- Add new status values for NF/Boleto phase
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'aguardando_nf_boleto';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'nf_boleto_enviados';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'enviado_pagamento';

-- Create table for NF and Boleto documents
CREATE TABLE public.documentos_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('nota_fiscal', 'boleto')),
  storage_path TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes INTEGER,
  data_emissao_nf DATE,
  data_vencimento_boleto DATE,
  pagamento_antecipado BOOLEAN DEFAULT false,
  justificativa_antecipado TEXT,
  user_id UUID NOT NULL,
  baixa_financeiro_em TIMESTAMP WITH TIME ZONE,
  baixa_financeiro_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documentos_fiscais ENABLE ROW LEVEL SECURITY;

-- Users can view their own documents
CREATE POLICY "Users can view own documentos_fiscais"
ON public.documentos_fiscais
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM solicitacoes s
    WHERE s.id = documentos_fiscais.solicitacao_id
    AND s.user_id = auth.uid()
  )
);

-- Users can insert documents for their own solicitacoes
CREATE POLICY "Users can insert own documentos_fiscais"
ON public.documentos_fiscais
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM solicitacoes s
    WHERE s.id = documentos_fiscais.solicitacao_id
    AND s.user_id = auth.uid()
  )
);

-- Backoffice can view all documents
CREATE POLICY "Backoffice can view all documentos_fiscais"
ON public.documentos_fiscais
FOR SELECT
USING (is_backoffice_or_admin(auth.uid()));

-- Backoffice can update documents (for baixa)
CREATE POLICY "Backoffice can update documentos_fiscais"
ON public.documentos_fiscais
FOR UPDATE
USING (is_backoffice_or_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_documentos_fiscais_solicitacao ON public.documentos_fiscais(solicitacao_id);

-- Create storage bucket for fiscal documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos-fiscais', 'documentos-fiscais', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documentos-fiscais bucket
CREATE POLICY "Users can upload own fiscal documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documentos-fiscais' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own fiscal documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documentos-fiscais' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Backoffice can view all fiscal documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documentos-fiscais' AND
  is_backoffice_or_admin(auth.uid())
);

CREATE POLICY "Backoffice can download fiscal documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documentos-fiscais' AND
  is_backoffice_or_admin(auth.uid())
);