-- Limpar espaços em branco do numero_chamado_fluig em solicitacoes
UPDATE solicitacoes 
SET numero_chamado_fluig = TRIM(numero_chamado_fluig) 
WHERE numero_chamado_fluig IS NOT NULL 
  AND numero_chamado_fluig != TRIM(numero_chamado_fluig);