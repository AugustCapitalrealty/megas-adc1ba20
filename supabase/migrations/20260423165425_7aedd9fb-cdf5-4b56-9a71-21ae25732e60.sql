INSERT INTO public.status_transitions (status_from, status_to) VALUES
  ('aguardando_aceite', 'cancelado'),
  ('liberado_fornecedor', 'cancelado'),
  ('enviado_fornecedor', 'cancelado'),
  ('aguardando_nf_boleto', 'cancelado'),
  ('nf_boleto_enviados', 'cancelado'),
  ('aguardando_execucao', 'cancelado'),
  ('oc_ac_emitida', 'cancelado')
ON CONFLICT DO NOTHING;