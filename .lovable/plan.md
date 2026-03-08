

# Plano: Corrigir bloqueio do popup Google

## Problema

O popup do Google está sendo bloqueado pelo navegador. A causa é o **`await import()`** dinâmico dentro do `signInWithGoogle` — o browser perde a associação com o clique do usuário porque existe uma operação assíncrona (dynamic import) antes de abrir o popup.

## Solução

Trocar o `import()` dinâmico por um import estático no topo do arquivo `useAuth.tsx`. Assim o popup abre diretamente no contexto do clique do usuário.

## Alteração

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAuth.tsx` | Importar `lovable` estaticamente no topo; remover `await import()` de dentro do `signInWithGoogle` |

### Código atual:
```typescript
const signInWithGoogle = async () => {
  const { lovable } = await import('@/integrations/lovable/index'); // ← bloqueia popup
  const result = await lovable.auth.signInWithOAuth('google', { ... });
};
```

### Código novo:
```typescript
import { lovable } from '@/integrations/lovable/index'; // ← import estático no topo

const signInWithGoogle = async () => {
  const result = await lovable.auth.signInWithOAuth('google', { ... }); // ← abre direto
};
```

