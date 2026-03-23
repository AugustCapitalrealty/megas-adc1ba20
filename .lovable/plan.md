

## Estender Prazo de 30 Dias para `aguardando_informacoes` + Badge Visual

### Contexto

O sistema já cancela automaticamente solicitações em `pendente_correcao` após 30 dias. A coluna `data_pendente_correcao` e o trigger `track_pendente_correcao_date` controlam isso, mas só cobrem `pendente_correcao`. A transição `aguardando_informacoes → rejeitado` já existe na tabela `status_transitions`.

### Mudanças

#### 1. Migração SQL — Estender trigger para `aguardando_informacoes`

Alterar a função `track_pendente_correcao_date` para também registrar a data quando o status entra em `aguardando_informacoes`, e limpar quando sai:

```sql
CREATE OR REPLACE FUNCTION public.track_pendente_correcao_date()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('pendente_correcao', 'aguardando_informacoes') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('pendente_correcao', 'aguardando_informacoes')) THEN
    NEW.data_pendente_correcao = NOW();
  ELSIF NEW.status NOT IN ('pendente_correcao', 'aguardando_informacoes') 
        AND OLD.status IN ('pendente_correcao', 'aguardando_informacoes') THEN
    NEW.data_pendente_correcao = NULL;
  END IF;
  RETURN NEW;
END;
$$
```

#### 2. Edge Function — Buscar ambos os status

**Arquivo:** `supabase/functions/check-correction-deadline/index.ts`

- Alterar a query para usar `.in("status", ["pendente_correcao", "aguardando_informacoes"])` em vez de `.eq("status", "pendente_correcao")`
- Adaptar as mensagens de notificação/e-mail para refletir o status correto (ex: "prazo para resposta" vs "prazo para correção")
- No histórico, usar `status_anterior` dinâmico baseado no status real da solicitação

#### 3. Badge Visual — Expandir para ambos os status

**Arquivo:** `src/components/CorrectionDeadlineBadge.tsx`

- Alterar condição de `status !== 'pendente_correcao'` para `!['pendente_correcao', 'aguardando_informacoes'].includes(status)`
- Ajustar label: mostrar "para correção" ou "para resposta" conforme o status

#### 4. Badge no card do Backoffice

**Arquivo:** `src/components/backoffice/BackofficeSolicitacaoCard.tsx`

- Importar e renderizar `CorrectionDeadlineBadge` passando `data_pendente_correcao` e `status` (já disponíveis nos dados do card via `SolicitacaoBackoffice`)

### Arquivos Modificados

| Arquivo | Tipo |
|---------|------|
| Migração SQL | Trigger `track_pendente_correcao_date` |
| `supabase/functions/check-correction-deadline/index.ts` | Edge function |
| `src/components/CorrectionDeadlineBadge.tsx` | Componente |
| `src/components/backoffice/BackofficeSolicitacaoCard.tsx` | Adicionar badge |

