## Continuidade das melhorias técnicas

Após concluir P0 (dashboard pagination, NotificationBell realtime, server-side filters) e P1.4/P1.5 (keys + parcelas), seguem os blocos restantes do plano original.

---

### Bloco A — P1.6: Auditoria de `as any` (top 5 hotspots)

Objetivo: reduzir drift de tipos. 222 ocorrências hoje.

Passos:
1. Rodar `rg -c "as any" src --sort path` e listar os 5 arquivos com maior contagem.
2. Para cada arquivo, substituir por tipos derivados:
   - `Database['public']['Tables']['<tabela>']['Row']` para linhas
   - `Database['public']['Enums']['<enum>']` para enums
   - Tipos locais de `src/types/index.ts` quando aplicável
3. 1 commit por arquivo para facilitar revisão e rollback.
4. Validar build limpo após cada arquivo.

Critério de saída: redução ≥ 40% no total de `as any`.

---

### Bloco B — P1.4 restante (keys em listas)

Aplicar a mesma correção do `FileUpload` em:
- `src/components/FornecedorCard.tsx:317` (CNAEs secundários) → key por código CNAE
- `src/components/backoffice/BackofficeModals.tsx:981` (cards de itens) → key por id do item
- `src/components/SlaTimelineModal.tsx:197` → key por timestamp + tipo do evento

---

### Bloco C — P2.8: Logger condicional

Objetivo: 95 ocorrências de `console.*` em `src/`.

Passos:
1. Criar `src/lib/logger.ts`:
   ```ts
   const isDev = import.meta.env.DEV;
   export const logger = {
     log: (...a: unknown[]) => { if (isDev) console.log(...a); },
     warn: (...a: unknown[]) => { if (isDev) console.warn(...a); },
     debug: (...a: unknown[]) => { if (isDev) console.debug(...a); },
     error: (...a: unknown[]) => console.error(...a), // mantém em prod
   };
   ```
2. Substituir `console.log/warn/debug` por `logger.*` (manter `console.error` puro ou via logger).
3. Não tocar em edge functions (Deno) — escopo apenas `src/`.

---

### Bloco D — P2.9: SEO e headings

Varredura por página de rota top-level:
- `Calendario.tsx`, `Backoffice.tsx`, `MonitoramentoOC.tsx`, `Dashboard.tsx`, `MinhasSolicitacoes.tsx`, `GarantiasVigentes.tsx`, `Notificacoes.tsx`, `PainelFluig.tsx`, `AdminExcelencia.tsx`.

Para cada uma:
- Garantir único `<h1>` (usar `PageHeader` consistentemente)
- Title + meta description via `document.title` no mount (já há padrão? checar)
- Verificar duplicação semântica de headings dentro de cards

---

### Bloco E — P2.10: Lint hardening

1. Em `eslint.config.js`, elevar `react-hooks/exhaustive-deps` de `warn` → `error`.
2. Rodar lint e corrigir violações novas (provavelmente algumas em hooks de dashboard/backoffice).
3. Adicionar regra `no-restricted-syntax` opcional para alertar sobre novos `as any` (avisar, não bloquear).

---

### Detalhes técnicos

```text
Ordem de execução sugerida:
  Bloco B (keys restantes)   — 15min, baixo risco
  Bloco C (logger)           — 30min, refactor amplo mas mecânico
  Bloco D (SEO)              — 20min, frontend puro
  Bloco A (as any top 5)     — 60min, exige cuidado por arquivo
  Bloco E (lint hardening)   — 20min, corrige cascata final
```

Total estimado: ~2h30. Cada bloco entrega valor isolado e build verificada.

---

Quer que eu comece pelo Bloco B (mais rápido) ou prefere atacar primeiro o Bloco A (maior impacto na qualidade do código)?
