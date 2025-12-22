-- Adicionar campos para justificativas de "sem chamado" e "sem memorial"
ALTER TABLE public.solicitacoes 
  ADD COLUMN IF NOT EXISTS justificativa_sem_chamado text,
  ADD COLUMN IF NOT EXISTS justificativa_sem_memorial text;