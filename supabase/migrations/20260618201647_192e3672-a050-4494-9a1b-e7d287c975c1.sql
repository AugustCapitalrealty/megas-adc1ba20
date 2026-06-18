
-- 1. Grandezas Contratadas (contrato Copel vigente, com histórico por vigência)
CREATE TABLE public.energia_grandezas_contratadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  demanda_contratada_kw numeric NOT NULL DEFAULT 0,
  tarifa_demanda_usd numeric NOT NULL DEFAULT 0,
  tarifa_demanda_isenta numeric NOT NULL DEFAULT 0,
  tarifa_ultrapassagem numeric NOT NULL DEFAULT 0,
  te_ponta numeric NOT NULL DEFAULT 0,
  tusd_ponta numeric NOT NULL DEFAULT 0,
  te_fora numeric NOT NULL DEFAULT 0,
  tusd_fora numeric NOT NULL DEFAULT 0,
  iluminacao_publica_padrao numeric NOT NULL DEFAULT 0,
  bandeira_valor_padrao numeric NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT energia_grandezas_vigencia_ok CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.energia_grandezas_contratadas TO authenticated;
GRANT ALL ON public.energia_grandezas_contratadas TO service_role;

ALTER TABLE public.energia_grandezas_contratadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backoffice/admin manage grandezas"
ON public.energia_grandezas_contratadas
FOR ALL TO authenticated
USING (is_backoffice_or_admin(auth.uid()))
WITH CHECK (is_backoffice_or_admin(auth.uid()));

CREATE TRIGGER trg_grandezas_touch
BEFORE UPDATE ON public.energia_grandezas_contratadas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Garante apenas uma vigência aberta (vigencia_fim IS NULL)
CREATE UNIQUE INDEX energia_grandezas_unica_vigente
ON public.energia_grandezas_contratadas ((1))
WHERE vigencia_fim IS NULL;

-- 2. Adicionar colunas em energia_competencia_tarifas: fatura Copel + saldos fotovoltaicos
ALTER TABLE public.energia_competencia_tarifas
  ADD COLUMN copel_demanda_kw numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_consumo_ponta_kwh numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_consumo_fora_kwh numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_valor_te_ponta numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_valor_tusd_ponta numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_valor_te_fora numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_valor_tusd_fora numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_valor_demanda numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_valor_ultrapassagem numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_valor_icms numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_valor_pis_cofins numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_valor_bandeira numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_valor_iluminacao_publica numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_cred_deb numeric NOT NULL DEFAULT 0,
  ADD COLUMN copel_valor_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN fotovoltaico_saldo_inicial_ponta_kwh numeric NOT NULL DEFAULT 0,
  ADD COLUMN fotovoltaico_saldo_inicial_fora_kwh numeric NOT NULL DEFAULT 0,
  ADD COLUMN fotovoltaico_geracao_ponta_kwh numeric NOT NULL DEFAULT 0,
  ADD COLUMN fotovoltaico_geracao_fora_kwh numeric NOT NULL DEFAULT 0,
  ADD COLUMN fotovoltaico_saldo_final_ponta_kwh numeric NOT NULL DEFAULT 0,
  ADD COLUMN fotovoltaico_saldo_final_fora_kwh numeric NOT NULL DEFAULT 0;

