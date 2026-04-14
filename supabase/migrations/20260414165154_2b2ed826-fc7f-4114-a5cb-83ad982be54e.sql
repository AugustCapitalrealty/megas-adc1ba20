
DELETE FROM public.projuris_requisicoes
WHERE numero_requisicao ~ '^\d+\.\d+$'
  AND LENGTH(numero_requisicao) >= 5;
