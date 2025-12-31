-- Adicionar transição aprovado -> aguardando_aceite para permitir registrar OC direto do status aprovado
INSERT INTO status_transitions (status_from, status_to)
VALUES ('aprovado', 'aguardando_aceite')
ON CONFLICT DO NOTHING;