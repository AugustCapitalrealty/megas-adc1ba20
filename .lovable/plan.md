

## Correção de Vulnerabilidades de Segurança

### 1. Impedir auto-aprovação de perfil
**Problema**: A política RLS `Users can update own profile` permite que um usuário altere `approved = true` no próprio perfil.
**Solução**: Criar trigger `prevent_self_approval` que bloqueia alteração do campo `approved` a menos que o executor seja admin (via `has_role`).

```sql
-- Migration: trigger que impede auto-aprovação
CREATE OR REPLACE FUNCTION public.prevent_self_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.approved IS DISTINCT FROM OLD.approved THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      NEW.approved := OLD.approved; -- silently revert
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_self_approval
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_self_approval();
```

### 2. Filtrar mensagens internas via RLS (não só client-side)
**Problema**: As policies SELECT de `solicitacao_mensagens` para solicitantes retornam mensagens com `interno = true`. Filtragem atual é só no frontend.
**Solução**: Alterar as 2 policies SELECT de usuários para excluir `interno = true`:

- `Users can view messages on own solicitacoes` → adicionar `AND (interno = false)`
- `Users can view messages from their empreendimento` → adicionar `AND (interno = false)` (apenas para não-backoffice, via `OR is_backoffice_or_admin`)

### 3. Restringir inserção de fornecedores
**Problema**: Qualquer usuário autenticado pode inserir fornecedores (`WITH CHECK true`).
**Consideração**: Solicitantes precisam cadastrar fornecedores ao criar solicitações (via SupplierSearch). Restringir a backoffice quebraria o fluxo de nova solicitação.
**Solução**: Manter insert para autenticados MAS adicionar validação — exigir que o insert tenha `cnpj` não-nulo e que o usuário esteja aprovado:

```sql
DROP POLICY "Authenticated users can insert fornecedores" ON fornecedores;
CREATE POLICY "Approved users can insert fornecedores" ON fornecedores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true)
    OR is_backoffice_or_admin(auth.uid())
  );
```

### 4. Habilitar leaked password protection
**Ação**: Usar `configure_auth` para habilitar `password_protection.leaked_password_check`. (Nota: o app usa Google OAuth exclusivamente, então o impacto é preventivo caso senhas sejam adicionadas no futuro.)

### Arquivos afetados

| Mudança | Tipo |
|---------|------|
| Migration: trigger `prevent_self_approval` | DB |
| Migration: atualizar RLS `solicitacao_mensagens` SELECT | DB |
| Migration: atualizar RLS `fornecedores` INSERT | DB |
| Auth config: leaked password protection | Config |

