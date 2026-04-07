

## Google Chat Bot: Endpoint de Gatilho + Resposta a Mensagens

### Problema

1. **Bot não responde** — Não existe nenhuma edge function para receber eventos do Google Chat (mensagens, menções). Quando o usuário envia "oi" ao bot, o Google Chat tenta entregar o evento na URL do gatilho, mas não há nada lá para processar.

2. **URL do gatilho** — A URL genérica que você colocou (`https://webhook.site`) precisa ser substituída pela URL da edge function que vamos criar.

### URL correta para o gatilho

Após criar a function, a URL será:

```
https://wcxybuietfmaaqzmcmnq.supabase.co/functions/v1/gchat-webhook
```

Essa é a URL que você deve colar no campo "URL do endpoint HTTP" na configuração do app no Google Cloud Console.

### O que será criado

**Nova edge function `gchat-webhook`** que:

1. Recebe eventos POST do Google Chat (mensagens, adição a espaços, remoção)
2. Responde a mensagens dos usuários com informações úteis:
   - Saudação automática quando adicionado a um DM
   - Comando de consulta de protocolo (ex: usuário digita "12345" e recebe status)
   - Mensagem padrão para textos não reconhecidos
3. Retorna JSON válido ao Google Chat (resposta síncrona — o Google Chat espera resposta no corpo da requisição)

**Lógica principal:**

| Evento | Resposta |
|--------|----------|
| `ADDED_TO_SPACE` (DM) | Card de boas-vindas: "Olá! Sou o Bot Megas..." |
| `MESSAGE` com número | Consulta `solicitacoes` por protocolo e retorna status |
| `MESSAGE` texto livre | Resposta padrão com instruções de uso |
| `REMOVED_FROM_SPACE` | Sem resposta (log apenas) |

**Importante sobre JWT:** O Google Chat envia um bearer token no header que pode ser verificado opcionalmente. Para simplificar, a function será configurada com `verify_jwt = false` no `config.toml` (já é o padrão do Lovable Cloud).

### Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/gchat-webhook/index.ts` | Criar — handler de eventos do Google Chat |
| `supabase/config.toml` | Adicionar bloco `[functions.gchat-webhook]` com `verify_jwt = false` |

### Após implementação

1. Deploy automático da function
2. Você cola a URL `https://wcxybuietfmaaqzmcmnq.supabase.co/functions/v1/gchat-webhook` no campo de gatilho do Google Cloud Console
3. Envia "oi" ao bot para testar — deve receber resposta imediata

