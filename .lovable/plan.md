# ✅ Plano Concluído: Modificações v2

## Resultado

| # | Mudança | Status |
|---|---------|--------|
| 1 | Evidência (foto) para serviço no passado → não obrigatória | ✅ |
| 2 | Cliente "Módulo Vago" adicionado em todos os Megas | ✅ |
| 3 | Empreendimento "Mega Canoas" criado (enum, rateio, fluig) | ✅ |
| 4 | Rateio seletivo — solicitante escolhe condomínios | ✅ |
| 5 | Cancelamento sempre via aprovação do Backoffice | ✅ |

## Detalhes Técnicos

### Migrações SQL
- `ALTER TYPE empreendimento ADD VALUE 'mega_canoas'`
- `INSERT INTO rateio_configuracao (mega_canoas, area_m2=0)`
- `user_can_view_fluig_empreendimento` atualizada com `mega_canoas`

### Dados inseridos
- Cliente "Módulo Vago" (ID: 83739dae) vinculado a mega_curitiba, mega_itajai, mega_esteio, mega_canoas

### Arquivos modificados
- `src/types/index.ts` — tipo Empreendimento + labels
- `src/pages/Admin.tsx` — array EMPREENDIMENTOS
- `src/components/RateioPreview.tsx` — checkboxes seletivos + mega_canoas
- `src/components/nova-solicitacao/types.ts` — FormState + FormSetters
- `src/hooks/useNovaSolicitacaoForm.ts` — estado rateioEmpreendimentosSelecionados
- `src/components/nova-solicitacao/steps/DescricaoStep.tsx` — props do RateioPreview
- `src/components/solicitante/SolicitanteModals.tsx` — evidência opcional + cancelamento unificado
- `src/pages/MinhasSolicitacoes.tsx` — handleCancelar sempre via backoffice
