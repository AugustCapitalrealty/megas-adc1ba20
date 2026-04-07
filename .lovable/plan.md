

## Melhorias no Resumo Diário do Google Chat

### Mudanças solicitadas

| Item | Atual | Novo |
|------|-------|------|
| Frequência | 3x (09h, 13h, 18h) | 2x (09h, 13h) |
| "Na fila" | Na fila | Backoffice |
| "Info pendente" | Info pendente | Aguardando requisitante |
| "Liberadas" | Liberadas | Liberadas p/ fornecedor |
| Movimento do dia | Lista detalhada por empreendimento com novas/atualizadas | Resumo compacto: apenas totais (ex: "3 novas · 5 atualizadas") |
| Saudação 18h | "Encerramos com..." | Removida (sem disparo às 18h) |

### Passo 1 — Remover cron das 18h

Executar SQL para deletar o job `gchat-digest-18h` da tabela `cron.job`.

### Passo 2 — Atualizar `gchat-daily-digest/index.ts`

**Labels renomeados:**
- `statColumn(naFila, 'Na fila', ...)` → `statColumn(naFila, 'Backoffice', ...)`
- `statColumn(aguardInfo, 'Info pendente', ...)` → `statColumn(aguardInfo, 'Aguard. requisitante', ...)`
- `{ label: 'Liberadas', ... }` → `{ label: 'Liberadas p/ fornec.', ... }`

**Movimento do dia simplificado:**
- Remover breakdown por empreendimento
- Mostrar apenas: "**3** novas · **5** atualizadas" em uma única linha compacta
- Se zero movimento: "Sem movimentação hoje."

**Greeting ajustado:**
- Remover caso "Boa noite" / "Encerramos com" (não haverá disparo noturno)
- Manter apenas manhã e tarde

### Passo 3 — Deploy e teste

Deploy da edge function atualizada e teste via Admin.

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/gchat-daily-digest/index.ts` | Labels, movimento simplificado, greeting |
| SQL (cron.job) | Remover `gchat-digest-18h` |

