

## Correção: Bot não responde + Encontrar outros usuários

### Problema 1: "Megas Bot não está respondendo"

Os logs confirmam que o webhook processa tudo corretamente:
```
type=MESSAGE, text="oi" → Flow: welcome
```

Mas o Google Chat rejeita a resposta. O motivo provável: **o formato `cardsV2` não é aceito como resposta síncrona em HTTP endpoint apps**. A resposta precisa ser texto simples ou um formato mais básico.

**Solução:** Trocar TODAS as respostas do webhook para **texto simples** primeiro. Depois de confirmar que funciona, evoluir para cards se necessário.

Respostas planejadas:
- **"oi" / "ajuda"** → texto com instruções
- **protocolo** → texto formatado com status
- **não reconhecido** → texto de ajuda curta

### Problema 2: Como encontrar outros usuários (Jonatas, etc.)

A função `sendGChatDM` já funciona por e-mail. O fluxo:
1. Cada pessoa abre o Google Chat → pesquisa "Megas Bot" → clica para adicionar
2. Isso cria um espaço de DM entre o bot e a pessoa
3. Depois, basta chamar a function com o e-mail da pessoa

**Não precisa saber IDs manualmente.** Basta saber o e-mail.

Para facilitar, vou adicionar ao Admin um campo para enviar DM de teste para qualquer e-mail.

### Mudanças

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/gchat-webhook/index.ts` | Trocar `cardsV2` por respostas em texto simples |

### Resposta para "oi" (nova):
```
👋 Olá! Sou o Bot Megas — assistente de solicitações.

📋 Consultar protocolo: digite o número (ex: 2025000001)
📊 Resumos automáticos: 09h e 13h
🔔 Alertas: OC emitida, correção solicitada

🔗 Abrir sistema: https://megas.lovable.app
```

### Resposta para protocolo (nova):
```
📋 Protocolo 2025000123
📌 Tipo: Serviço — Mega Curitiba
📊 Status: ✅ Em lançamento
💰 Valor: R$ 15.000,00
📅 Criada em: 08/04/2026

🔗 Ver detalhes: https://megas.lovable.app
```

### Próximo passo para DMs em massa

Depois que confirmar que o webhook responde:
1. Pedir para Jonatas e demais adicionarem o Bot Megas no Google Chat
2. Integrar o resumo diário para enviar DM individual por empreendimento usando os e-mails do banco

