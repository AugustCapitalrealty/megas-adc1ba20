

# Mensagens com alerta prioritário para o destinatário

## Problema
Quando o backoffice ou o solicitante envia uma mensagem na solicitação, a outra parte **não é notificada** e não vê nada de diferente. A mensagem fica escondida dentro do histórico/timeline, facilmente ignorada.

## Solução

### 1. Notificação automática ao enviar mensagem
Quando alguém envia uma mensagem via `SolicitacaoMessages` ou `SolicitacaoTimeline`, criar automaticamente uma entrada na tabela `notifications` para a outra parte:
- Se o remetente é o **solicitante** → notificar todos os **backoffice/admin**
- Se o remetente é **backoffice/admin** → notificar o **owner** da solicitação

A notificação terá `prioridade: 'high'`, `tipo: 'action_required'`, com link para a solicitação.

### 2. Banner de mensagens não lidas no card da solicitação
Adicionar uma coluna `lida` na tabela `solicitacao_mensagens` para rastrear leitura. Ao abrir/expandir uma solicitação, marcar mensagens como lidas.

No `MinhasSolicitacoes` e no `Backoffice`, exibir um **banner chamativo** no topo do card quando há mensagens não lidas:

```text
┌────────────────────────────────────────────┐
│ 💬 NOVA MENSAGEM  - João (Backoffice)      │
│ "Preciso do comprovante de endereço..."    │
│                           [Ver Mensagens]  │
├────────────────────────────────────────────┤
│ #2025-0042 — Contratação de serviço...     │
│ ...resto do card...                        │
└────────────────────────────────────────────┘
```

### 3. Marcar como lida ao visualizar
Quando o usuário expande o card ou abre o modal de detalhes, as mensagens não lidas daquela solicitação são marcadas como `lida = true`.

## Alterações

### Database Migration
```sql
-- Adicionar coluna lida à tabela de mensagens
ALTER TABLE public.solicitacao_mensagens 
  ADD COLUMN lida boolean DEFAULT false;

-- Índice para busca rápida de não lidas
CREATE INDEX idx_mensagens_nao_lidas 
  ON public.solicitacao_mensagens(solicitacao_id, lida) 
  WHERE lida = false;
```

### Arquivo: `src/components/SolicitacaoMessages.tsx`
- Após enviar mensagem, inserir notificação para a outra parte (buscar `user_id` da solicitação para saber quem notificar)
- Receber prop `solicitacaoUserId` para saber quem é o owner

### Arquivo: `src/components/SolicitacaoTimeline.tsx`
- Mesmo tratamento: ao enviar mensagem, criar notificação para a outra parte

### Arquivo: `src/pages/MinhasSolicitacoes.tsx`
- No fetch de solicitações, buscar também contagem de mensagens não lidas por solicitação
- Renderizar banner de mensagem não lida como `actionBanner` prioritário (acima de outros banners)
- Ao expandir card, chamar update para marcar mensagens como lidas

### Arquivo: `src/pages/Backoffice.tsx`
- Mesmo tratamento: buscar mensagens não lidas e exibir banner no card
- Marcar como lidas ao expandir

### Novo componente: `src/components/UnreadMessageBanner.tsx`
- Componente reutilizável que recebe a última mensagem não lida e renderiza o banner azul/roxo com preview da mensagem e botão "Ver Mensagens"

**1 migration, 1 novo componente, 4 arquivos editados.**

