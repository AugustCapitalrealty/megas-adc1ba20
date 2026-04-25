## Objetivo

Adicionar uma nova seção "📅 Serviços Previstos para Hoje" no card do **Radar da Manhã** (notificação Google Chat), listando os serviços com `data_execucao_servico` igual ao dia atual, agora que o Calendário de Serviços existe.

## Contexto técnico

A função `supabase/functions/gchat-daily-digest/index.ts` é executada de manhã (Radar da Manhã) e à tarde (Pulso da Tarde). Ela já envia para múltiplos espaços do Google Chat (Backoffice, espaços por empreendimento e Coordenação/Gerência).

O Calendário de Serviços (`useCalendarioServicos.ts`) busca solicitações com:
- `tipo_entrega = 'servico'`
- `data_execucao_servico` no intervalo
- Status visual calculado (`agendado`, `atrasado`, `oc_enviada`, etc.)

## Mudanças

### 1. Nova seção no card (apenas no Radar da Manhã)

A seção só aparece quando `greeting.title === 'Radar da Manhã'` (não duplica no Pulso da Tarde, já que de manhã é o momento de planejar o dia).

Conteúdo da seção, por espaço:
- **Header**: `📅 SERVIÇOS PREVISTOS PARA HOJE (N)`
- Para cada serviço, um `decoratedText`:
  - **Top label**: empreendimento + protocolo (ex: `Mega Curitiba • 2025001234`)
  - **Text**: descrição truncada (60 chars) + valor formatado
  - **Bottom label**: fornecedor + status visual (ex: `Acme Ltda • Agendado` / `⚠️ Atrasado` / `OC enviada`)
  - **Ícone**: `EVENT_SEAT` para agendado, `CLOCK` para atrasado/aguardando NF
- Limite de **8 serviços** exibidos; se houver mais, adiciona linha `+ N outros — ver Calendário`
- Botão extra: `Ver Calendário` apontando para `${APP_URL}/monitoramento-oc?tab=calendario` (ou rota equivalente — confirmar)
- Se não houver serviços hoje: `<font color="muted">Nenhum serviço previsto para hoje.</font>`

### 2. Busca dos dados

No início do `Deno.serve`, após buscar `solicitacoes`, fazer uma query adicional escopada ao dia:

```ts
const { data: servicosHoje } = await supabase
  .from('solicitacoes')
  .select(`
    id, protocolo, status, cancelamento_pendente, empreendimento,
    valor, descricao, data_execucao_servico, tipo_entrega,
    fornecedor:fornecedores(razao_social, nome_fantasia)
  `)
  .eq('tipo_entrega', 'servico')
  .eq('data_execucao_servico', todayStr)
  .not('status', 'in', '(cancelado,rejeitado,concluida,enviado_pagamento,nf_boleto_enviados)');
```

Calcular o status visual usando a mesma lógica de `computeCalendarioVisual` (reimplementada inline na edge function — não dá para importar de `src/`).

### 3. Filtragem por espaço

- **Backoffice / Coordenação**: recebe todos os serviços do dia.
- **Espaços por empreendimento**: filtra `servicosHoje.filter(s => config.empreendimentos.includes(s.empreendimento))`.
- Se `filtered.length === 0` para o espaço, ainda mostra a linha "Nenhum serviço previsto" (mantém consistência visual).

### 4. Ordenação

Serviços ordenados por:
1. Atrasados primeiro (visual = `atrasado`)
2. Status crítico (`oc_nao_liberada`, `aguardando_nf`)
3. Restante por empreendimento + protocolo

### 5. Apenas no turno da manhã

Adicionar condicional: a seção é incluída em `sections` somente se `greeting.title === 'Radar da Manhã'`. À tarde, o card permanece igual ao atual.

## Arquivos modificados

- `supabase/functions/gchat-daily-digest/index.ts` — busca de serviços do dia, helper `computeCalendarioVisual` inline, nova função `buildServicosHojeSection`, e injeção condicional no array `sections` dentro de `buildDigestCard`. Assinatura de `buildDigestCard` ganha parâmetro `servicosHoje: any[]`.

Nenhuma mudança em schema do banco, RLS ou frontend.

## Resultado esperado

Toda manhã, cada espaço do Google Chat (incluindo Coordenação) receberá, junto do Radar da Manhã, a lista clara dos serviços previstos para o dia — com destaque visual para atrasados — e um botão direto para o Calendário.