-- Tabela principal: snapshot do painel Fluig
CREATE TABLE public.fluig_painel_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_fluig TEXT NOT NULL UNIQUE,
  data_lancamento TIMESTAMP WITH TIME ZONE,
  fornecedor TEXT,
  valor NUMERIC,
  servico TEXT,
  responsavel_atual TEXT,
  empreendimento TEXT,
  situacao TEXT,
  localizacao TEXT,
  
  -- Aprovações por etapa
  gerencia_responsavel TEXT,
  gerencia_conclusao TIMESTAMP WITH TIME ZONE,
  gerencia_facilities_responsavel TEXT,
  gerencia_facilities_conclusao TIMESTAMP WITH TIME ZONE,
  gerencia_financeiro_responsavel TEXT,
  gerencia_financeiro_conclusao TIMESTAMP WITH TIME ZONE,
  diretoria_responsavel TEXT,
  diretoria_conclusao TIMESTAMP WITH TIME ZONE,
  
  -- Datas do processo
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_fim TIMESTAMP WITH TIME ZONE,
  
  -- Vínculo com solicitação interna
  solicitacao_interna_id UUID REFERENCES public.solicitacoes(id),
  
  -- Metadados de importação
  importado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  importado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de eventos/histórico de alterações
CREATE TABLE public.fluig_painel_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_fluig TEXT NOT NULL,
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  importado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  importado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_fluig_snapshot_solicitacao ON public.fluig_painel_snapshot(solicitacao_fluig);
CREATE INDEX idx_fluig_snapshot_empreendimento ON public.fluig_painel_snapshot(empreendimento);
CREATE INDEX idx_fluig_snapshot_situacao ON public.fluig_painel_snapshot(situacao);
CREATE INDEX idx_fluig_snapshot_responsavel ON public.fluig_painel_snapshot(responsavel_atual);
CREATE INDEX idx_fluig_snapshot_data_lancamento ON public.fluig_painel_snapshot(data_lancamento);
CREATE INDEX idx_fluig_eventos_solicitacao ON public.fluig_painel_eventos(solicitacao_fluig);

-- Enable RLS
ALTER TABLE public.fluig_painel_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluig_painel_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Backoffice/Admin podem ver e gerenciar
CREATE POLICY "Backoffice can view fluig_snapshot"
  ON public.fluig_painel_snapshot
  FOR SELECT
  USING (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Backoffice can insert fluig_snapshot"
  ON public.fluig_painel_snapshot
  FOR INSERT
  WITH CHECK (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Backoffice can update fluig_snapshot"
  ON public.fluig_painel_snapshot
  FOR UPDATE
  USING (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Backoffice can delete fluig_snapshot"
  ON public.fluig_painel_snapshot
  FOR DELETE
  USING (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Backoffice can view fluig_eventos"
  ON public.fluig_painel_eventos
  FOR SELECT
  USING (is_backoffice_or_admin(auth.uid()));

CREATE POLICY "Backoffice can insert fluig_eventos"
  ON public.fluig_painel_eventos
  FOR INSERT
  WITH CHECK (is_backoffice_or_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_fluig_snapshot_updated_at
  BEFORE UPDATE ON public.fluig_painel_snapshot
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();