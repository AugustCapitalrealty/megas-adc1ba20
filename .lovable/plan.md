

## Ajustes no Botão do Google Chat

### Mudanças

1. **Renomear botão** de "Abrir BA Chamados" para **"Abrir Sistema"** em 2 arquivos:
   - `supabase/functions/gchat-daily-digest/index.ts` (linha 200)
   - `supabase/functions/gchat-send-test/index.ts` (linha 98)

2. **Centralizar botão** — No Google Chat Cards v2, o `buttonList` não tem propriedade nativa de alinhamento horizontal (sempre alinha à esquerda). A única forma de centralizar é envolver o botão em um widget `columns` com uma única coluna centralizada:
   ```
   columns: { columnItems: [{ horizontalAlignment: 'CENTER', widgets: [{ buttonList: ... }] }] }
   ```

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/gchat-daily-digest/index.ts` | Texto → "Abrir Sistema", centralizar via columns |
| `supabase/functions/gchat-send-test/index.ts` | Texto → "Abrir Sistema", centralizar via columns |

### Deploy

Redeploy das 2 edge functions após as alterações.

