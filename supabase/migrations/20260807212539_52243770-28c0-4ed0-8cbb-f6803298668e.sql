ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS representante_legal_nome text,
  ADD COLUMN IF NOT EXISTS representante_legal_cpf text,
  ADD COLUMN IF NOT EXISTS representante_legal_email text,
  ADD COLUMN IF NOT EXISTS representante_legal_telefone text,
  ADD COLUMN IF NOT EXISTS testemunha_nome text,
  ADD COLUMN IF NOT EXISTS testemunha_cpf text,
  ADD COLUMN IF NOT EXISTS testemunha_email text,
  ADD COLUMN IF NOT EXISTS testemunha_telefone text;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS modulo_vago boolean NOT NULL DEFAULT false;

UPDATE public.clientes SET modulo_vago = true WHERE nome ILIKE '%m_dulo%vago%' OR nome ILIKE '%modulos vagos%';

INSERT INTO public.clientes (nome, modulo_vago)
SELECT v.nome, true FROM (VALUES ('Módulos Vagos A'), ('Módulos Vagos B')) AS v(nome)
WHERE NOT EXISTS (SELECT 1 FROM public.clientes c WHERE c.nome = v.nome);

INSERT INTO public.clientes_empreendimentos (cliente_id, empreendimento)
SELECT c.id, 'mega_esteio'::empreendimento
FROM public.clientes c
WHERE c.nome IN ('Módulos Vagos A', 'Módulos Vagos B')
  AND NOT EXISTS (
    SELECT 1 FROM public.clientes_empreendimentos ce
    WHERE ce.cliente_id = c.id AND ce.empreendimento = 'mega_esteio'::empreendimento
  );