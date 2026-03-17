

## Melhorias: Banner de Celebração + Refinamentos Gerais

### 1. Banner de Celebração — Mais Visível e Polido

**Problema:** O banner atual usa `bg-success/10` (verde muito claro) com `text-success-foreground` que é praticamente preto — pouca distinção visual. Não chama atenção.

**Arquivo:** `src/pages/MinhasSolicitacoes.tsx` (linhas 836-847)

**Mudanças:**
- Fundo verde sólido mais vibrante: `bg-emerald-500 text-white` em vez de `bg-success/10`
- Ícone maior e com fundo circular branco semi-transparente
- Tipografia mais destacada (text-base em vez de text-sm)
- Animação de entrada slide-down (não apenas fade)
- Borda esquerda grossa verde-escuro como accent (`border-l-4 border-emerald-700`)
- Botão de fechar branco com hover visível

### 2. DailyInsightCard — Resumo com Ações Diretas

**Arquivo:** `src/components/DailyInsightCard.tsx`

**Mudanças:**
- Quando há pendências, adicionar botão "Ver pendências" que navega para a aba relevante
- Aceitar prop `onAction` opcional para navegação contextual
- Usar `font-semibold` no resumo quando há alertas para maior destaque

### 3. Filtro por Empreendimento — Melhorar o `<select>` Nativo

**Arquivo:** `src/pages/MinhasSolicitacoes.tsx` (linhas 870-884)

**Mudança:** Trocar o `<select>` nativo por um `Select` do shadcn/ui para consistência visual com o resto da interface.

### 4. KPIs do Solicitante — Indicação de Tab Ativa

**Arquivo:** `src/components/solicitante/SolicitanteKPIs.tsx`

**Mudança:** Adicionar destaque visual mais forte no KPI selecionado (ring + scale) para deixar claro qual filtro está ativo.

---

### Resumo de Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/pages/MinhasSolicitacoes.tsx` | Banner verde vibrante + Select shadcn |
| `src/components/DailyInsightCard.tsx` | Botão de ação contextual |
| `src/components/solicitante/SolicitanteKPIs.tsx` | Tab ativa mais visível |

