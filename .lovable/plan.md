

## Enviar DM do Bot para Usuário via Google Chat API

### Como funciona

A Google Chat API permite que o bot **crie um espaço de DM** com qualquer usuário do domínio e envie mensagens diretamente. O fluxo é:

1. `POST /v1/spaces:setup` — cria (ou recupera) o DM entre o bot e o usuário
2. `POST /v1/{spaceName}/messages` — envia a mensagem nesse DM

### O que será feito

**1. Nova edge function `gchat-send-dm`**
- Recebe `email` e `message` (texto ou card) no body
- Usa a Service Account já configurada para autenticar
- Chama `spaces:setup` com o e-mail do usuário para obter o space de DM
- Envia a mensagem nesse space
- Retorna sucesso/erro

**2. Atualizar `gchat-auth.ts`**
- Adicionar função `sendGChatDM(email, message)` que encapsula o fluxo de setup + envio
- Reutiliza o mesmo token de acesso já cacheado

**3. Teste imediato**
- Após deploy, chamar a function passando `guilherme.marques@capitalrealty.com.br` para validar que o DM chega

### Pré-requisito importante

O scope `chat.bot` já permite enviar DMs para usuários que **têm o app instalado** (ou seja, que já adicionaram o Bot Megas no Google Chat). Se o Guilherme ainda não adicionou o bot, ele precisa:
1. Abrir Google Chat → Pesquisar "Megas Bot" → Clicar para iniciar conversa

Após isso, o bot pode enviar DMs proativamente a qualquer momento.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/_shared/gchat-auth.ts` | Adicionar `sendGChatDM(email, message)` |
| `supabase/functions/gchat-send-dm/index.ts` | Criar — endpoint para envio de DM |

### Uso futuro

Com essa base pronta, o resumo diário poderá enviar DM individual por empreendimento: consultar `user_empreendimentos` → para cada usuário com e-mail, chamar `sendGChatDM(email, resumoDoEmpreendimento)`.

