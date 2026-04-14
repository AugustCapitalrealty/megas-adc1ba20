DELETE FROM public.projuris_requisicoes
WHERE numero_requisicao ~ '\.'
   OR numero_requisicao IN ('0', '00')
   OR length(numero_requisicao) > 10;