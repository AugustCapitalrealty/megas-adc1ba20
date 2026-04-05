

## Verificação das PRs — Status e Correções Necessárias

### Status de cada feature

| Feature | Status | Detalhes |
|---------|--------|----------|
| Nova UI para mensagem Google Chat (daily digest) | **Aplicada** | `gchat-daily-digest` com Cards v2, stat grids, seções por prioridade/ativas/movimento por empreendimento |
| Mensagem em 3 horários (09h, 13h, 18h) | **Parcialmente** | Cron jobs foram criados via SQL insert, mas não é possível verificar se persistiram — precisam ser revalidados |
| Mensagem quando subir OC com anexo (PDF) | **Aplicada** | `gchat-notify-oc` envia card com descrição, PDF signed URL, e botões. Backoffice.tsx invoca a function |
| Mensagem quando solicitar correção | **NÃO aplicada** | `gchat-notifications.ts` tem `notifyCorrectionsRequested()` mas **nunca é chamada** em nenhum lugar do código. Nenhum trigger no Backoffice |

### Build errors atuais (4 erros em `gchat-notifications.ts`)

O arquivo `_shared/gchat-notifications.ts` tem erros de tipo que impedem o deploy de TODAS as edge functions:

1. **`createDivider()` usado como section** — `buildCard` espera sections com `widgets: any[]`, mas `createDivider()` retorna `{ divider: {...} }` sem `widgets`. Ocorre 3 vezes (linhas 79, 150, 217).
2. **Widget sem `topLabel`/`startIcon`** — Na linha 131, um `decoratedText` tem apenas `text` mas o tipo retornado por `createDecoratedTextWidget` exige `topLabel` e `startIcon`.

### Plano de correção

**Passo 1 — Corrigir `gchat-notifications.ts`** (fix build)
- Substituir os 3 `createDivider()` usados como section por `{ widgets: [createDivider()] }`
- Corrigir o widget da linha 131 adicionando `topLabel` e ajustando para usar `textParagraph` em vez de `decoratedText`

**Passo 2 — Implementar notificação de correção no Backoffice**
- No `Backoffice.tsx`, onde o status muda para `pendente_correcao` ou `aguardando_informacoes`, adicionar chamada a uma edge function (ou diretamente ao webhook) para notificar no Google Chat
- Reutilizar o template `notifyCorrectionsRequested` do `gchat-notifications.ts` ou criar inline no Backoffice similar ao `gchat-notify-oc`

**Passo 3 — Verificar cron jobs dos 3 horários**
- Executar query `SELECT * FROM cron.job WHERE jobname LIKE 'gchat%'` para confirmar se os 3 schedules existem
- Se não existirem, recriar via SQL insert

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/_shared/gchat-notifications.ts` | Fix 4 erros de tipo |
| `src/pages/Backoffice.tsx` | Adicionar chamada GChat quando solicitar correção |
| SQL (query + insert) | Verificar/recriar cron jobs |

