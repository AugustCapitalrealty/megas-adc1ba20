-- Primeiro, limpar referências no fluig_painel_snapshot
UPDATE fluig_painel_snapshot 
SET solicitacao_interna_id = NULL 
WHERE solicitacao_interna_id IN (
  SELECT id FROM solicitacoes WHERE protocolo != '2025837655'
);

-- Deletar todas as solicitações de teste (exceto 2025837655)
-- Os registros relacionados serão deletados automaticamente por CASCADE
DELETE FROM solicitacoes WHERE protocolo != '2025837655';