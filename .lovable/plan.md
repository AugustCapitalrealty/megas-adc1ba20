
## Diagnóstico confirmado pelas prints + logs

As prints ajudam bastante e fecham o diagnóstico:

1. **O link do gatilho já está chegando no endpoint certo**  
   A tela de configuração está usando o endpoint HTTP do bot e os logs mostram chamadas reais chegando em `gchat-webhook`. Então **não é mais um problema de URL**.

2. **O payload real não está no formato que o webhook espera hoje**  
   O código atual lê:
   - `body.type`
   - `body.message`
   - `body.user`
   - `body.space`

   Mas os logs mostram que o Google Chat está enviando algo neste formato:
   ```text
   {
     commonEventObject: ...,
     authorizationEventObject: ...,
     chat: {
       user: ...,
       eventTime: ...,
       messagePayload: ...
     }
   }
   ```
   Ou seja: o evento vem dentro de `chat.*`, não na raiz.

3. **Por isso o bot cai no fallback com evento “vazio”**  
   Hoje ele normaliza `type=`, `space=`, `user=` porque está olhando no lugar errado.

4. **Como o Chat recebe uma resposta que não bate com o fluxo esperado, ele mostra “Megas Bot não está respondendo”**  
   Então o foco agora é **compatibilidade com o payload real do Google Chat**.

## Plano de correção

### 1. Ajustar o parser do webhook para o formato real do Google Chat
Atualizar `supabase/functions/gchat-webhook/index.ts` para aceitar os dois formatos:

**Formato atual já suportado**
```text
type / message / user / space
```

**Formato real visto nos logs**
```text
chat.messagePayload
chat.addedToSpacePayload
chat.removedFromSpacePayload
chat.buttonClickedPayload
chat.user
chat.space
```

Mapeamento planejado:
- `MESSAGE` quando existir `chat.messagePayload`
- `ADDED_TO_SPACE` quando existir `chat.addedToSpacePayload`
- `REMOVED_FROM_SPACE` quando existir `chat.removedFromSpacePayload`
- `CARD_CLICKED` quando existir `chat.buttonClickedPayload`

### 2. Extrair texto da mensagem do local correto
Além de `body.message?.argumentText` e `body.message?.text`, passar a ler também:
- `body.chat?.messagePayload?.message?.argumentText`
- `body.chat?.messagePayload?.message?.text`

Também vou normalizar:
- e-mail do usuário via `body.chat?.user?.email`
- space via `body.chat?.space?.name` ou payload específico do evento

### 3. Fazer um primeiro retorno síncrono mais seguro
Para tirar o bot do estado de “não está respondendo”, o caminho mais seguro é:

- primeiro garantir que **“oi”** e **“ajuda”** respondam com **texto simples**
- depois manter/reativar os cards para welcome e protocolo

Isso reduz o risco de o problema também envolver formato de card na resposta síncrona.

### 4. Preservar o fluxo de protocolo
Depois da normalização:
- `oi`, `olá`, `ajuda` → resposta imediata
- número de protocolo → consulta em `solicitacoes`
- texto não reconhecido → ajuda curta e objetiva

### 5. Melhorar logs apenas no ponto certo
Manter logs úteis para validar:
- estrutura detectada
- tipo normalizado
- texto extraído
- fluxo executado

Sem depender de tentativa manual no escuro.

## Arquivo principal a ajustar

- `supabase/functions/gchat-webhook/index.ts`

## O que não precisa mudar agora

- `supabase/config.toml` já está adequado para o webhook
- o **link do gatilho** não precisa ser trocado novamente se ele continuar apontando para:
  ```text
  https://wcxybuietfmaaqzmcmnq.supabase.co/functions/v1/gchat-webhook
  ```

## Resultado esperado após a correção

- enviar **“oi”** no DM deixa de mostrar “Megas Bot não está respondendo”
- o bot responde imediatamente
- consultas por protocolo passam a funcionar no DM
- a base fica pronta para o próximo passo: **DMs individuais por empreendimento**

## Observação técnica importante

Pelas evidências, seu app está recebendo o formato de evento de **HTTP endpoint do Google Chat com payload aninhado em `chat.*`**. Então a correção correta não é trocar a URL — é **adaptar o webhook para esse contrato real de evento**.
