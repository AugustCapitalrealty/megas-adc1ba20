-- Adicionar transição que permite ao solicitante pedir ajuste na OC
-- De aguardando_aceite para em_processamento (volta para o backoffice revisar)
INSERT INTO public.status_transitions (status_from, status_to)
VALUES ('aguardando_aceite', 'em_processamento')
ON CONFLICT DO NOTHING;