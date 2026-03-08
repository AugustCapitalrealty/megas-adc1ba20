

# Plano de Otimizacao de Uso de Cloud (Banco de Dados + Edge Functions)

## Diagnostico

Analisei todos os hooks, queries e edge functions do projeto. Identifiquei **7 areas de desperdicio** que aumentam consumo de banco e funcoes serverless desnecessariamente.

---

## 1. MinhasSolicitacoes — Select de 40+ colunas sem paginacao

**Arquivo:** `src/pages/MinhasSolicitacoes.tsx` (linha 173-205)

**Problema:** Faz `SELECT` de praticamente todas as colunas da tabela `solicitacoes` (40+ campos) sem `LIMIT`. Se o usuario tiver 500 solicitacoes, transfere tudo de uma vez. Alem disso, faz 3 queries adicionais em cascata (profiles, documentos_emitidos, documentos_fiscais, historico).

**Correcao:**
- Adicionar paginacao (50 por pagina) com infinite scroll ou "carregar mais"
- Selecionar apenas colunas necessarias para a listagem (id, protocolo, descricao curta, status, valor, tipo, empreendimento, created_at, fornecedor nome). Buscar detalhes completos apenas ao expandir
- Migrar para usar a RPC `get_solicitacoes_backoffice` (ja existe) ou criar uma RPC similar para o solicitante

---

## 2. Dashboard — staleTime de 15s causa re-fetches excessivos

**Arquivo:** `src/hooks/useDashboardMetrics.ts` (linha 95-96)

**Problema:** `staleTime: 15_000` com `refetchOnWindowFocus: true`. Toda vez que o usuario alterna abas do navegador, refaz a query inteira (1000 rows). O default global e 5min, mas o dashboard sobrescreve para 15s.

**Correcao:** Aumentar staleTime para `120_000` (2 min) e remover `refetchOnWindowFocus: true` (ja desabilitado globalmente). Dados de dashboard nao mudam a cada 15 segundos.

---

## 3. Dashboard Eficiencia — 7 queries paralelas, muitas redundantes

**Arquivo:** `src/hooks/useEficienciaDashboard.ts`

**Problema:** Dispara **7 useQuery separadas** (feriados, docs emitidos + solicitacoes, backlog, retrabalho, etapas, top solicitantes, top fornecedores). Cada uma com `staleTime: 30_000`. Ao trocar filtro, TODAS re-executam.

**Correcao:**
- Consolidar as queries principais em 1 RPC unica (`get_eficiencia_dashboard`) que retorna tudo num JSON — reduz 7 round-trips para 1-2
- Aumentar staleTime para `120_000`
- Feriados ja tem `staleTime: 600_000` (OK)

---

## 4. Fluig Filter Options — busca ALL rows para extrair distincts

**Arquivo:** `src/hooks/useFluigDashboard.ts` (linha 87-121)

**Problema:** `useFluigFilterOptions` faz `SELECT empreendimento, situacao, localizacao, responsavel_atual` de **todas** as rows da tabela `fluig_painel_snapshot` so para montar os filtros com `Set`. Se tiver 2000 rows, transfere 2000 registros.

**Correcao:** Criar uma RPC `get_fluig_filter_options` que usa `SELECT DISTINCT` no banco, retornando apenas os valores unicos. Reduz de 2000 rows para ~20.

---

## 5. Edge Functions AI — chamadas sem cache client-side

**Arquivos:** `useCNAEValidation.ts`, `useDescriptionValidation.ts`, `validate-oc-value` (Backoffice)

**Problema:** As funcoes `validate-cnae` e `validate-description` usam IA (Lovable AI Gateway) e sao chamadas durante digitacao (com debounce). Porem, se o usuario sai e volta a pagina, **refaz a validacao** mesmo que descricao/CNAE nao tenham mudado. Os resultados ja sao salvos na solicitacao (`ia_cnae_status`, `ia_descricao_vaga`), mas o frontend nao verifica antes de chamar.

**Correcao:**
- Antes de invocar a edge function, verificar se `ia_cnae_avaliado_em` ou `ia_descricao_avaliado_em` ja tem valor recente (< 1h) e se a descricao nao mudou
- Isso evita chamadas repetidas a edge functions com IA

---

## 6. Fluig Import — inserts row-by-row (N queries)

**Arquivo:** `src/hooks/useFluigDashboard.ts` (linhas 199-450)

**Problema:** O import de Fluig faz `INSERT` ou `UPDATE` **um por um** em loop. Com 500 linhas, sao 500+ queries individuais. Alem disso, para cada alteracao detectada, faz mais inserts em `fluig_painel_eventos` e `historico_solicitacoes`.

**Correcao:** Usar `upsert` em batch (Supabase suporta arrays no `.upsert()`). Agrupar inserts de eventos tambem em batches de 50.

---

## 7. NotificationBell — realtime subscription sem cleanup adequado

**Arquivo:** `src/components/NotificationBell.tsx`

**Problema:** O staleTime e 30s, e tem realtime subscription. O realtime ja invalida o cache automaticamente — o staleTime baixo e redundante e causa polling desnecessario.

**Correcao:** Aumentar staleTime para `300_000` (5 min) ja que o realtime cuida das atualizacoes.

---

## Resumo de Impacto Estimado

| Melhoria | Reducao estimada |
|----------|-----------------|
| Paginacao MinhasSolicitacoes | -60% reads nessa pagina |
| staleTime Dashboard 15s → 2min | -8x re-fetches |
| Consolidar Eficiencia em 1 RPC | -5 round-trips por acesso |
| DISTINCT no Fluig filters | -99% rows transferidas |
| Cache AI validations | -50% chamadas edge functions |
| Batch Fluig import | -80% writes por importacao |
| NotificationBell staleTime | -10x re-fetches |

## Implementacao

- **1 migration SQL** (criar RPCs `get_fluig_filter_options` e `get_eficiencia_dashboard`)
- **6 edicoes de codigo** (hooks e paginas listados acima)

Posso implementar em ordem de impacto, comecando pelos itens 1, 2 e 4 que sao os mais simples e de maior retorno.

