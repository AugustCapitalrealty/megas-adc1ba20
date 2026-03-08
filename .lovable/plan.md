

# Melhorias do Backoffice — Plano Abrangente

## Diagnóstico

Após análise detalhada do `Backoffice.tsx` (3106 linhas), identifiquei 4 frentes de melhoria prioritárias:

## 1. KPIs Resumo no Topo (Dashboard rápido)

Adicionar uma barra de KPIs no topo do Backoffice, antes dos filtros, com 4-5 cards compactos:

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Na Fila: 12 │ │ Em Proc: 8   │ │ OC Emitida: 5│ │ NF Pendente:3│ │ SLA Crítico:2│
│  ▲ +3 hoje   │ │  ⏱ Avg 2.1d  │ │  ✓ 4 hoje    │ │  ⚠ baixa     │ │  🔴 > 5 dias │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

- Calculados a partir dos dados já carregados (`groupedSolicitacoes`)
- Inclui tempo médio de processamento e contagem de SLA críticos
- Clicável para navegar direto à aba correspondente

**Arquivo:** `src/pages/Backoffice.tsx` (novo componente `BackofficeKPIs` inline ou extraído)

## 2. UX dos Cards — Simplificação Visual

Os cards atuais têm até 5 banners empilhados + muitos botões. Melhorias:

- **Condensar banners**: unificar "Minha Responsabilidade" + "Aguardando OC" em uma única linha com chips
- **Ações primárias como dropdown**: manter apenas 1 botão primário + "Ver Detalhes" visíveis; agrupar ações secundárias (Transferir, Solicitar Ajuste, Rejeitar) em um menu dropdown `⋮`
- **Informações do fornecedor**: mover contato do fornecedor para dentro do expand (não precisa estar sempre visível)

**Arquivo:** `src/pages/Backoffice.tsx` (refatorar `SolicitacaoCard`)

## 3. Ações em Lote (Batch Actions)

Quando múltiplas solicitações estão selecionadas, permitir ações em lote:

- Checkbox de seleção em cada card
- Barra flutuante no rodapé: "3 selecionadas — [Assumir Todas] [Exportar]"
- Inicialmente suportar: Assumir em lote e Exportar selecionadas

**Arquivo:** `src/pages/Backoffice.tsx` (novo state `selectedIds`, componente `BatchActionBar`)

## 4. Performance — Extrair Componentes

O arquivo de 3100 linhas causa re-renders desnecessários:

- **Extrair** `BackofficeKPIs` → `src/components/backoffice/BackofficeKPIs.tsx`
- **Extrair** `BackofficeSolicitacaoCard` → `src/components/backoffice/BackofficeSolicitacaoCard.tsx` (hoje está inline, recriado a cada render)
- **Extrair** modais → `src/components/backoffice/BackofficeModals.tsx` (OC registro, NF/Boleto, Fluig, Projuris)
- **Memoizar** o card com `React.memo` + comparação por `sol.id + sol.status + sol.updated_at`

**Resultado esperado:** `Backoffice.tsx` reduzido de ~3100 para ~800 linhas

## Ordem de Execução

Dado o volume, sugiro implementar em 2 etapas:

**Etapa 1** (esta implementação):
1. KPIs no topo
2. Extrair `BackofficeSolicitacaoCard` para arquivo próprio com `React.memo`
3. Condensar banners e agrupar ações secundárias em dropdown

**Etapa 2** (próxima):
4. Extrair modais para arquivo próprio
5. Batch actions com barra flutuante

**Arquivos criados/alterados:**
- `src/components/backoffice/BackofficeKPIs.tsx` (novo)
- `src/components/backoffice/BackofficeSolicitacaoCard.tsx` (novo)
- `src/pages/Backoffice.tsx` (refatorado, ~1500 linhas a menos)

