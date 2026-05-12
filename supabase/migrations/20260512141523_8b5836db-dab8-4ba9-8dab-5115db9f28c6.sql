INSERT INTO public.status_transitions (status_from, status_to)
VALUES ('aguardando_aceite', 'recebido')
ON CONFLICT DO NOTHING;