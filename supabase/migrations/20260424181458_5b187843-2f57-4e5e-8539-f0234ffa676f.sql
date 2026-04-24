ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS numero_fluig_pagamento text;

COMMENT ON COLUMN public.solicitacoes.numero_fluig_pagamento IS
  'Número do Fluig lançado para pagamento, preenchido na conclusão da solicitação pelo backoffice.';