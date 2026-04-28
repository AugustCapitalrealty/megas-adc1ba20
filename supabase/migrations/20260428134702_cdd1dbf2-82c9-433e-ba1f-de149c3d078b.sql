-- 1) Adicionar colunas para rastrear tratamento do Fluig após cancelamento
ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS fluig_cancelamento_tratado_em timestamptz,
  ADD COLUMN IF NOT EXISTS fluig_cancelamento_tratado_por uuid;

-- Índice parcial para acelerar consulta da fila "Verificar Fluig"
CREATE INDEX IF NOT EXISTS idx_solicitacoes_fluig_cancel_pendente
  ON public.solicitacoes (updated_at DESC)
  WHERE status = 'cancelado'
    AND numero_chamado_fluig IS NOT NULL
    AND fluig_cancelamento_tratado_em IS NULL;

-- 2) Backfill: marcar ciência para canceladas legadas (>30 dias) que não têm origem clara
-- (não foram canceladas pelo solicitante nem por prazo expirado nem por aprovação manual recente).
-- Isso limpa a aba "Aguardando Ciência" sem afetar casos novos legítimos.
UPDATE public.solicitacoes s
SET cancelamento_ciencia_em = COALESCE(s.updated_at, now())
WHERE s.status = 'cancelado'
  AND s.cancelamento_ciencia_em IS NULL
  AND s.updated_at < now() - interval '30 days';

-- 3) Backfill: marcar como "Fluig já tratado" todas as canceladas legadas com Fluig
-- e mais de 30 dias — assume-se que foram resolvidas no Fluig naquele período.
UPDATE public.solicitacoes
SET fluig_cancelamento_tratado_em = COALESCE(updated_at, now())
WHERE status = 'cancelado'
  AND numero_chamado_fluig IS NOT NULL
  AND fluig_cancelamento_tratado_em IS NULL
  AND updated_at < now() - interval '30 days';