-- 3. Tabela auxiliar para saldo fotovoltaico pendente (quando próxima competência ainda não existe)
CREATE TABLE public.energia_fotovoltaico_saldo_pendente (
  ano_mes text PRIMARY KEY,
  saldo_ponta_kwh numeric NOT NULL DEFAULT 0,
  saldo_fora_kwh numeric NOT NULL DEFAULT 0,
  origem_competencia_id uuid REFERENCES public.energia_competencias(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.energia_fotovoltaico_saldo_pendente TO authenticated;
GRANT ALL ON public.energia_fotovoltaico_saldo_pendente TO service_role;

ALTER TABLE public.energia_fotovoltaico_saldo_pendente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backoffice/admin manage saldo pendente"
ON public.energia_fotovoltaico_saldo_pendente
FOR ALL TO authenticated
USING (is_backoffice_or_admin(auth.uid()))
WITH CHECK (is_backoffice_or_admin(auth.uid()));

CREATE TRIGGER trg_saldo_pendente_touch
BEFORE UPDATE ON public.energia_fotovoltaico_saldo_pendente
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Função: incrementa ano_mes em 1 mês ("2026-05" -> "2026-06")
CREATE OR REPLACE FUNCTION public.energia_proximo_ano_mes(p_ano_mes text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT to_char((p_ano_mes || '-01')::date + interval '1 month', 'YYYY-MM');
$$;

-- 5. Trigger: ao fechar competência, propaga saldo_final para a próxima (ou para pendente)
CREATE OR REPLACE FUNCTION public.energia_propagar_saldo_fotovoltaico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tar record;
  v_prox_ano_mes text;
  v_prox_id uuid;
BEGIN
  IF NEW.status <> 'fechada' OR OLD.status = 'fechada' THEN
    RETURN NEW;
  END IF;

  SELECT fotovoltaico_saldo_final_ponta_kwh, fotovoltaico_saldo_final_fora_kwh
    INTO v_tar
  FROM public.energia_competencia_tarifas WHERE competencia_id = NEW.id;

  IF v_tar IS NULL THEN RETURN NEW; END IF;

  v_prox_ano_mes := public.energia_proximo_ano_mes(NEW.ano_mes);

  SELECT id INTO v_prox_id FROM public.energia_competencias WHERE ano_mes = v_prox_ano_mes;

  IF v_prox_id IS NOT NULL THEN
    UPDATE public.energia_competencia_tarifas
       SET fotovoltaico_saldo_inicial_ponta_kwh = v_tar.fotovoltaico_saldo_final_ponta_kwh,
           fotovoltaico_saldo_inicial_fora_kwh = v_tar.fotovoltaico_saldo_final_fora_kwh
     WHERE competencia_id = v_prox_id;
  ELSE
    INSERT INTO public.energia_fotovoltaico_saldo_pendente
      (ano_mes, saldo_ponta_kwh, saldo_fora_kwh, origem_competencia_id)
    VALUES
      (v_prox_ano_mes, v_tar.fotovoltaico_saldo_final_ponta_kwh, v_tar.fotovoltaico_saldo_final_fora_kwh, NEW.id)
    ON CONFLICT (ano_mes) DO UPDATE
      SET saldo_ponta_kwh = EXCLUDED.saldo_ponta_kwh,
          saldo_fora_kwh = EXCLUDED.saldo_fora_kwh,
          origem_competencia_id = EXCLUDED.origem_competencia_id,
          updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_propagar_saldo_fotovoltaico
AFTER UPDATE OF status ON public.energia_competencias
FOR EACH ROW EXECUTE FUNCTION public.energia_propagar_saldo_fotovoltaico();

-- 6. Trigger: ao criar tarifas de uma competência, consome saldo pendente se existir
CREATE OR REPLACE FUNCTION public.energia_consumir_saldo_pendente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ano_mes text;
  v_pend record;
BEGIN
  SELECT ano_mes INTO v_ano_mes FROM public.energia_competencias WHERE id = NEW.competencia_id;
  IF v_ano_mes IS NULL THEN RETURN NEW; END IF;

  SELECT saldo_ponta_kwh, saldo_fora_kwh INTO v_pend
    FROM public.energia_fotovoltaico_saldo_pendente WHERE ano_mes = v_ano_mes;

  IF v_pend IS NOT NULL THEN
    NEW.fotovoltaico_saldo_inicial_ponta_kwh := v_pend.saldo_ponta_kwh;
    NEW.fotovoltaico_saldo_inicial_fora_kwh := v_pend.saldo_fora_kwh;
    DELETE FROM public.energia_fotovoltaico_saldo_pendente WHERE ano_mes = v_ano_mes;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_consumir_saldo_pendente
BEFORE INSERT ON public.energia_competencia_tarifas
FOR EACH ROW EXECUTE FUNCTION public.energia_consumir_saldo_pendente();

-- 7. Função utilitária: grandeza vigente em uma data
CREATE OR REPLACE FUNCTION public.energia_grandeza_vigente(p_data date)
RETURNS public.energia_grandezas_contratadas
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.energia_grandezas_contratadas
   WHERE vigencia_inicio <= p_data
     AND (vigencia_fim IS NULL OR vigencia_fim >= p_data)
   ORDER BY vigencia_inicio DESC
   LIMIT 1;
$$;
