# Google Chat Design System

Um guia completo de como construir mensagens visuais consistentes e atraentes no Google Chat usando a Card API v2.

## 🎨 Paleta de Cores

Utilizamos uma paleta consistente para sinalizar diferentes estados e urgências:

```typescript
const COLORS = {
  critical: '#D32F2F',  // Vermelho - Ações que requerem atendimento imediato
  warning: '#F57C00',   // Laranja - Avisos e alertas
  alert: '#FBC02D',     // Amarelo - Informações importantes
  info: '#1E88E5',      // Azul - Informações gerais
  success: '#43A047',   // Verde - Sucesso e confirmações
  muted: '#999999',     // Cinza - Texto secundário
}
```

## 📐 Padrões de Layout

### 1. Grid de Estatísticas (3 colunas)

Ideal para mostrar múltiplos KPIs em um espaço compacto:

```typescript
import { createStatGrid } from '../_shared/gchat-helpers.ts'

const stats = [
  { value: 5, label: 'Crítico', color: COLORS.critical },
  { value: 21, label: 'Em Análise', color: COLORS.info },
  { value: 74, label: 'Ativos', color: COLORS.success },
]

const grid = createStatGrid(stats)
// Resultado: 3 colunas com números grandes e labels pequenos
```

### 2. Seções com Headers Coloridos

Para organizar informações por categoria:

```typescript
import { createSectionHeader, createDivider } from '../_shared/gchat-helpers.ts'

const sections = [
  {
    header: createSectionHeader({
      emoji: '⚠️',
      title: 'AÇÕES CRÍTICAS',
      color: COLORS.critical,
      subtitle: 'Requerem atendimento imediato',
    }),
    widgets: [...],
  },
  createDivider(),
  {
    header: createSectionHeader({
      emoji: '📊',
      title: 'EM MOVIMENTO',
      color: COLORS.info,
    }),
    widgets: [...],
  },
]
```

### 3. Lista Decorada (DecoratedText)

Perfeita para pares de informações com ícones:

```typescript
import { createDecoratedTextWidget } from '../_shared/gchat-helpers.ts'

const widget = createDecoratedTextWidget({
  topLabel: 'Protocolo',
  text: '<b>SO-2026-001</b>',
  icon: 'TASK',
})
```

