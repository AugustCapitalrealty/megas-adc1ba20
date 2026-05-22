## Objetivo

Tornar dinâmico o "dia de corte para justificativa" no Monitoramento de OC. Hoje está fixo em 23 — a partir desse dia do mês, OCs sem NF e sem previsão futura entram em **Pendente Justificativa**. O backoffice precisa poder escolher esse dia (mês corrente) na própria aba de Monitoramento.

## Mudanças

### 1. Banco — nova tabela `monitoramento_oc_config` (migration)

Tabela simples key/value para guardar o dia de corte vigente:

- `id` (uuid pk)
- `dia_corte_justificativa` (int, 1–28, default 23)
- `updated_at`, `updated_by`

RLS:
- SELECT: qualquer usuário autenticado (todos precisam aplicar a mesma regra).
- INSERT/UPDATE: apenas backoffice/admin (`is_backoffice_or_admin(auth.uid())`).

Seed: 1 linha com `dia_corte_justificativa = 23`.

### 2. Hook `useMonitoramentoOC.ts`

- Buscar o valor atual de `dia_corte_justificativa` junto com o restante do fetch.
- `computeOcStatus` passa a receber `diaCorte` em vez de constante 23:
  - `if (dia >= diaCorte && !oc.tem_nf && !previsaoValida) return 'pendente_justificativa';`
- `computeAggregates` e os `useMemo` internos repassam o `diaCorte`.
- Hook expõe `diaCorte` e `updateDiaCorte(novoDia)` (faz `upsert` na tabela; só backoffice consegue por RLS).

### 3. UI — `MonitoramentoOC.tsx`

Adicionar, **visível apenas para backoffice/admin**, um controle no header da página (ao lado dos filtros) tipo:

> "Dia de corte para justificativa: [ Select 1–28 ] do mês"

- `Select` com dias 1–28 (evita 29/30/31 que não existem em todo mês).
- Ao alterar: chama `updateDiaCorte`, mostra `toast.success`, refaz fetch.
- Atualizar o `hint` do KPI e o comentário "após dia 23" para usar o valor dinâmico.
- `dias <= 23` na linha 154 também passa a usar `diaCorte`.

Para usuários comuns (Megas): só leitura — pode mostrar um chip discreto "Justificativa obrigatória a partir do dia X" no topo, para deixar claro a regra do mês.

### 4. Fora de escopo

- Não muda regra de "OC do mês anterior sempre pendente" — continua válida.
- Não cria histórico de mudanças do dia de corte (decisão simples; pode ser adicionado depois se necessário).
- Não altera notificações/digests.

## Arquivos afetados

- `supabase/migrations/<novo>.sql` (tabela + RLS + seed)
- `src/hooks/useMonitoramentoOC.ts`
- `src/pages/MonitoramentoOC.tsx`
