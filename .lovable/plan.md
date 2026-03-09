

## Análise UI/UX — Oportunidades de Melhoria

Após revisão detalhada dos componentes visuais, fluxos de interação e padrões de layout, identifiquei as seguintes oportunidades:

---

### 1. Empty state mais expressivo e orientador (alto impacto, baixo esforço)

**Problema**: Os empty states nas listagens (MinhasSolicitacoes, Backoffice, MonitoramentoOC) são genéricos — ícone cinza + texto + botão. Não orientam o usuário sobre *por que* a lista está vazia nem oferecem ações secundárias.

**Solução**: Redesenhar empty states com ilustrações contextuais, subtítulo explicativo e ações relevantes. Ex: na aba "Correções" vazia, mostrar "Nenhuma correção pendente — suas solicitações estão em dia" com ícone de check verde em vez de ícone cinza genérico.

**Arquivos**: `src/pages/MinhasSolicitacoes.tsx`, `src/pages/Backoffice.tsx`

---

### 2. Skeleton loading mais fiel ao layout real (médio impacto, baixo esforço)

**Problema**: O skeleton de carregamento usa blocos retangulares genéricos que não correspondem ao layout dos cards reais. Quando os dados carregam, há um "salto" visual perceptível.

**Solução**: Criar um `SolicitacaoCardSkeleton` que replique a estrutura do card real (header com badges placeholder, linha de metadata, barra de progresso skeleton). Já existe `SolicitacaoCardSkeletonList` mas precisa ser verificado se replica a anatomia do card atual.

**Arquivos**: `src/components/ui/SolicitacaoCardSkeleton.tsx`

---

### 3. Action banners responsivos (alto impacto, baixo esforço)

**Problema**: Os banners de ação nos cards do solicitante (`INCLUIR NF E BOLETO`, `AÇÃO NECESSÁRIA`, `OC DISPONÍVEL`) não são responsivos. Em telas pequenas, o texto e os botões ficam espremidos ou quebram em múltiplas linhas sem alinhamento adequado.

**Solução**: Empilhar verticalmente (flex-col) em telas `< sm`, com botões ocupando largura total. Reduzir texto auxiliar para apenas o título em mobile. Adicionar `gap-2` consistente.

**Arquivos**: `src/components/solicitante/SolicitanteSolicitacaoCard.tsx`

---

### 4. Feedback visual de ação em progresso nos cards (alto impacto, baixo esforço)

**Problema**: Quando o usuário clica em "Corrigir Agora", "Liberar OC" ou outros CTAs nos banners, não há feedback visual imediato — o card permanece igual enquanto o modal carrega. Isso gera cliques duplicados.

**Solução**: Adicionar estado `loading` nos botões de ação com ícone `Loader2` spinning e `disabled` enquanto a ação processa. Aplicar `opacity-70 pointer-events-none` no banner durante o loading.

**Arquivos**: `src/components/solicitante/SolicitanteSolicitacaoCard.tsx`, `src/components/backoffice/BackofficeSolicitacaoCard.tsx`

---

### 5. KPI cards com micro-animação de contagem (médio impacto, baixo esforço)

**Problema**: Os números nos KPI cards (SolicitanteKPIs, BackofficeKPIs) aparecem instantaneamente. Não há percepção de "dados carregados" — o usuário não distingue entre "zero itens" e "ainda carregando".

**Solução**: Animar o número de 0 até o valor final com uma transição suave (200ms ease-out). Usar `tabular-nums` (já aplicado) + CSS `transition` no valor ou um hook simples de `useCountUp`.

**Arquivos**: `src/components/solicitante/SolicitanteKPIs.tsx`, `src/components/backoffice/BackofficeKPIs.tsx`

---

### 6. Scroll-to-top suave ao trocar abas de filtro (médio impacto, baixo esforço)

**Problema**: Ao clicar em uma aba de filtro (ex: "Correções" → "Finalizadas"), a lista muda mas o scroll permanece na posição anterior, frequentemente no meio da página. O usuário precisa rolar manualmente para ver os primeiros resultados.

**Solução**: Ao trocar `activeTab`, fazer `window.scrollTo({ top: filterBarRef.offsetTop - 80, behavior: 'smooth' })` para posicionar a lista visível.

**Arquivos**: `src/pages/MinhasSolicitacoes.tsx`, `src/pages/Backoffice.tsx`

---

### Priorização

| # | Melhoria | Impacto | Esforço |
|---|----------|---------|---------|
| 3 | Banners responsivos | Alto | Baixo |
| 4 | Feedback visual de loading nos CTAs | Alto | Baixo |
| 1 | Empty states contextuais | Alto | Baixo |
| 6 | Scroll-to-top ao trocar aba | Médio | Baixo |
| 5 | Micro-animação de contagem KPI | Médio | Baixo |
| 2 | Skeleton fiel ao layout | Médio | Baixo |

