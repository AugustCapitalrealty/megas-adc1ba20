-- Adicionar transições faltantes para permitir "Solicitar Ajuste" de outros status
INSERT INTO public.status_transitions (status_from, status_to) VALUES
  ('recebido', 'aguardando_informacoes'),
  ('em_processamento', 'aguardando_informacoes')
ON CONFLICT DO NOTHING;