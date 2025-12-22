-- Remover espaços em branco do campo numero_chamado_fluig em todas as solicitações
UPDATE solicitacoes 
SET numero_chamado_fluig = TRIM(numero_chamado_fluig)
WHERE numero_chamado_fluig IS NOT NULL 
  AND numero_chamado_fluig != TRIM(numero_chamado_fluig);

-- Vincular fluig_painel_snapshot com solicitacoes baseado no numero_chamado_fluig
UPDATE fluig_painel_snapshot fps
SET solicitacao_interna_id = s.id
FROM solicitacoes s
WHERE TRIM(s.numero_chamado_fluig) = fps.solicitacao_fluig
  AND fps.solicitacao_interna_id IS NULL;