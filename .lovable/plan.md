

# Plano: Corrigir lógica de aprovação no Painel Fluig

## Problema

Solicitações "fechadas" (aprovadas por todos) estão mostrando a Diretoria em vermelho. Isso acontece porque a função `getFluigApprovalStatus` usa a `localizacao` para determinar o estágio atual, mas nem sempre o campo `localizacao` reflete o estado final. Quando existe `diretoria_conclusao` mas o `currentStage < 3`, a lógica interpreta como "rejeitado/devolvido".

O mesmo problema afeta o `FluigStatusCard` nas solicitações individuais, que usa `getAprovacoesPorLocalizacao` com a mesma lógica baseada apenas em `localizacao`.

## Mudanças

### 1. `src/lib/fluig-utils.ts` — `getFluigApprovalStatus`

Adicionar verificação: se a solicitação está **fechada** (via `isFluigFechado`), todas as etapas necessárias devem ser marcadas como `approved`, independente do valor de `localizacao`.

Lógica:
```
Se isFluigFechado(snapshot):
  - facilities = 'approved'
  - financeiro = 'approved'
  - diretoria = valor <= 2500 ? 'not_required' : 'approved'
  Retorna imediatamente (sem lógica de currentStage)
```

### 2. `src/lib/fluig-utils.ts` — `getAprovacoesPorLocalizacao`

Esta função legada é usada no `FluigStatusCard`. Precisa ser atualizada para também receber o snapshot ou, alternativamente, o `FluigStatusCard` deve migrar para usar `getFluigApprovalStatus`.

**Abordagem**: Atualizar o `FluigStatusCard` para usar `getFluigApprovalStatus` em vez de `getAprovacoesPorLocalizacao`, passando os dados do snapshot. Para isso, o `useFluigStatus` precisa também buscar o campo `valor` do snapshot.

### 3. `src/hooks/useFluigStatus.ts`

Adicionar `valor` ao select da query e à interface `FluigStatus`.

### 4. `src/components/FluigStatusCard.tsx`

Substituir uso de `getAprovacoesPorLocalizacao(status.localizacao)` por `getFluigApprovalStatus(status)`, que já trata corretamente fechados e valor <= 2500.

## Resultado

Solicitações fechadas mostrarão todos os aprovantes em verde (aprovado). Solicitações com valor <= R$ 2.500 mostrarão Diretoria como "N/A" em vez de vermelho.

