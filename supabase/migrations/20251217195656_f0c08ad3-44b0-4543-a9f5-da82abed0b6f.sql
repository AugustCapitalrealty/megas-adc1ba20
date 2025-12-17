-- Add new statuses to the request_status enum
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'aguardando_aceite';
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'aguardando_informacoes';

-- Add column for Fluig ticket number
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS numero_chamado_fluig TEXT;

-- Add column to track if 3 suppliers exception was used (explicit toggle)
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS excecao_fornecedores BOOLEAN DEFAULT FALSE;

-- Add column for requester response to information request
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS resposta_informacoes TEXT;