-- Add column to profiles for email notification preference
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS receber_notificacoes_email boolean DEFAULT false;