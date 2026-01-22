-- Adicionar transicoes permitidas para cancelamento
INSERT INTO public.status_transitions (status_from, status_to) VALUES
  ('recebido', 'cancelado'),
  ('em_analise', 'cancelado'),
  ('pendente_correcao', 'cancelado'),
  ('aprovado', 'cancelado'),
  ('em_processamento', 'cancelado'),
  ('aguardando_informacoes', 'cancelado'),
  ('aguardando_aceite', 'cancelado'),
  ('oc_ac_emitida', 'cancelado'),
  ('aguardando_nf_boleto', 'cancelado'),
  ('liberado_fornecedor', 'cancelado'),
  ('enviado_fornecedor', 'cancelado'),
  ('nf_boleto_enviados', 'cancelado'),
  ('enviado_pagamento', 'cancelado')
ON CONFLICT DO NOTHING;