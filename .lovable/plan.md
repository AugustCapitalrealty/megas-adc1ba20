

## Substituir Acompanhamento Jurídico por Card Projuris (estilo Fluig)

### Problema
Nas telas de detalhe da solicitação (Backoffice e Solicitante), o componente `JuridicoTracker` exibe etapas jurídicas genéricas que não refletem os dados reais do Projuris. O usuário quer substituí-lo por um card com informações do Painel Projuris, no mesmo estilo visual do `FluigStatusCard`.

### Solução

**Criar novo componente `ProjurisStatusCard`** — similar ao `FluigStatusCard`:
- Recebe `numeroProjuris: string` como prop
- Busca dados de `projuris_requisicoes` onde `numero_requisicao = numeroProjuris`
- Exibe:
  - Header: `Status Projuris #4010` + Badge de status (colorido) + link "Ver no Painel"
  - Data Requisição
  - Responsável
  - Tipo Requisição / Fornecedor
  - Tempo parado (aging badge)
  - Detalhes (colapsável se longo)

**Substituir `JuridicoTracker`** nos dois locais:
- `BackofficeModals.tsx` — trocar `JuridicoTracker` por `ProjurisStatusCard` quando `numero_projuris` existir
- `SolicitanteSolicitacaoCard.tsx` — mesmo comportamento

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/ProjurisStatusCard.tsx` | **Novo** — card estilo FluigStatusCard para dados Projuris |
| `src/components/backoffice/BackofficeModals.tsx` | Substituir `JuridicoTracker` por `ProjurisStatusCard` |
| `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` | Substituir `JuridicoTracker` por `ProjurisStatusCard` |

### Visual do card (referência: FluigStatusCard)

```text
┌─────────────────────────────────────────────────────┐
│ ⚖ Status Projuris #4010  [AGUARDANDO EXECUÇÃO]  Ver no Painel ↗ │
│ 📅 Requisição: 10/04/2026    ⏱ Parado: 4 dias                  │
│─────────────────────────────────────────────────────│
│ Responsável: Fulano    Tipo: Termo de Contratação   │
│ Fornecedor: Empresa X  Empreendimento: Mega Itajaí  │
└─────────────────────────────────────────────────────┘
```

### Detalhes técnicos
- Query: `supabase.from('projuris_requisicoes').select('*').eq('numero_requisicao', numeroProjuris).maybeSingle()`
- Aging: `differenceInDays(new Date(), new Date(data_ultimo_envio_aprovacao || data_requisicao))`
- Link "Ver no Painel": navegar para `/monitoramento-oc` com tab Projuris (ou simplesmente `Link` para a página)
- Status colors: reutilizar o mapa `STATUS_COLORS` já existente no Projuris
- Manter `JuridicoTracker` apenas quando NÃO houver `numero_projuris` (fallback para contratos sem vínculo Projuris)

