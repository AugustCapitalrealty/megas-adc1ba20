INSERT INTO public.status_transitions (status_from, status_to)
VALUES ('liberado_fornecedor', 'aguardando_informacoes')
ON CONFLICT DO NOTHING;