**Ícones disponíveis:**
- `TASK` - Tarefas/Protocolos
- `PERSON` - Pessoas/Clientes
- `BUSINESS` - Empresas/Fornecedores
- `DOLLAR` - Valores/Dinheiro
- `CLOCK` - Tempo/Prazos
- `BOOKMARK` - Marcações/Status
- `EMAIL` - Comunicações
- `HOTEL_ROOM_TYPE` - Empreendimentos
- `WARNING` - Avisos
- `INFO` - Informações
- `CHECK_CIRCLE` - Sucesso
- `INVITE` - Fila
- E [mais](https://developers.google.com/chat/api/reference/rest/v1/cards#knownicon)

## 🎯 Padrões de Notificação

### Critical Alert (Ação imediata)

```
┌─────────────────────────┐
│ 🔴 AÇÕES CRÍTICAS       │ ← Header em vermelho
│ (Requerem ação)         │
├─────────────────────────┤
│ [5] [3] [2]             │ → Stats em 3 colunas
│  Na  Correção Info      │
│ Fila Necessária         │
├─────────────────────────┤
│ Total: 5 itens críticos │ ← Footer resumido
└─────────────────────────┘
```

### Information (Atualização)

```
┌─────────────────────────┐
│ ✅ OC EMITIDA           │ ← Header em verde
│ (Gerada com sucesso)    │
├─────────────────────────┤
│ Protocolo: SO-2026-001  │
│ Cliente: Cliente X      │
│ Valor: R$ 10.000,00     │
├─────────────────────────┤
│ [Ver Detalhes]          │ → CTA
└─────────────────────────┘
```

### Warning (Atenção necessária)

```
┌─────────────────────────┐
│ ⏱️ ALERTA DE SLA         │ ← Header em laranja
│ (85% do SLA consumido)  │
├─────────────────────────┤
│ Protocolo: SO-2026-001  │
│ Tempo restante: 4h      │
├─────────────────────────┤
│ [Acelerar Processo]     │
└─────────────────────────┘
```

## 📏 Tamanhos de Fonte

Use as tags `<font size=X>` para criar hierarchy:

- `size=1` - Pequeno (subtítulos, labels)
- `size=2` - Médio (descrições)
- `size=3` - Normal (conteúdo)
- `size=4` - Grande (números principais)
- `size=5` - Muito grande (números críticos)

## 💡 Boas Práticas

### ✅ Faça

1. **Limite de 3-4 seções** - Não sobrecarregue
2. **Use cores estrategicamente** - Vermelho = urgência, Verde = sucesso
3. **Agrupe informações relacionadas** - Seções lógicas
4. **Adicione dividers** - Separa visualmente as seções
5. **Include footers** - Resumo ou estatística final
6. **Use emojis** - Facilitam identificação rápida
7. **Bottons claros** - CTAs deixam próximo passo óbvio

### ❌ Evite

1. **Muitas cores diferentes** - Confunde visualmente
2. **Fontes muito pequenas** - Impossível ler no mobile
3. **Seções vazias** - Remova ou collapse
4. **Texto muito longo** - Use resumos e links
5. **Ícones incoerentes** - Mantenha semântica
6. **Números sem contexto** - Sempre adicione labels

## 🔨 Helpers Disponíveis

### `createStatWidget`
Cria um widget com número grande + label

### `createStatGrid`
Cria um grid de stats (3 por linha)

### `createSectionHeader`
Cria header com emoji + título + cor

### `createDecoratedTextWidget`
Cria campo com ícone + label + valor

### `createDivider`
Separa visualmente seções

### `createFooterSummary`
Footer com texto cinza para resumo

### `createButtonWidget`
Cria botões com links

## 📊 Exemplo Completo: Daily Digest

```typescript
import {
  buildCard,
  createSectionHeader,
  createStatGrid,
  createDivider,
  createDecoratedTextWidget,
  createFooterSummary,
  createButtonWidget,
} from '../_shared/gchat-helpers.ts'

const message = buildCard(
  '☀️ Bom dia!',
  'BA Chamados — 04/04/2026',
  [
    {
      header: createSectionHeader({
        emoji: '⚠️',
        title: 'AÇÕES CRÍTICAS',
        color: '#D32F2F',
      }),
      widgets: [
        {
          columns: {
            columnItems: [
              createStatWidget({ value: 5, label: 'Na Fila', color: '#D32F2F' }),
              createStatWidget({ value: 3, label: 'Correção', color: '#F57C00' }),
              createStatWidget({ value: 2, label: 'Info', color: '#FBC02D' }),
            ],
          },
        },
        createFooterSummary('Total: 5 itens críticos'),
      ],
    },
    createDivider(),
    {
      header: createSectionHeader({
        emoji: '📈',
        title: 'EM MOVIMENTO',
        color: '#1E88E5',
      }),
      widgets: [
        createDecoratedTextWidget({
          topLabel: 'Mega Curitiba',
          text: '3 novas + 2 atualizadas',
          icon: 'HOTEL_ROOM_TYPE',
        }),
      ],
    },
    createDivider(),
    {
      widgets: [
        createButtonWidget([
          { text: '🚀 Abrir BA Chamados', url: 'https://megas.lovable.app' },
        ]),
      ],
    },
  ]
)
```

## 🧪 Teste Seu Design

1. Use o [Card Builder do Google Chat](https://developers.google.com/chat/api/guides/message-formats/cards) para previews
2. Teste com diferentes temas (claro/escuro)
3. Teste em mobile (redimensione)
4. Valide cores para daltonismo (use contrast checker)
5. Envie para o team previamente antes de deploy

## 📚 Referências

- [Google Chat Cards v2 API](https://developers.google.com/chat/api/reference/rest/v1/cards)
- [Node Color Reference](https://material.io/resources/color/) - Material Design
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
