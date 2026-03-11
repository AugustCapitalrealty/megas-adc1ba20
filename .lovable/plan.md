

## Duas Correções: Justificativas OC + Impersonação

### 1. Justificativas OC não aparecem no Dashboard

**Causa raiz**: `useDashboardMetrics.ts` linha 103-104 tem um gate `if (dayOfMonth < 23) return { total: 0, own: 0 }`. Hoje é dia 11, então retorna 0 e o botão "Justificativas OC" nunca aparece.

**Correção**: Remover o gate do dia 23. A contagem deve mostrar OCs que **efetivamente** precisam de justificativa — sem NF e sem previsão válida (previsão expirada ou inexistente). OCs "no prazo" (com previsão futura) não entram na contagem.

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useDashboardMetrics.ts` | Remover check `dayOfMonth < 23`. Manter filtro de OCs sem NF e sem previsão válida |

---

### 2. Impersonação mostra dados do admin

**Causa raiz**: O Dashboard usa `profile` (perfil real do admin) e `user?.id` (ID real do admin) em vez dos valores do usuário impersonado.

Problemas específicos:
- **Dashboard.tsx linha 33**: usa `profile` → mostra nome do admin no greeting
- **Dashboard.tsx linha 129**: `profile?.full_name` → "Olá, Guilherme!" em vez do nome do usuário impersonado
- **useDashboardMetrics.ts**: usa `user?.id` do auth → busca solicitações do admin, não do impersonado
- **useUserEmpreendimentos**: mesmo problema com `user?.id`

**Correção**:

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Dashboard.tsx` | Usar `effectiveProfile` ao invés de `profile`. Passar ID efetivo para hooks |
| `src/hooks/useDashboardMetrics.ts` | Aceitar `effectiveUserId` opcional. Usar esse ID para queries quando impersonando |

---

### Impacto
- Justificativas OC aparecerão sempre que houver OCs pendentes (sem NF e sem previsão válida), independente do dia do mês
- No modo impersonado, todo o Dashboard refletirá os dados e o nome do usuário impersonado

