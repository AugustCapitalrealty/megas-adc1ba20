-- Add missing transition: aprovado -> aguardando_informacoes
INSERT INTO public.status_transitions (status_from, status_to) VALUES
  ('aprovado', 'aguardando_informacoes')
ON CONFLICT DO NOTHING;