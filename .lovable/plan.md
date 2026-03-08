

# Analise UI/UX - Melhorias Identificadas

## Estado Atual
O app tem uma base solida: design system coerente com a marca Mega (laranja #E87722), tipografia Montserrat, componentes shadcn/ui bem utilizados, workflow progress bars, status badges consistentes, e boa responsividade mobile.

## Problemas e Melhorias Identificadas

### 1. Header/Navegacao - Crowded no Desktop
O header horizontal acumula 7+ items (Nova, Solicitacoes, Backoffice, Painel Fluig, Garantias, Monitoramento, Admin) ficando apertado. O botao "Nova" nao se destaca o suficiente como CTA principal.

**Proposta**: Transformar "Nova" em botao com destaque visual mais forte (filled + shadow), adicionar tooltip nos icones da nav para telas intermediarias (1024-1280px) onde os labels podem ficar cortados.

### 2. Mobile Header - Elementos Sobrepostos
No mobile (390px), o header mostra logo + notification badge + avatar + hamburger tudo apertado. A badge "9+" fica parcialmente cortada.

**Proposta**: Reduzir padding do header mobile, agrupar notification + avatar em area compacta, melhorar z-index da badge.

### 3. Dashboard - KPI Cards sem Contraste Suficiente
Os KPI cards sao todos brancos com icones coloridos, mas os sparklines sao muito sutis (quase invisiveis). O card "Aguardando Solicitante" com highlight destrutivo nao tem contraste forte o bastante.

**Proposta**: Dar cor de fundo sutil aos KPI cards (bg-info/5, bg-warning/5 etc), aumentar sparklines de 40x20 para 60x24, adicionar seta de tendencia (up/down) com cor.

### 4. Acoes Pendentes - Card muito Grande
O PendingActionsCard ocupa muito espaco vertical com poucos items. Os botoes de acao (Liberar OC, Informacoes) poderiam ser mais compactos.

**Proposta**: Layout horizontal inline para as acoes pendentes em desktop (flex-row), reduzir padding.

### 5. Solicitacao Cards - Excesso de Badges no Header
Cada card mostra: protocolo + status badge + time-in-status + correction deadline + emergencial + RM/Fluig + tipo_contratacao. Em telas menores isso quebra em 2-3 linhas.

**Proposta**: Priorizar badges - mostrar apenas status + 1 badge contextual (emergencial OU time-in-status), mover restante para area expandida.

### 6. Workflow Progress - Labels Cortados
O WorkflowProgress mostra 6 steps ("Recebido", "Analise", "Lancamento", "OC Emitida", "Liberada", "Concluida") com labels de 10px que ficam truncados em mobile. No desktop, os dots sao muito pequenos (3-5px).

**Proposta**: Esconder labels no mobile e mostrar apenas dots com tooltip, aumentar dots no desktop para melhor clicabilidade visual.

### 7. Filter Bar - Tab Groups sem Scroll Indicator
Na pagina Solicitacoes, os tab groups (EM ANDAMENTO / ACOES PENDENTES / FINALIZADAS) nao mostram scroll indicator no mobile. Tabs "Finalizadas" podem ficar escondidas.

**Proposta**: Adicionar fade gradient nas bordas do scroll area, ou scroll snap para garantir visibilidade.

### 8. Botao "Proximo" no Formulario - CTA Fraco
O botao "Proximo" no formulario tem cor `bg-primary` com opacity baixa (parece desabilitado quando nao preencheu nada, mas tambem quando ja preencheu). Falta feedback visual claro do estado habilitado vs desabilitado.

**Proposta**: Botao Proximo full-opacity quando habilitado, com animacao sutil. Botao Voltar mais discreto (ghost). Fixar botoes na parte inferior da viewport no mobile (sticky footer).

### 9. Empty States Genericos
O empty state do Dashboard mostra apenas icone + texto. Poderia ter ilustracao ou checklist mais engajante.

**Proposta**: Adicionar ilustracao SVG leve ou checklist visual para onboarding (parcialmente feito com WelcomeTour, mas o empty state padrão ainda eh generico).

### 10. Notificacoes - Dropdown sem Agrupamento
O NotificationBell mostra lista flat de notificacoes. Com 9+ itens, fica dificil priorizar.

**Proposta**: Agrupar por tipo (action_required vs info), adicionar timestamp relativo, limitar a 5 mais recentes com "Ver todas".

### 11. Backoffice - Loading State muito Longo
O Backoffice mostra skeletons sem nenhum indicador de progresso ou contexto. Parece que nada esta acontecendo.

**Proposta**: Adicionar texto "Carregando solicitacoes..." abaixo dos skeletons, ou shimmer animation mais evidente.

### 12. Falta de Dark Mode Toggle
O CSS tem variaveis `.dark` definidas mas nao ha toggle visivel para o usuario.

**Proposta**: Adicionar toggle no dropdown do usuario (avatar menu).

---

## Priorização (Impacto x Esforco)

| # | Melhoria | Impacto | Esforço |
|---|----------|---------|---------|
| 3 | KPI Cards contraste + sparklines | Alto | Baixo |
| 5 | Badge overflow nos cards | Alto | Medio |
| 8 | CTA formulario + sticky footer mobile | Alto | Baixo |
| 6 | Workflow progress mobile | Medio | Baixo |
| 10 | Notificacoes agrupadas | Medio | Medio |
| 7 | Filter tabs scroll mobile | Medio | Baixo |
| 4 | PendingActions compacto | Baixo | Baixo |
| 11 | Backoffice loading | Baixo | Baixo |
| 12 | Dark mode toggle | Medio | Baixo |
| 1 | Header nav overflow | Medio | Medio |
| 2 | Mobile header spacing | Medio | Baixo |
| 9 | Empty states visuais | Baixo | Medio |

## Implementacao Sugerida

**Lote 1 (Quick Wins - Alto Impacto)**: #3, #8, #6, #7, #11
- KPI cards com fundo colorido sutil + sparklines maiores
- Botao Proximo/Voltar com sticky footer mobile
- Workflow progress adaptativo mobile
- Filter tabs com scroll indicator
- Loading state do Backoffice

**Lote 2 (Medium Effort)**: #5, #10, #12, #4, #2
- Badge cleanup nos SolicitacaoCards
- Notificacoes com agrupamento
- Dark mode toggle
- PendingActions compacto
- Mobile header spacing

**Lote 3 (Polish)**: #1, #9
- Header nav refinamento
- Empty states com ilustracoes

## Arquivos Impactados

**Lote 1:**
- `src/components/KpiSparkline.tsx` - tamanho e seta tendencia
- `src/pages/Dashboard.tsx` - bg colors nos KPI cards
- `src/pages/NovaSolicitacao.tsx` - sticky footer buttons
- `src/components/WorkflowProgress.tsx` - responsive dots
- `src/components/ui/FilterBar.tsx` - scroll fade
- `src/pages/Backoffice.tsx` - loading text

**Lote 2:**
- `src/components/ui/SolicitacaoCard.tsx` - badge priority
- `src/components/NotificationBell.tsx` - grouping + limit
- `src/components/layout/AppLayout.tsx` - dark toggle + mobile spacing
- `src/components/PendingActionsCard.tsx` - compact layout

