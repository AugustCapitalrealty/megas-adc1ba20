

# Plano: Justificativas pendentes no card de Acoes Pendentes do Dashboard

## Objetivo

Adicionar uma nova categoria "Justificativas OC" no card de Acoes Pendentes do Dashboard. Mostra OCs do empreendimento do usuario que precisam de justificativa (dia >= 23, sem NF, sem previsao). Destaque visual para as que o usuario e o proprio solicitante.

## Alteracoes

### 1. `src/hooks/useDashboardMetrics.ts`

Adicionar uma segunda query para buscar OCs que precisam de justificativa:
- Query em `documentos_emitidos` com join em `solicitacoes` (tipo_documento = 'OC')
- Filtrar: status != 'concluida', natureza_orcamentaria not in ('agua', 'energia_eletrica')
- Filtrar por empreendimentos do usuario
- Verificar se nao tem NF associada e nao tem previsao_nf em `oc_acompanhamento`
- Calcular `pendingJustificativas` (total do empreendimento) e `pendingJustificativasOwn` (onde user_id = usuario logado)
- Retornar ambos no objeto de metricas

### 2. `src/components/PendingActionsCard.tsx`

- Adicionar novo tipo `justificativa_oc` na interface
- Receber props `pendingJustificativas` e `pendingJustificativasOwn`
- Renderizar botao com icone `CalendarDays`, cor amber/laranja
- Texto: "Justificativas OC (X)" -- se houver proprias, adicionar badge "Y suas" com destaque
- Ao clicar, navegar para `/monitoramento-oc?status=pendente_justificativa`

### 3. `src/pages/Dashboard.tsx`

- Passar as novas props para `PendingActionsCard`

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useDashboardMetrics.ts` | Query para contar OCs pendentes de justificativa por empreendimento e proprias |
| `src/components/PendingActionsCard.tsx` | Novo tipo justificativa_oc com destaque para proprias |
| `src/pages/Dashboard.tsx` | Passar novas props |

