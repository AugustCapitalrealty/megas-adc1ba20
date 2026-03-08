

# Plano: UX Refinement — Hierarquia, Navegacao, Formulario, Status, Notificacoes e Acessibilidade

Seis melhorias focadas em clareza de decisao, reducao de ruido cognitivo e acessibilidade.

---

## 1. Dashboard — Hierarquia de decisao clara

**Problema:** KPIs, acoes pendentes e lista recente competem igualmente por atencao.

**Solucao:** Reorganizar em 3 camadas visuais com pesos distintos:

- **Camada 1 (topo):** `PendingActionsCard` vem PRIMEIRO quando ha acoes pendentes — e a unica coisa que requer acao imediata. Aumentar tamanho do card, usar fundo mais vibrante.
- **Camada 2:** KPI cards (como estao, mas com `opacity-80` quando nao ha dados relevantes).
- **Camada 3:** Lista recente com header mais discreto.
- **Empty state inteligente:** Se nao ha acoes pendentes, mostrar mensagem positiva ("Tudo em dia!") em vez de simplesmente omitir o card.

**Arquivo:** `src/pages/Dashboard.tsx`, `src/components/PendingActionsCard.tsx`

---

## 2. Navegacao adaptativa — ja implementada, refinamentos

A navegacao por persona ja foi implementada na ultima iteracao. Refinamentos:

- **Solicitante:** Remover "Painel Fluig" do nav principal (raramente usado). Mover para menu secundario do perfil.
- **Backoffice:** Adicionar badge de contagem no link "Backoffice" quando ha itens na fila (usar `useDashboardMetrics` com staleTime alto).
- **Mobile:** O FAB de "Nova Solicitacao" (ja existe como botao full-width) ganha posicao `fixed bottom-4 right-4` como FAB real para solicitante.

**Arquivo:** `src/components/layout/AppLayout.tsx`

---

## 3. Formulario progressivo — experiencia previsivel

**Problema:** 8 steps com muita incerteza sobre quanto falta.

**Solucao:** Melhorias no `StepIndicator` e `NovaSolicitacao`:

- **Resumo lateral (desktop):** Em telas `lg+`, mostrar sidebar fixa com resumo do que ja foi preenchido (empreendimento, valor, fornecedor) — da confianca ao usuario.
- **Microcopy por step:** Adicionar `description` nos steps com frases curtas de orientacao ("Escolha o empreendimento onde o servico sera realizado").
- **Auto-save feedback:** O indicador de "Rascunho salvo" ja existe mas e sutil. Adicionar toast discreto na primeira vez que salva.
- **Botao "Próximo" com label contextual:** Em vez de sempre "Próximo", mostrar o nome do proximo step ("Ir para Fornecedor").

**Arquivos:** `src/pages/NovaSolicitacao.tsx`, `src/components/StepIndicator.tsx`

---

## 4. Status com linguagem de acao

**Problema:** Labels como "Em Processamento" ou "Aguardando Aceite" nao dizem ao usuario O QUE FAZER.

**Solucao:** Criar mapeamento `STATUS_ACTION_LABELS` que traduz status tecnico em instrucao pratica, exibido como subtexto:

```text
recebido         → "Sua solicitação está na fila de análise"
em_analise       → "O backoffice está analisando sua solicitação"
pendente_correcao → "Você precisa corrigir e reenviar"
aprovado         → "Aprovada! Em processo de lançamento"
oc_ac_emitida    → "Aceite a OC para liberar ao fornecedor"
aguardando_nf_boleto → "Envie a NF e boleto do fornecedor"
liberado_fornecedor → "Fornecedor já pode executar o serviço"
concluida        → "Processo finalizado"
cancelado        → "Cancelada por você"
```

- Adicionar prop `showActionHint` ao `StatusBadge` que renderiza tooltip ou subtexto.
- Usar nas paginas `MinhasSolicitacoes` (cards) e `Dashboard` (lista recente).

**Arquivos:** `src/types/index.ts` (novo mapeamento), `src/components/ui/status-badge.tsx`

---

## 5. Notificacoes — triagem eficiente

**Problema:** A Central existe mas falta controle do usuario e visual de urgencia.

**Solucao:**

- **Tabs de triagem rapida:** Adicionar tabs no topo: "Todas" | "Nao lidas" | "Urgentes" (critical + high) — substitui os selects de filtro por algo mais direto.
- **Acao por swipe/inline:** Adicionar botao "Marcar como lida" inline em cada card (icone discreto no hover).
- **Agrupamento por dia:** Separar notificacoes por "Hoje", "Ontem", "Esta semana", "Anteriores".
- **Contagem nos tabs:** "Nao lidas (5)" | "Urgentes (2)"

**Arquivo:** `src/pages/Notificacoes.tsx`

---

## 6. Acessibilidade e legibilidade

**Problema:** Badges pequenos, contraste baixo em status, falta de `aria-labels`.

**Solucao aplicada nos componentes criticos:**

- **StatusBadge:** Aumentar `min-height` para 28px, `font-size` para 13px (de 12px). Adicionar `aria-label` com status completo.
- **KPI Cards (Dashboard):** Adicionar `role="button"` e `aria-label` descritivo ("5 solicitações pendentes, clique para ver detalhes").
- **PendingActionsCard:** Adicionar `role="alert"` e `aria-live="polite"` para leitores de tela.
- **Formulario:** Adicionar `aria-describedby` nos campos com validacao, linkar erros ao campo.
- **Contraste status badges:** Revisar cores dos status com HSL para garantir ratio 4.5:1 minimo. Ajustar `.status-em-analise`, `.status-pendente`, `.status-aguardando-info` que usam tons claros.
- **Focus visible:** Adicionar `focus-visible:ring-2 focus-visible:ring-primary` nos cards clicaveis.

**Arquivos:** `src/index.css`, `src/components/ui/status-badge.tsx`, `src/pages/Dashboard.tsx`, `src/components/PendingActionsCard.tsx`

---

## Resumo

| Item | Arquivos | Tipo |
|------|----------|------|
| Dashboard hierarquia | Dashboard.tsx, PendingActionsCard.tsx | Code |
| Nav refinamentos | AppLayout.tsx | Code |
| Formulario progressivo | NovaSolicitacao.tsx, StepIndicator.tsx | Code |
| Status com acao | types/index.ts, status-badge.tsx | Code |
| Notificacoes triagem | Notificacoes.tsx | Code |
| Acessibilidade | index.css, status-badge.tsx, Dashboard.tsx, PendingActionsCard.tsx | Code |

**0 migrations SQL** — tudo frontend. **~10 arquivos editados.**

