-- Backfill: set data_pendente_correcao for existing aguardando_informacoes/pendente_correcao that are missing it
UPDATE solicitacoes
SET data_pendente_correcao = (
  SELECT MAX(h.created_at)
  FROM historico_solicitacoes h
  WHERE h.solicitacao_id = solicitacoes.id
    AND h.status_novo = solicitacoes.status::text::request_status
)
WHERE status IN ('aguardando_informacoes', 'pendente_correcao')
  AND data_pendente_correcao IS NULL;