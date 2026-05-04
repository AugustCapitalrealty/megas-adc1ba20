INSERT INTO public.status_transitions (status_from, status_to)
VALUES 
  ('liberado_fornecedor', 'aguardando_aceite'),
  ('aguardando_execucao', 'aguardando_aceite')
ON CONFLICT DO NOTHING;