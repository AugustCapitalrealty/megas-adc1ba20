-- Garantir que o trigger BEFORE INSERT existe para gerar protocolo atomicamente
-- Primeiro, remover trigger existente se houver (para recriar limpo)
DROP TRIGGER IF EXISTS set_protocolo_trigger ON public.solicitacoes;

-- Criar trigger BEFORE INSERT que sempre gera protocolo se não informado
CREATE TRIGGER set_protocolo_trigger
  BEFORE INSERT ON public.solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_protocolo();

-- Comentário explicativo
COMMENT ON TRIGGER set_protocolo_trigger ON public.solicitacoes IS 
  'Gera protocolo único automaticamente antes de inserir uma nova solicitação';