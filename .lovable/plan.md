

# Analise de Seguranca — 12 Findings

A auditoria automatizada encontrou **2 erros criticos** e **10 avisos**. Abaixo, cada item classificado por severidade com a correcao proposta.

---

## CRITICOS (error) — Corrigir imediatamente

### 1. Qualquer pessoa pode injetar notificacoes no inbox de qualquer usuario
**Tabela:** `notifications` — policy `Authenticated can insert notifications`
**Problema:** `WITH CHECK (true)` sem verificar `user_id = auth.uid()`. Qualquer usuario (inclusive anonimo via role `public`) pode inserir notificacoes falsas para qualquer usuario.
**Correcao:** Alterar policy para `WITH CHECK (auth.uid() = user_id)` e restringir ao role `authenticated`. Porem, os triggers do banco (notify_status_change, notify_documento_emitido etc.) inserem notificacoes com `user_id` do *dono* da solicitacao, nao do caller. Solucao: manter a policy permissiva MAS marcar os triggers como `SECURITY DEFINER` (ja sao) — entao criar uma policy separada:
  - Policy para triggers: manter `WITH CHECK (true)` mas **restringir ao role `service_role`** — nao, isso nao funciona em triggers SECURITY DEFINER.
  - **Melhor abordagem:** Remover a policy atual. Triggers SECURITY DEFINER ja bypassam RLS. Para insercoes via client (mensagem_enviada etc.), adicionar policy `WITH CHECK (auth.uid() = user_id) TO authenticated`.

### 2. Qualquer usuario autenticado pode alterar dados de qualquer fornecedor
**Tabela:** `fornecedores` — policy `Authenticated users can update fornecedores`
**Problema:** `USING (true)` permite que qualquer usuario autenticado edite CNPJ, razao social, capital social etc. de qualquer fornecedor.
**Correcao:** Restringir UPDATE a backoffice/admin: `USING (is_backoffice_or_admin(auth.uid()))`. A insercao pode continuar aberta (usuarios criam fornecedores ao preencher formulario).

---

## AVISOS (warn) — Corrigir em breve

### 3. OC Acompanhamento — policy INSERT muito ampla
**Tabela:** `oc_acompanhamento` — policy `Users can insert own oc_acompanhamento`
**Problema:** Verifica apenas `auth.uid() = user_id`, sem validar acesso a `solicitacao_id`. Qualquer usuario pode inserir registros em qualquer solicitacao.
**Correcao:** Remover esta policy. A policy `Users can insert oc_acompanhamento for their empreendimento` ja cobre o caso correto.

### 4. Transfer ownership — WITH CHECK (true)
**Tabela:** `solicitacoes` — policy `Transfer ownership of solicitacoes`
**Problema:** Usuarios do mesmo empreendimento podem alterar *qualquer campo* (valor, status, user_id) via esta policy.
**Correcao:** Restringir USING para `is_backoffice_or_admin(auth.uid())` apenas.

### 5. Fornecedores INSERT — WITH CHECK (true)
**Tabela:** `fornecedores` — `Authenticated users can insert fornecedores`
**Risco:** Baixo. Necessario para o formulario de nova solicitacao. Manter, mas monitorar.

### 6. Function search_path mutable
**Funcoes:** `calcular_horas_uteis`, `set_instrumento_juridico`, `update_updated_at_column`
**Problema:** Nao definem `SET search_path = public`, vulneravel a search_path hijacking.
**Correcao:** Adicionar `SET search_path TO 'public'` em cada funcao.

### 7. Extension in public schema
**Problema:** Extensoes instaladas no schema `public` podem ser exploradas.
**Correcao:** Migrar extensoes para schema `extensions` (requer migration).

### 8. Leaked password protection disabled
**Problema:** Protecao contra senhas vazadas esta desabilitada.
**Impacto:** Baixo — app usa apenas Google OAuth, nao tem senhas. Pode ignorar.

### 9. RLS enabled no policy
**Problema:** Alguma tabela tem RLS habilitado mas sem policies.
**Correcao:** Verificar qual tabela (provavelmente `protocolo_counters`) e adicionar policy ou confirmar que acesso e apenas via SECURITY DEFINER functions.

---

## ADICIONAL — Encontrado no codigo

### 10. MASTER_EMAIL hardcoded no client
**Arquivo:** `src/hooks/useAuth.tsx` linha 7
**Problema:** `const MASTER_EMAIL = 'guilherme_xd@live.com'` — verifica admin master no frontend. Qualquer dev pode ver este email. A verificacao `isMasterUser` bypassa aprovacao e permite impersonation. Isso nao e um vetor de ataque direto (o usuario ainda precisa autenticar com Google nesse email), mas expoe a logica de privilegio.
**Correcao:** Mover a verificacao de "master user" para o banco como um role `super_admin` na tabela `user_roles`. Remover o hardcode do frontend.

---

## Resumo de Prioridades

| # | Severidade | Acao |
|---|-----------|------|
| 1 | CRITICO | Fix notifications INSERT policy |
| 2 | CRITICO | Fix fornecedores UPDATE policy |
| 3 | WARN | Remove oc_acompanhamento broad INSERT |
| 4 | WARN | Fix transfer ownership WITH CHECK |
| 6 | WARN | Fix function search_path |
| 10 | CODE | Remove hardcoded MASTER_EMAIL |

## Implementacao

Seriam **2 migrations SQL** (policies + functions) e **1 edicao de codigo** (useAuth.tsx). Posso implementar todas as correcoes de uma vez. Deseja prosseguir?

