-- Populate status_transitions table with all valid transitions
INSERT INTO public.status_transitions (status_from, status_to) VALUES
  -- From recebido
  ('recebido', 'em_analise'),
  
  -- From em_analise
  ('em_analise', 'pendente_correcao'),
  ('em_analise', 'aprovado'),
  ('em_analise', 'rejeitado'),
  ('em_analise', 'aguardando_informacoes'),
  
  -- From pendente_correcao
  ('pendente_correcao', 'recebido'),
  ('pendente_correcao', 'em_analise'),
  
  -- From aprovado
  ('aprovado', 'em_processamento'),
  
  -- From em_processamento
  ('em_processamento', 'oc_ac_emitida'),
  ('em_processamento', 'concluida'),
  
  -- From oc_ac_emitida
  ('oc_ac_emitida', 'aguardando_aceite'),
  ('oc_ac_emitida', 'concluida'),
  
  -- From aguardando_aceite
  ('aguardando_aceite', 'aguardando_nf_boleto'),
  ('aguardando_aceite', 'pendente_correcao'),
  
  -- From aguardando_informacoes
  ('aguardando_informacoes', 'em_analise'),
  ('aguardando_informacoes', 'recebido'),
  
  -- From aguardando_nf_boleto
  ('aguardando_nf_boleto', 'nf_boleto_enviados'),
  
  -- From nf_boleto_enviados
  ('nf_boleto_enviados', 'enviado_pagamento'),
  ('nf_boleto_enviados', 'concluida'),
  
  -- From enviado_pagamento
  ('enviado_pagamento', 'concluida')
ON CONFLICT DO NOTHING;