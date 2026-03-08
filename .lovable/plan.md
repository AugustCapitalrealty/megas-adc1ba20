

# Plano: Notificação Push para Backoffice quando OC é Liberada

## Problema
Quando o solicitante aceita a OC e muda o status para `liberado_fornecedor`, o backoffice não recebe notificação. Precisa ficar verificando manualmente.

## Solução
Criar trigger no banco que notifica **todos os usuários com role backoffice/admin** quando uma solicitação muda para `liberado_fornecedor`.

## Implementação

### 1. Migration SQL
```sql
CREATE OR REPLACE FUNCTION notify_backoffice_liberado_fornecedor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  backoffice_user RECORD;
BEGIN
  -- Só dispara quando muda PARA liberado_fornecedor
  IF NEW.status = 'liberado_fornecedor' 
     AND (OLD.status IS NULL OR OLD.status != 'liberado_fornecedor') THEN
    
    -- Notificar todos os usuários backoffice/admin
    FOR backoffice_user IN
      SELECT DISTINCT ur.user_id
      FROM user_roles ur
      WHERE ur.role IN ('backoffice', 'admin')
    LOOP
      INSERT INTO notifications (user_id, tipo, titulo, mensagem, solicitacao_id)
      VALUES (
        backoffice_user.user_id,
        'action_required',
        'OC Liberada pelo Solicitante',
        'A solicitação ' || NEW.protocolo || ' foi liberada para envio ao fornecedor.',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_solicitacao_liberada_fornecedor
  AFTER UPDATE ON solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION notify_backoffice_liberado_fornecedor();
```

### 2. Arquivos
- **Migration única** — trigger no banco (notificação automática)

### Resultado
- Backoffice recebe push instantâneo (realtime já funciona)
- Aparece no sino de notificações com badge vermelho
- Ao clicar, navega para a solicitação

## Resumo das 10 Melhorias PM
| # | Melhoria | Status |
|---|----------|--------|
| 1 | Onboarding | ✅ |
| 2 | Error Boundary | ✅ |
| 3 | Progresso formulário | ✅ |
| 4 | Email Digest | ✅ (desativado) |
| 5 | Analytics | ✅ |
| 6 | Feedback Backoffice | ✅ |
| 7 | Auto-refresh aprovação | ✅ |
| 8 | Alerta duplicata | ✅ |
| 9 | Sparklines | ✅ |
| 10 | Detecção offline | ✅ |

**Todas implementadas!** Este plano adiciona a notificação push que você solicitou.

