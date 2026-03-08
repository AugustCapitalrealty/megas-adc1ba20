

# Fix: Solicitantes não veem informações do Jurídico registradas pelo Backoffice

## Problema
O `JuridicoTracker` busca nomes de perfil (`profiles`) dos usuários que registraram etapas jurídicas. A política RLS da tabela `profiles` só permite que cada usuário veja **seu próprio perfil** — então quando um solicitante visualiza o tracker, os nomes do backoffice aparecem vazios ou falham silenciosamente.

## Solução
Adicionar uma política RLS na tabela `profiles` permitindo que usuários autenticados leiam perfis básicos de qualquer usuário. Isso é seguro porque os campos da tabela (`full_name`, `avatar_url`, `email`) já são expostos em RPCs existentes como `get_solicitacoes_backoffice` e `get_solicitacao_detalhes`.

### Migration SQL
```sql
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
```

Remover a política redundante `Users can view own profile` (já coberta pela nova) e manter `Admins can view all profiles` (também redundante mas inofensiva).

### Arquivo
Nenhuma alteração de código — apenas 1 migration adicionando a política RLS.

