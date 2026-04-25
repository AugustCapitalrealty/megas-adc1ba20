## Objetivo

Aplicar à página inicial (Dashboard) o mesmo padrão moderno, limpo e intuitivo das refatorações recentes (Nova Solicitação, Notificações, Calendário). Hoje a home tem informação útil, mas é visualmente pesada: 3 banners empilhados no topo (Resumo + Ações Pendentes + KPIs), redundância entre o card "Resumo" e "Ações Pendentes", cores fortes competindo entre si, e CTA primário sem hierarquia clara.

## Mudanças propostas

### 1. Hero compacto e hierárquico
- Título "Olá, {Nome}!" mantém peso, mas ganha **chip de contexto** ao lado (ex.: badge sutil "Admin" / "Backoffice" / "Solicitante") em vez de só texto cinza.
- Subtítulo vira microcopy mais útil: dia da semana + data por extenso (ex.: "Quinta, 25 de abril · Painel administrativo").
- Toggle Minhas/Geral migra para um **segmented control** menor, mais alinhado ao padrão Apple-like.
- CTA primário ganha variante mais sólida + ícone à esquerda; em mobile vira FAB (já existe) mas com label visível em telas md.

### 2. Unificar "Resumo" + "Ações Pendentes" num único Hero Card inteligente
Hoje o `DailyInsightCard` repete o que o `PendingActionsCard` já mostra logo abaixo. Proposta:
- **Quando há pendências**: mostrar apenas o `PendingActionsCard` redesenhado, com a frase-resumo embutida no topo ("57 itens precisam da sua atenção · 5 novas na fila"). Remover o `DailyInsightCard` redundante.
- **Quando está tudo em dia**: card único verde discreto com mensagem positiva e atalho "Criar nova solicitação" / "Ir ao Backoffice".
- **PendingActionsCard redesenhado**:
  - Remover borda dupla destrutiva e gradiente forte; usar superfície neutra com **barra lateral colorida** (4px) indicando prioridade.
  - Botões viram **action tiles** em grid (2 col mobile, auto-fit desktop) com ícone grande, contagem em destaque, label e descrição curta — em vez de botões espremidos lado a lado.
  - Item mais urgente (correções/justificativas) ganha destaque visual sutil (ring, não cor saturada).

### 3. KPIs mais limpos e escaneáveis
- Remover `bg-muted` do ícone do card "Total" (fica genérico); adotar paleta consistente.
- Aumentar o número (text-3xl) e diminuir o ícone para hierarquia clara (número é o herói).
- Sparkline alinhada à direita com cor que segue a tendência (verde sobe / vermelho cai) em vez de cor fixa.
- Hover: leve elevação + borda primária sutil; remover `active:scale` (jitter desnecessário).
- Card destacado (highlight) usa **ring-2 ring-primary/40** em vez de borda destrutiva — menos alarmista.

### 4. Últimas Solicitações com layout de timeline
- Header da seção fica como está (discreto), mas adicionar um **filtro inline** (chips: Todas · Em andamento · Pendentes) para dar agência sem trocar de página.
- Cards das últimas solicitações:
  - Remover `Card` wrapper para cada item; usar **lista densa** com divisores sutis (mais moderna, menos "caixinhas").
  - Adicionar **avatar/ícone do tipo** (OC/AC) à esquerda.
  - Status badge mantém, mas valor + tempo relativo agrupados verticalmente à direita com tipografia mais leve.
  - Hover: bg-muted/40, sem mover layout.

### 5. Empty state e loading
- Loading dos KPIs: skeleton com shimmer mais suave (já existe `Skeleton`, ajustar dimensões).
- Empty state: manter SVG, mas card sem borda dashed (mais limpo), com 2 CTAs (primário "Nova Solicitação" + secundário "Ver tutorial").

### 6. Refinamentos de design system
- Usar `space-y-4` (em vez de `space-y-6`) para densidade mais moderna em desktop, mantendo `space-y-6` no mobile via `sm:space-y-4`.
- Padronizar cantos arredondados (`rounded-xl` nos cards principais).
- Garantir contraste AA em todos os textos secundários.
- Adicionar `animate-fade-in` escalonado nas seções para sensação de carregamento progressivo.

## Arquivos afetados

- `src/pages/Dashboard.tsx` — reorganização da composição (remover DailyInsightCard quando há pendências, segmented control, hero compacto, lista de últimas solicitações sem cards, espaçamentos).
- `src/components/PendingActionsCard.tsx` — redesign para action tiles em grid, barra lateral, header com resumo embutido, estado "tudo em dia" mais discreto.
- `src/components/DailyInsightCard.tsx` — manter como componente, mas usado apenas no estado "tudo em dia" / quando não há ações pendentes (ou removido se a mensagem for absorvida no PendingActionsCard).
- `src/components/KpiSparkline.tsx` — aceitar prop opcional `direction` para colorir conforme tendência.
- (Opcional) `src/components/ui/SolicitacaoCard.tsx` — variante "compact-list" sem wrapper de Card, para a lista densa de últimas solicitações.

## Detalhes técnicos

- Toda paleta segue tokens do design system (`primary`, `success`, `destructive`, `warning`, `info`) — sem cores hardcoded em hex/HSL inline. Substituir o `text-[hsl(260,70%,50%)]` atual do PendingActionsCard por um token semântico (criar `--accent-purple` no `index.css` se necessário ou reaproveitar `info`).
- Manter compatibilidade total com props atuais do `PendingActionsCard` (não quebrar callers fora do Dashboard, se houver — verificar com rg).
- Acessibilidade: manter `role="alert" aria-live` no hero de pendências, manter focus rings, manter aria-labels descritivos nos KPIs e tiles.
- Sem mudanças de dados, hooks, queries ou backend — puramente UI/UX.
- Dark mode: validar todas as superfícies novas em ambos os temas.

## Fora de escopo

- Mudanças no NotificationBell, sidebar ou layout global.
- Lógica de negócio dos KPIs e contagens.
- Páginas internas (Backoffice, Minhas Solicitações).
