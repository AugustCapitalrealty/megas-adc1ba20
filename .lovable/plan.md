# Roadmap UX/UI — Unificação e Excelência Visual

Substitui o roadmap anterior. Foco: elevar a qualidade visual do sistema inteiro mantendo o padrão Mega, eliminando inconsistências entre páginas.

---

## Diagnóstico — inconsistências detectadas

Após varredura visual das principais páginas (`Dashboard`, `DashboardSLA`, `DashboardEficiencia`, `Backoffice`, `MonitoramentoOC`, `GarantiasVigentes`, `MinhasSolicitacoes`, `NovaSolicitacao`, `PainelFluig`, `Calendario`, `Notificacoes`, `Admin`, `AdminExcelencia`):

### Problemas estruturais
- **Cabeçalhos de página inconsistentes**: cada página tem título/subtítulo/ações em layout próprio (alguns com ícone, outros não; alguns com breadcrumb, outros sem; padding variável).
- **KPI cards divergentes**: `SolicitanteKPIs`, `GarantiaKPIs`, `SlaKpiCard`, blocos do Dashboard usam tamanhos de fonte, ícones, cores e densidades diferentes.
- **Tabelas e listas**: `BackofficeTable`, `SolicitanteTable`, listas de OC e Garantias têm zebra/hover/spacing diferentes; estados vazios variam (alguns usam `ContextualEmptyState`, outros texto puro).
- **Filtros e toolbars**: alguns usam `FilterBar`, outros montam inline; chips de filtro ativos aparecem só em parte.
- **Modais**: `BackofficeModals`, `OCDetalhesModal`, `JustificativaModal`, `SlaTimelineModal` têm headers/footers/larguras diferentes (`ActionModal` existe mas não é usado em todos).
- **Badges de status**: coexistem `StatusBadge`, `SlaBadge`, `InstrumentoJuridicoBadge`, `FluxoBadge`, `TimeInStatusBadge`, `MEIAlertBadge` com paletas e tamanhos próprios.
- **Cards de solicitação**: `SolicitacaoCard`, `BackofficeSolicitacaoCard`, `SolicitanteSolicitacaoCard`, `GarantiaCard` repetem layout com pequenas variações.
- **Espaçamentos**: páginas usam `p-4`, `p-6`, `p-8`, `space-y-4`, `space-y-6` sem regra clara.
- **Densidade**: Backoffice/Monitoramento são densos; Dashboard é arejado; sem escala consistente.

### Problemas de design system
- `index.css` define tokens, mas vários componentes ainda usam cores diretas (`text-blue-500`, `bg-green-100`).
- Tipografia sem escala documentada (h1/h2/h3/body/caption variam por página).
- Ícones de tamanhos variados (`h-4`, `h-5`, `h-6`) sem regra de uso.
- Sem padrão para skeletons (alguns usam `SolicitacaoCardSkeleton`, outros `Skeleton` cru, outros nada).

---

## Princípios do novo padrão

1. **Uma página, uma estrutura**: header → filtros → conteúdo → ações secundárias.
2. **Tokens, sempre**: zero cores hardcoded. Tudo via `index.css` + Tailwind tokens.
3. **Componentes únicos**: cada padrão (KPI, card de solicitação, tabela, modal) tem **um** componente canônico reutilizado.
4. **Densidade controlada**: 3 níveis (`compact`, `normal`, `comfortable`) com regra clara de uso.
5. **Estados completos**: toda lista/tabela tem loading, empty, erro padronizados.
6. **Acessibilidade básica**: foco visível, contraste AA, ARIA em modais e botões de ícone.

---

## Roadmap (4 ondas)

