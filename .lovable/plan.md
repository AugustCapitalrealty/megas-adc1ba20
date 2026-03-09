

## Varredura Final UI/UX - Oportunidades de Refinamento

### 1. **Acessibilidade e Feedback Visual**

| Componente | Problema | Solução |
|------------|----------|---------|
| `SolicitacaoCard` | Botão de copiar protocolo não tem feedback de loading | Adicionar micro-animação de confirmação mais visível |
| `NotificationBell` | Badge "9+" pode ocultar contagem real | Mostrar contador real até 99, depois "99+" |
| `FilterBar` | Gradientes de fade nas tabs podem causar confusão | Remover gradientes laterais ou torná-los mais sutis |

### 2. **Consistência de Estados Vazios**

| Página | Melhoria |
|--------|----------|
| Dashboard | ✓ Já tem ilustração SVG e CTA |
| Minhas Solicitações | Verificar se `ContextualEmptyState` tem mensagens para cada aba |
| Backoffice | Adicionar empty state contextual por tab |

### 3. **Mobile Experience**

| Item | Melhoria |
|------|----------|
| `PendingActionsCard` | Botões wrap bem, mas labels longas podem truncar — adicionar `truncate` em labels |
| `WorkflowProgress` | Em mobile mostra apenas dots com tooltips ✓ — bom |
| `StepIndicator` | Mobile usa barra de progresso ✓ — bom |
| Header Nav | Menu mobile não mostra link para Dashboard (homepage) |

### 4. **Performance Percebida**

| Item | Melhoria |
|------|----------|
| `Dashboard` | KPI cards pulsam brevemente ao clicar — adicionar `active:scale-[0.98]` |
| Tabs/Filtros | Auto-scroll para topo ao mudar tab — já implementado em alguns lugares |
| Cards expandidos | Transição de altura abrupta — adicionar `animate-accordion-down` |

### 5. **Clareza de Ações**

| Componente | Problema | Solução |
|------------|----------|---------|
| `StatusBadge` | Tooltip de ação apenas ao hover — pode não ser descoberto | Manter como está (já tem aria-label) |
| `SolicitanteSolicitacaoCard` | Botão "Duplicar" só aparece em rejeitadas — adicionar tooltip explicando |
| `BackofficeSolicitacaoCard` | Muitas ações em dropdown — já tem ícones ✓ |

### 6. **Correções Específicas**

#### A. Header: Link para Home no Mobile
Adicionar item "Dashboard" no início da nav mobile.

#### B. KPI Cards: Feedback Tátil
Adicionar micro-feedback visual ao clicar nos cards de KPI.

#### C. PendingActionsCard: Truncar Labels Longas
Labels como "Justificativas OC" podem quebrar em telas pequenas.

#### D. NotificationBell: Contador Real
Mostrar número real até 99.

#### E. Empty States Contextuais no Backoffice
Mensagens específicas para cada aba.

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/layout/AppLayout.tsx` | Adicionar "Dashboard" na nav mobile |
| `src/pages/Dashboard.tsx` | Adicionar `active:scale-[0.98]` nos KPI cards |
| `src/components/PendingActionsCard.tsx` | Adicionar `truncate` nos labels dos botões |
| `src/components/NotificationBell.tsx` | Expandir contador para até 99 |
| `src/components/ui/FilterBar.tsx` | Suavizar gradientes de fade |
| `src/pages/Backoffice.tsx` | Empty states contextuais por tab |

### Escopo Estimado
6 arquivos, ~30 linhas de mudanças pontuais. Melhorias incrementais que não alteram fluxos existentes.

