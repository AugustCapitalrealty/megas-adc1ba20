

## Resumo por Empreendimento via Google Chat Spaces

### Contexto

Você criou 4 espaços no Google Chat:
- **Bot Backoffice** → resumo geral (todas as solicitações)
- **Bot Mega Esteio** → só solicitações de Mega Esteio
- **Bot Mega Curitiba** → só solicitações de Mega Curitiba
- **Bot Mega Itajaí** → só solicitações de Mega Itajaí

### O que preciso de você

Sim, preciso dos **space IDs** de cada grupo. Para encontrar:
1. Abra cada espaço no Google Chat (web)
2. Na URL vai aparecer algo como: `https://chat.google.com/room/AAQAdpI7TfI` ou `https://mail.google.com/chat/u/0/#chat/space/AAAA...`
3. O ID é a parte final — ex: `spaces/AAQAdpI7TfI`

Me passe os 4 IDs, um para cada grupo.

### Implementação

**1. Criar tabela `gchat_spaces`** (migration)
```sql
CREATE TABLE gchat_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_name text NOT NULL,         -- ex: spaces/AAQAdpI7TfI
  label text NOT NULL,              -- ex: Bot Mega Curitiba
  empreendimento text,              -- ex: mega_curitiba (NULL = backoffice geral)
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**2. Atualizar `gchat-daily-digest`**
- Buscar todos os spaces ativos de `gchat_spaces`
- Para cada space:
  - Se `empreendimento IS NULL` → enviar resumo geral (comportamento atual)
  - Se `empreendimento = 'mega_curitiba'` → filtrar solicitações por empreendimento e enviar resumo filtrado
- Usar `sendGChatMessageAuth` passando o `spaceName` como parâmetro em vez de ler de env var

**3. Atualizar `gchat-auth.ts`**
- Alterar `sendGChatMessageAuth` para aceitar `spaceName` como parâmetro opcional (se não passar, usa o da env var como fallback)

**4. Atualizar `gchat-notify-oc`**
- Ao notificar OC/correção, enviar para o space do empreendimento correspondente + space backoffice

### Fluxo

```text
gchat-daily-digest dispara
  → busca gchat_spaces (4 registros)
  → para cada space:
      filtra solicitações por empreendimento
      monta card com dados filtrados
      envia via API para aquele space
```

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Criar tabela `gchat_spaces` + inserir os 4 registros |
| `supabase/functions/_shared/gchat-auth.ts` | `sendGChatMessageAuth(message, spaceName?)` |
| `supabase/functions/gchat-daily-digest/index.ts` | Loop por spaces, filtro por empreendimento |
| `supabase/functions/gchat-notify-oc/index.ts` | Enviar para space do empreendimento + backoffice |