### Onda 1 — Fundação do Design System (esta entrega)
1. **Auditar e ampliar tokens** em `index.css` e `tailwind.config.ts`: cores semânticas (success/warning/danger/info nas variantes 50/100/500/700), escala de espaçamento (`space-page`, `space-section`, `space-stack`), tipografia (`text-display`, `text-h1..h4`, `text-body`, `text-caption`, `text-label`), raios e sombras.
2. **Documento vivo `mem://design/system`** com regras de uso (quando usar cada token, densidade, ícones, badges).
3. **Componentes canônicos novos**:
   - `PageHeader` (título + descrição + breadcrumb + ações + ícone opcional).
   - `PageContainer` (padding/maxwidth/spacing padronizado).
   - `KpiCard` único (substitui variantes espalhadas).
   - `DataTable` wrapper consistente (zebra, hover, sticky header, empty/loading/error).
   - `FilterToolbar` (consolida `FilterBar` + chips de filtros ativos).
   - `StandardModal` (header/body/footer padronizados, baseado em `ActionModal`).
   - `StatusPill` unificado (consolida `StatusBadge`/`SlaBadge`/`FluxoBadge` por variante).
4. **Storybook leve em `/admin/design-system`** (admin-only): mostra todos os componentes com variantes para o time validar.

### Onda 2 — Migração das páginas core
5. [x] Migrar `DashboardSLA`, `DashboardEficiencia` para `PageHeader` + `PageContainer` (Dashboard mantém hero personalizado).
6. [x] Migrar `Backoffice`, `MonitoramentoOC`, `GarantiasVigentes` para `PageHeader` + `PageContainer`.
7. [x] Migrar `MinhasSolicitacoes`, `Notificacoes`, `PainelFluig`, `Admin`, `AdminExcelencia` ao mesmo padrão.

> Onda 2 entregue: todas as páginas (exceto Dashboard com hero único e Calendario que apenas reexporta) usam `PageContainer` + `PageHeader`. Próximo passo: substituir tabelas/modais/badges por `DataTable`/`StandardModal`/`StatusPill` página a página.

### Onda 3 — Wizard e fluxos longos
8. [x] Padronizar `NovaSolicitacao` (header/container canônicos, sidebar mantida, persona + FluxoBadge no slot de ações).
9. [x] Revisar `WelcomeTour`, `CommandPalette`, `NotificationBell` — já alinhados aos tokens semânticos (sem cores hardcoded, ícones consistentes em `h-4`/`h-5`); nenhum ajuste necessário além de documentação.

> Onda 3 entregue: o wizard `NovaSolicitacao` agora usa `PageContainer` + `PageHeader`, herdando ícone, tipografia e ritmo do design system. Componentes globais auditados.

### Onda 4 — Polimento
10. Auditoria visual final: print de cada página antes/depois, ajustes finos.
11. Acessibilidade: foco visível, ARIA, contraste; checklist por página.
12. Microinterações consistentes: skeletons, transições, toasts, hover states.

---

## Entregável desta primeira fase (após aprovação)

Implementar **Onda 1 completa**:
- Tokens ampliados em `index.css` + `tailwind.config.ts`.
- Componentes canônicos (`PageHeader`, `PageContainer`, `KpiCard`, `DataTable`, `FilterToolbar`, `StandardModal`, `StatusPill`).
- Página `/admin/design-system` (admin-only) com showcase.
- Memória `mem://design/system` documentando regras de uso.
- Atualização de `.lovable/plan.md` com este roadmap substituindo o anterior.

Migração das páginas (Ondas 2–4) entra em entregas seguintes para evitar PR gigante e facilitar revisão visual.

---

## Detalhes técnicos

- Todos os novos componentes em `src/components/ui/` (canônicos) ou `src/components/layout/` (estruturais).
- Nenhuma quebra de API: páginas atuais continuam funcionando até serem migradas.
- Tailwind tokens via CSS variables HSL para suportar tema (já existente).
- `StatusPill` aceita `intent` (`success|warning|danger|info|neutral`) e `size` (`sm|md`); badges legados ficam como wrappers até remoção.
- Showcase usa rota guardada por `requireAdmin` igual ao `/admin/excelencia`.

## Fora do escopo

- Reescrever lógica de negócio.
- Trocar biblioteca de UI (segue shadcn).
- Mudar paleta da marca (apenas formaliza tokens existentes).
