

# Plano: Dashboard com Dados Reais + Funcionalidade "Assumir Solicitacoes"

## Parte 1: Correcao Definitiva do Dashboard

### Diagnostico

O codigo atual do `useDashboardMetrics.ts` esta logicamente correto, mas apresenta problemas de robustez:

1. **Sem tratamento de erros visivel**: Se a query falhar silenciosamente, os KPIs aparecem zerados sem feedback
2. **Sem logs de debug**: Impossivel diagnosticar se a query retornou vazio ou nem executou
3. **Dependencia de closure**: O `isGeralMode` e calculado fora do `queryFn`, podendo causar stale closures em edge cases
4. **Sem refetch automatico**: Ao voltar para a aba do navegador, os dados nao atualizam

### Acoes

**Arquivo: `src/hooks/useDashboardMetrics.ts`**

- Mover a logica de decisao para DENTRO do `queryFn` (evitar stale closures)
- Adicionar `console.log` com os parametros da query para facilitar debug futuro
- Adicionar tratamento de erro com toast de feedback visual
- Adicionar `refetchOnWindowFocus: true` para atualizar ao voltar para a aba
- Reduzir `staleTime` para 15 segundos
- Retornar flag `error` no retorno do hook para exibir estado de erro no Dashboard

**Arquivo: `src/pages/Dashboard.tsx`**

- Exibir estado de erro (card com botao "Tentar novamente") quando a query falhar
- Usar `useEffect` para sincronizar `viewMode` quando `canToggle` mudar (evitar bug do useState inicial)
- Adicionar badge com contagem total no modo "Geral" para confirmar visualmente que os dados estao carregando

---

## Parte 2: Funcionalidade "Assumir Solicitacoes"

### Conceito

Permitir que um usuario (solicitante do mesmo empreendimento ou backoffice/admin) assuma a titularidade de uma solicitacao quando o solicitante original estiver ausente (ferias, licenca). Toda transferencia e registrada em log de auditoria.

### Regras de Negocio

1. **Quem pode assumir?**
   - Admin: qualquer solicitacao
   - Backoffice: qualquer solicitacao
   - Solicitante: apenas solicitacoes do mesmo empreendimento (via `user_empreendimentos`)

2. **Log de auditoria obrigatorio**: Registra quem assumiu, de quem, quando e o motivo

3. **O solicitante original nao perde acesso**: Continua podendo visualizar a solicitacao

4. **Status nao muda**: Assumir nao altera o status da solicitacao, apenas o responsavel

### Alteracoes de Banco de Dados

**Migration 1: Tabela de log de transferencias**

```sql
CREATE TABLE public.solicitacao_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  motivo text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
);

ALTER TABLE public.solicitacao_transfers ENABLE ROW LEVEL SECURITY;

-- Backoffice e admin podem ver todos os logs
CREATE POLICY "Backoffice can view transfers"
  ON public.solicitacao_transfers FOR SELECT
  TO authenticated
  USING (is_backoffice_or_admin(auth.uid()));

-- Usuarios podem ver transfers de solicitacoes que acessam
CREATE POLICY "Users can view own transfers"
  ON public.solicitacao_transfers FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Inserir: quem tem acesso a solicitacao pode transferir
CREATE POLICY "Authorized users can transfer"
  ON public.solicitacao_transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_backoffice_or_admin(auth.uid())
    OR user_can_access_solicitacao(solicitacao_id)
  );
```

**Migration 2: Politica de UPDATE no user_id da solicitacao**

```sql
-- Permitir que admin/backoffice ou usuarios do empreendimento
-- atualizem o user_id (transferencia de titularidade)
CREATE POLICY "Transfer ownership"
  ON public.solicitacoes FOR UPDATE
  TO authenticated
  USING (
    is_backoffice_or_admin(auth.uid())
    OR user_can_access_solicitacao(id)
  )
  WITH CHECK (true);
```

Nota: A politica existente "Users can update own pending solicitacoes" ja cobre updates do proprio usuario. Esta nova politica cobre especificamente o cenario de transferencia.

### Alteracoes de Frontend

**Novo componente: `src/components/TransferOwnershipModal.tsx`**

- Modal com:
  - Selecao de usuario destino (lista de usuarios do mesmo empreendimento)
  - Campo obrigatorio de motivo (ex: "Ferias do solicitante original")
  - Botao de confirmacao
- Ao confirmar:
  1. Insere registro em `solicitacao_transfers`
  2. Atualiza `user_id` na solicitacao para o novo titular
  3. Registra evento na timeline (`solicitacao_historico`)
  4. Toast de confirmacao

**Arquivo: `src/pages/MinhasSolicitacoes.tsx`**

- Adicionar botao "Transferir" no card de cada solicitacao (visivel para:
  - O proprio solicitante
  - Usuarios com acesso ao empreendimento
  - Backoffice/Admin)
- Botao abre o `TransferOwnershipModal`

**Arquivo: `src/pages/Backoffice.tsx`**

- Adicionar botao "Assumir" no painel de analise
- Ao clicar, o backoffice se torna o titular (ou pode escolher outro usuario)
- Registra a acao no log de transferencias

**Arquivo: `src/components/SolicitacaoTimeline.tsx`**

- Exibir eventos de transferencia na timeline com icone diferenciado
- Formato: "Solicitacao transferida de [Nome A] para [Nome B] - Motivo: [texto]"

### Fluxo Visual

```text
Solicitacao com titular ausente
    |
    +-- Colega do empreendimento --> Botao "Assumir" --> Modal com motivo --> Confirma
    |
    +-- Backoffice --> Botao "Redistribuir" --> Seleciona usuario --> Confirma
    |
    +-- Sistema registra:
         1. Log em solicitacao_transfers
         2. Evento na timeline
         3. Atualiza user_id
         4. Notificacao por email (opcional)
```

---

## Resumo de Arquivos

| Arquivo | Acao |
|---|---|
| `src/hooks/useDashboardMetrics.ts` | Corrigir robustez, logs, erro, refetch |
| `src/pages/Dashboard.tsx` | Estado de erro, sincronizar viewMode |
| `src/components/TransferOwnershipModal.tsx` | Novo - modal de transferencia |
| `src/pages/MinhasSolicitacoes.tsx` | Botao "Transferir" nos cards |
| `src/pages/Backoffice.tsx` | Botao "Assumir/Redistribuir" |
| `src/components/SolicitacaoTimeline.tsx` | Exibir eventos de transferencia |
| Migration SQL | Tabela `solicitacao_transfers` + politica de update |

