

# Unificação da Lógica Fluig entre Painel e Solicitações

## Diagnóstico: 3 Lógicas Diferentes para a Mesma Coisa

Existem **3 implementações independentes** para determinar o status de aprovação Fluig:

### 1. `FluigStatusCard.tsx` (dentro da solicitação no Backoffice)
- Usa `getAprovacoesPorLocalizacao()` de `fluig-utils.ts` (baseado em **localização**)
- Usa `RESPONSAVEL_PROXIMA_ETAPA` com nomes hardcoded de pessoas
- Detecta devoluções comparando níveis de localização no histórico de eventos

### 2. `PainelFluig.tsx` (tabela do painel)
- Usa `LOCALIZACAO_TO_ETAPA` para determinar estágio atual
- Implementa lógica **própria** de rejeição com combinação de `currentStage`, nomes de responsáveis, e campos `*_conclusao`
- Lógica de "fechado" baseada em valor (≤ R$2.500 não precisa de Diretoria)
- Usa `RESPONSAVEL_LABELS` para traduzir nomes → departamentos (hardcoded diferente)

### 3. `FluigDashboard.tsx` (dashboard antigo, ainda usado)
- Lógica **simplificada**: se tem `diretoria_conclusao` = aprovado, senão = pendente
- Ignora completamente `localizacao`, devoluções e regra de valor ≤ R$2.500
- Sem detecção de rejeição

## Inconsistências Concretas

| Aspecto | FluigStatusCard | PainelFluig | FluigDashboard |
|---|---|---|---|
| Fonte de verdade | `localizacao` | `localizacao` + `responsavel_atual` + `*_conclusao` | apenas `*_conclusao` |
| Regra R$≤2.500 | Não implementa | Implementa | Não implementa |
| Detecção de devolução | Sim (via eventos) | Sim (via estágio atual) | Não |
| Mapa de pessoas | `RESPONSAVEL_PROXIMA_ETAPA` | `RESPONSAVEL_LABELS` + `USER_FLUIG_ROLES` | Nenhum |
| Contagem de pendentes | N/A | `isFechado()` + `isCancelado()` | `!diretoria_conclusao` |

## Solução Proposta

Centralizar **toda** a lógica de status Fluig em `fluig-utils.ts`, criando funções compartilhadas que ambos os componentes usam.

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `src/lib/fluig-utils.ts` | Adicionar funções centralizadas: `isFluigFechado()`, `isFluigCancelado()`, `getFluigApprovalStatus()`, `formatResponsavelFluig()`, mapa unificado de pessoas |
| `src/pages/PainelFluig.tsx` | Substituir lógica local por chamadas às funções de `fluig-utils.ts` |
| `src/components/FluigStatusCard.tsx` | Substituir mapas locais por funções de `fluig-utils.ts` |
| `src/components/FluigDashboard.tsx` | Usar `isFluigFechado()` ao invés de checar apenas `diretoria_conclusao` |

### Detalhes Técnicos

**`fluig-utils.ts` — Novas funções centralizadas:**

```text
// Mapa unificado de pessoas → departamentos (substitui 3 mapas diferentes)
RESPONSAVEL_TO_DEPARTAMENTO: Record<string, string>
  - Laureane, Paloma, Roberta → 'Início'
  - Jonatas → 'Gerência de Facilities'
  - Kethli → 'Gerência Financeira'
  - Thiago → 'Diretoria'

// Regra de negócio: valor <= 2500 não precisa de Diretoria
isFluigFechado(snapshot): boolean
  - valor <= 2500: retorna true se gerencia_financeiro_conclusao preenchido
  - valor > 2500: retorna true se diretoria_conclusao preenchido

isFluigCancelado(snapshot): boolean
  - situacao inclui 'cancelado'/'cancelada'

// Status de cada aprovação considerando localização + valor
getFluigApprovalStatus(snapshot): {
  facilities: 'pending' | 'approved' | 'rejected' | 'in_progress',
  financeiro: 'pending' | 'approved' | 'rejected' | 'in_progress',
  diretoria: 'pending' | 'approved' | 'rejected' | 'not_required' | 'in_progress'
}

// Traduz responsavel_atual para nome de departamento
formatResponsavelFluig(responsavelAtual: string | null): string
```

**`PainelFluig.tsx` — Simplificação:**
- Remover `isFechado()`, `isCancelado()`, `RESPONSAVEL_LABELS`, `USER_FLUIG_ROLES` locais
- Usar `isFluigFechado()`, `isFluigCancelado()`, `getFluigApprovalStatus()`, `formatResponsavelFluig()` importados
- Remover a lógica complexa de ~60 linhas dentro do `.map()` da tabela (linhas 780-845) e substituir por uma chamada a `getFluigApprovalStatus(snapshot)`

**`FluigStatusCard.tsx` — Simplificação:**
- Remover `ETAPA_LABELS`, `RESPONSAVEL_PROXIMA_ETAPA`, `RESPONSAVEL_ETAPA_INDEX` locais
- Usar `formatResponsavelFluig()` e `getAprovacoesPorLocalizacao()` (já existente)

**`FluigDashboard.tsx` — Correção:**
- Stats `pendentes`/`aprovados` passam a usar `isFluigFechado()` ao invés de `!!diretoria_conclusao`
- Assim os números batem com o PainelFluig

