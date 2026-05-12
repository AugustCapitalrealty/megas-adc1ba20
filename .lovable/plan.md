## Plano de correções técnicas — varredura geral

Foco: bugs reais e riscos técnicos identificados na varredura. Ordenados por impacto.

---

### P0 — Bugs com impacto direto no usuário

**1. Dashboard silenciosamente trunca em 1.000 registros**
`src/hooks/useDashboardMetrics.ts:83` aplica `.limit(1000)` sem paginação. Para backoffice/admin, isso significa KPIs e insights subestimados quando o volume crescer (já está no limite default do PostgREST).
- Substituir por paginação em lote (loop `.range()` até esgotar) ou agregar via RPC.
- Adicionar aviso visual quando o conjunto for parcial.

**2. NotificationBell — canal Realtime com nome estático**
`src/components/NotificationBell.tsx:97-116` cria `channel('notifications')` fixo. Em HMR, multi-tab ou impersonation, dois subscribes colidem e o segundo silenciosamente não recebe eventos. Além disso, a dependência do `useEffect` é `[user, queryClient]` (objeto), causando re-subscribe a cada render que mude a referência de `user`.
- Trocar para `channel(\`notifications:${user.id}\`)`.
- Dependências: `[user?.id, queryClient]`.

**3. Dashboard — query de justificativas sem filtro por empreendimento/usuário no servidor**
`useDashboardMetrics.ts:101-104` faz `.from('documentos_emitidos').select(...)` sem `.eq` por user/empreendimento; depende de RLS para filtrar e da JS para reagregar. Em conta com muitos OCs, isso baixa milhares de linhas a cada visita.
- Adicionar filtros server-side por `empreendimento` (via join) e por `created_at` (janela relevante para a regra do dia ≥ 23).

---

### P1 — Riscos técnicos / consistência

**4. `key={index}` em listas com itens reordenáveis ou removíveis**
Casos críticos (estado interno de input pode vazar entre itens após remover/adicionar):
- `src/components/FileUpload.tsx:297` (lista de anexos com remoção)
- `src/components/FornecedorCard.tsx:317` (CNAEs secundários)
- `src/components/backoffice/BackofficeModals.tsx:981` (cards de itens)
- `src/components/SlaTimelineModal.tsx:197`

Trocar por `key` baseado em ID/valor único. Manter `key={i}` apenas em skeletons e listas estáticas.

**5. `parseInt` sem `radix` consistente em `ParcelasField`**
`DetalhesStep.tsx:406-439` aceita qualquer string e tem dois caminhos (`onChange` strip + `onBlur` reset). Quando o usuário cola `"012"`, vira `12` no parse mas `"012"` no input. Pequeno polish: normalizar no `onChange` (`String(parseInt(...) || '')`) para evitar zero à esquerda.

**6. Excessivo `as any` (222 ocorrências)**
Indica drift entre tipos do Supabase e código. Riscos: bugs silenciosos em renomeações de colunas, falsos positivos no autocomplete.
- Auditar 10 hotspots (rodar `rg -n "as any" src --count-matches | sort` e atacar os top 5 arquivos).
- Substituir por tipos derivados de `Database['public']['Tables'][...]['Row']`.

**7. Realtime sem `removeChannel` em `Object.is` comparáveis**
Apenas `NotificationBell` usa Realtime hoje (achado positivo). Antes de adicionar mais canais, padronizar um helper `useSupabaseChannel(name, callback)` que já trata cleanup + nome com sufixo do usuário.

---

### P2 — Polimento e prevenção

**8. Logs ruidosos em produção**
95 ocorrências de `console.log/warn/error` em `src/`. Manter `console.error` para erros, mover `console.log` para um logger condicional (`if (import.meta.env.DEV)`).

**9. Headings duplicados / SEO**
Varrer páginas para garantir um único `<h1>` por rota e meta description coerente — checar `Calendario`, `Backoffice`, `MonitoramentoOC`.

**10. Missing dep arrays em `useEffect([])`**
Nenhuma ocorrência detectada (limpo). Adicionar regra eslint `react-hooks/exhaustive-deps` como `error` se ainda estiver como `warn`, para travar regressões.

---

## Detalhes técnicos

```text
useDashboardMetrics
  - paginação em lote: { from = 0; while (true) { range(from, from+999); break if data.length<1000 } }
  - ou: criar RPC `dashboard_user_metrics(viewMode, empreendimentos)` que devolve agregados

NotificationBell
  - channel(`notifications:${user.id}`)
  - deps: [user?.id, queryClient]
  - opcional: useRef para guardar channel e desinscrever no cleanup mesmo durante StrictMode

ParcelasField
  - onChange: const n = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''); setParcelas(n);
```

## Ordem sugerida de execução

1. P0.1 + P0.2 + P0.3 (bugs com impacto imediato)
2. P1.4 (keys), P1.5 (parcelas)
3. P1.6 (auditoria `as any` — 1 PR por arquivo top)
4. P2.8–10 (polimento)

Quer que eu comece pelo bloco P0 ou prefere ajustar prioridades?
