-- Add new status values to request_status enum
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'em_processamento';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'oc_ac_emitida';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'concluida';

-- Create table for emitted OC/AC documents
CREATE TABLE public.documentos_emitidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('OC', 'AC')),
  numero_documento TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  observacao TEXT,
  emitido_por UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documentos_emitidos ENABLE ROW LEVEL SECURITY;

-- Policies for documentos_emitidos
CREATE POLICY "Backoffice can insert documentos"
ON public.documentos_emitidos
FOR INSERT
WITH CHECK (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Backoffice can view all documentos"
ON public.documentos_emitidos
FOR SELECT
USING (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Users can view own documentos"
ON public.documentos_emitidos
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM solicitacoes s
  WHERE s.id = documentos_emitidos.solicitacao_id
  AND s.user_id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_documentos_emitidos_solicitacao ON public.documentos_emitidos(solicitacao_id);

-- Create storage bucket for emitted documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos-emitidos', 'documentos-emitidos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documentos-emitidos bucket
CREATE POLICY "Backoffice can upload documentos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documentos-emitidos' AND is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Backoffice can view all documentos storage"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documentos-emitidos' AND is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Users can download own documentos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documentos-emitidos' AND EXISTS (
  SELECT 1 FROM documentos_emitidos d
  JOIN solicitacoes s ON s.id = d.solicitacao_id
  WHERE d.storage_path = name
  AND s.user_id = auth.uid()
));