

# Melhorias para Solicitantes — MinhasSolicitacoes.tsx

## Diagnóstico

O arquivo `MinhasSolicitacoes.tsx` tem **2454 linhas** com os mesmos problemas que o Backoffice tinha: modais inline, lógica de renderização de cards inline, sem extração de componentes.

## O que será feito

### 1. KPIs Resumo no Topo

Criar `SolicitanteKPIs` com métricas relevantes para o solicitante:

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Total: 24   │ │ Com Backoff:8│ │ Correções: 2 │ │ Aceitar OC: 1│ │ Liberadas: 3 │
│  ativas      │ │  aguardando  │ │  ⚠ pendentes │ │  ✓ disponível│ │  em execução │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

Clicável para navegar à aba correspondente.

### 2. Extrair Modais → `SolicitanteModals.tsx`

Mover os 5 modais (Edit/Correção, Aceite OC, NF/Boleto, Cancel, Anexos View) para componente externo — ~800 linhas de UI.

### 3. Extrair Card Rendering → `SolicitanteSolicitacaoCard.tsx`

Extrair as funções `renderActionBanner`, `renderInfoAlert`, `renderHeaderActions`, `renderExpandedContent` e `getCardClassName` para um componente dedicado com `React.memo`, eliminando ~400 linhas do arquivo principal.

### 4. Resultado Esperado

`MinhasSolicitacoes.tsx` reduzido de **~2454 para ~1200 linhas**.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/solicitante/SolicitanteKPIs.tsx` | Criar |
| `src/components/solicitante/SolicitanteModals.tsx` | Criar |
| `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` | Criar |
| `src/pages/MinhasSolicitacoes.tsx` | Refatorar — integrar novos componentes |

