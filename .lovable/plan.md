
## Rate Limiting para Edge Functions Públicas

### Endpoints Identificados (verify_jwt = false)

| Função | Risco | Uso |
|--------|-------|-----|
| `validate-description` | Alto | Chamada AI por request |
| `validate-cnae` | Alto | Chamada AI por request |
| `validate-oc-value` | Alto | Chamada AI + upload PDF |
| `check-correction-deadline` | Médio | Batch interno (cron) |
| `check-sla-alerts` | Médio | Batch interno (cron) |
| `send-notification-email` | Alto | Envia emails via Resend |
| `test-email` | Baixo | Apenas teste |

### Estratégia

Criar um módulo utilitário `_shared/rate-limit.ts` com rate limiting em memória por IP, reutilizável em todas as functions. Limites configuráveis por endpoint.

### Implementação

**Novo: `supabase/functions/_shared/rate-limit.ts`**
```typescript
// In-memory rate limiting por IP
// Limite: X requests por janela de tempo (sliding window)
const requests = new Map<string, number[]>();

export function checkRateLimit(
  ip: string, 
  limit: number, 
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number }
```

**Mudanças em cada função:**
1. Extrair IP do header `x-forwarded-for` ou `cf-connecting-ip`
2. Chamar `checkRateLimit()` antes de processar
3. Retornar `429 Too Many Requests` com headers `Retry-After`, `X-RateLimit-Remaining`

### Limites Propostos

| Função | Limite | Janela |
|--------|--------|--------|
| `validate-description` | 20 req | 1 min |
| `validate-cnae` | 20 req | 1 min |
| `validate-oc-value` | 10 req | 1 min |
| `send-notification-email` | 30 req | 1 min |
| `check-*` (cron) | 5 req | 1 min |

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/_shared/rate-limit.ts` | Criar módulo |
| `supabase/functions/validate-description/index.ts` | Adicionar rate limit |
| `supabase/functions/validate-cnae/index.ts` | Adicionar rate limit |
| `supabase/functions/validate-oc-value/index.ts` | Adicionar rate limit |
| `supabase/functions/send-notification-email/index.ts` | Adicionar rate limit |
| `supabase/functions/check-sla-alerts/index.ts` | Adicionar rate limit |
| `supabase/functions/check-correction-deadline/index.ts` | Adicionar rate limit |
