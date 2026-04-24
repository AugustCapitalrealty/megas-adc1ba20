-- 1) Remover duplicatas mantendo o mais antigo
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY solicitacao_id, numero_documento, tipo_documento
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.documentos_emitidos
)
DELETE FROM public.documentos_emitidos
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Constraint única para impedir novas duplicações
ALTER TABLE public.documentos_emitidos
  ADD CONSTRAINT documentos_emitidos_unique_per_sol
  UNIQUE (solicitacao_id, numero_documento, tipo_documento);