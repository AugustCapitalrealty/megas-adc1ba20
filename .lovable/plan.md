## Objetivo

Reforçar o modo rascunho com (1) utilitário puro e testado para parsing/rounding do valor monetário, (2) log de auditoria leve quando anexos persistidos suprem requisitos ou quando o rascunho fica liberado para envio, e (3) testes automatizados cobrindo o cenário "editei valor do rascunho mas o anexo já salvo continua valendo".

## 1. Utilitário de valor monetário

Criar `src/lib/valor-monetario.ts` centralizando a conversão usada hoje espalhada entre `useNovaSolicitacaoForm.ts`, `NovaSolicitacao.tsx` (load do rascunho) e `duplicateFrom`:

- `toCentsString(value: number | string | null | undefined): string` — converte valor numérico (reais) para string de centavos (formato interno do input). Trata `null`, `undefined`, `NaN`, negativos, strings com vírgula, strings já em centavos.
- `fromCentsString(input: string): number` — devolve valor em reais (`parseFloat(digits)/100`), idempotente.
- `formatBRL(value: number): string` — wrapper de `Intl.NumberFormat`.

Refatorar os 3 call-sites para usar `toCentsString` — garante que load do rascunho, duplicação e edição passem pelo mesmo caminho. Sem mudança de comportamento esperada; só elimina a divergência que causou o bug do "R$ 10,00".

## 2. Log de auditoria

Tabela nova `solicitacao_draft_audit` (migration):

```text
id, solicitacao_id, user_id, evento, detalhes jsonb, created_at
```

Eventos registrados:

- `anexo_persistido_aceito` — quando `hasAnexo(tipo)` resolve via `existingAnexoTipos` (e não via novo upload) no momento do submit/promote. `detalhes`: `{ tipos: string[] }`.
- `rascunho_liberado_envio` — quando `canSubmit` passa de `false` para `true` numa edição de rascunho. `detalhes`: `{ etapa, valor, anexos_persistidos: string[] }`.

RLS: insert pelo próprio dono do rascunho (`auth.uid() = user_id`); select restrito a backoffice/admin via `is_backoffice_or_admin`.

Disparo no front: helper `logDraftAudit(evento, solicitacaoId, detalhes)` chamado em `NovaSolicitacao.tsx` no `promoteDraft` (anexos persistidos aceitos) e num `useEffect` que observa transição de `canSubmit` quando há `draftId`. Fire-and-forget (mesmo padrão do `useTrackEvent`), não bloqueia UI.

## 3. Testes

### 3a. Unit (Vitest) — `src/lib/valor-monetario.test.ts`

- `toCentsString(1000)` → `"100000"` (regressão direta do bug)
- `toCentsString(770.37)` → `"77037"`
- `toCentsString("1.234,56")` → `"123456"`
- `toCentsString(null)` / `undefined` / `NaN` → `""`
- Round-trip: `fromCentsString(toCentsString(v)) ≈ v` para amostra de valores
- `toCentsString(0.1 + 0.2)` → `"30"` (sem erro de ponto flutuante)

### 3b. Validação de anexos — `src/hooks/useNovaSolicitacaoErrors.test.ts`

Cobre `computeStepErrors` na etapa `anexos`:

- Sem nenhum anexo → erro
- Anexo novo no formState → sem erro
- Anexo persistido (Set) → sem erro
- Anexo persistido + valor alterado no formState (cenário do bug) → sem erro
- Anexo persistido de tipo diferente do exigido → erro mantém

### 3c. Integração leve — `src/pages/NovaSolicitacao.draft.test.tsx`

Smoke test renderizando `NovaSolicitacao` com mock do `supabase` retornando um rascunho (`valor = 1500`, 1 anexo `proposta` salvo):

- Asserta input "Valor" exibe `R$ 15,00` — não `R$ 0,15` ou `R$ 1500,00`
- Asserta botão "Enviar Solicitação" fica habilitado mesmo sem novo upload
- Simula `setValor(novoValor)` e confirma que botão continua habilitado

Mocks mínimos: `supabase.from('solicitacoes').select().eq().maybeSingle()`, `supabase.from('anexos').select().eq()`, `useAuth`.

## Arquivos

- `src/lib/valor-monetario.ts` (novo)
- `src/lib/valor-monetario.test.ts` (novo)
- `src/hooks/useNovaSolicitacaoErrors.test.ts` (novo)
- `src/pages/NovaSolicitacao.draft.test.tsx` (novo)
- `src/pages/NovaSolicitacao.tsx` (refactor para usar `toCentsString` + chamadas `logDraftAudit`)
- `src/hooks/useNovaSolicitacaoForm.ts` (refactor `duplicateFrom` para `toCentsString`)
- `src/lib/draft-audit.ts` (novo — helper fire-and-forget)
- Migration: cria `solicitacao_draft_audit` + RLS

## Fora de escopo

- UI para visualizar o audit log (consumido só por queries do backoffice por enquanto)
- Mudar formato de armazenamento do `valor` no estado (continua string de centavos)
- Testes E2E Playwright (cobertura via Vitest é suficiente para o bug)
