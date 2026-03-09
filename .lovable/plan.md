

## Adicionar mini-timeline de duração por etapa no modal de detalhes do Backoffice

O componente `StageDurationTimeline` já existe em `src/components/monitoramento/StageDurationTimeline.tsx` e já é usado no `OCDetalhesModal`. Falta apenas integrá-lo no modal de detalhes do Backoffice (`BackofficeModals.tsx`).

### Mudança

**`src/components/backoffice/BackofficeModals.tsx`**
- Importar `StageDurationTimeline` de `@/components/monitoramento/StageDurationTimeline`
- Renderizar o componente logo antes da seção "Histórico" (linha ~713), passando `detalhes.historico`, `detalhes.solicitacao.created_at` e `detalhes.solicitacao.status`
- O componente já calcula automaticamente a duração em cada status e exibe barras proporcionais com formatação de tempo

Nenhuma alteração de banco de dados necessária. Apenas 1 arquivo editado.

