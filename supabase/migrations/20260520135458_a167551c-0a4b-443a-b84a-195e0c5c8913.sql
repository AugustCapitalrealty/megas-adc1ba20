
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS tipo_fornecedor text NOT NULL DEFAULT 'nacional',
  ADD COLUMN IF NOT EXISTS pais text,
  ADD COLUMN IF NOT EXISTS identificador_fiscal text,
  ADD COLUMN IF NOT EXISTS tipo_identificador_fiscal text,
  ADD COLUMN IF NOT EXISTS moeda_padrao text;

ALTER TABLE public.fornecedores ALTER COLUMN cnpj DROP NOT NULL;

-- Drop existing unique constraint on cnpj if any, then add partial unique index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fornecedores_cnpj_key'
  ) THEN
    ALTER TABLE public.fornecedores DROP CONSTRAINT fornecedores_cnpj_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS fornecedores_cnpj_unique
  ON public.fornecedores (cnpj) WHERE cnpj IS NOT NULL;

ALTER TABLE public.fornecedores
  DROP CONSTRAINT IF EXISTS fornecedores_tipo_check;

ALTER TABLE public.fornecedores
  ADD CONSTRAINT fornecedores_tipo_check CHECK (
    (tipo_fornecedor = 'nacional' AND cnpj IS NOT NULL)
    OR (tipo_fornecedor = 'internacional' AND pais IS NOT NULL AND identificador_fiscal IS NOT NULL)
  );
