

## Correções Google Chat: API 404, Saudação, Anexo OC

### Diagnóstico

**1. API retorna 404 → fallback para webhook**
Os logs mostram: `GChat API failed [404]: Not Found`. Isso indica que o secret `GCHAT_SPACE_NAME` está com valor incorreto. O formato correto deve ser `spaces/AAQAdpI7TfI` (sem barra final, sem `/messages`). Vou solicitar a reconfiguração do secret.

**2. Saudação "O dia encerra com" aparece em todos os horários**
No código atual (linha 132), apenas o bloco `else` (quando há itens urgentes) usa "O dia encerra com", independente do horário. Preciso adaptar a frase introdutória para cada período:
- Manhã: "iniciamos com"
- Tarde: "seguimos com"  
- Noite: "encerramos com"

**3. Anexo da OC só funciona nos minutos iniciais**
O `createSignedUrl` gera uma URL com validade de 1h (3600s). Depois disso o link expira. Vou aumentar para **24h** (86400s) e adicionar uma nota visual no card quando o link estiver presente.

### Plano de Implementação

**Passo 1 — Corrigir `GCHAT_SPACE_NAME`**
- Solicitar que o usuário informe o Space Name correto
- Recadastrar o secret via `add_secret`
- O formato deve ser exatamente `spaces/AAQAdpI7TfI`

**Passo 2 — Corrigir saudação dinâmica no `gchat-daily-digest`**
- Alterar `getGreeting()` para retornar também um verbo contextual
- Manhã → "Bom dia! Iniciamos com **X solicitações ativas**..."
- Tarde → "Boa tarde! Seguimos com **X solicitações ativas**..."
- Noite → "Boa noite! Encerramos com **X solicitações ativas**..."
- Sem urgentes: adaptar igualmente ("sem prioridades imediatas")

**Passo 3 — Aumentar validade do link do PDF (OC)**
- Em `gchat-notify-oc`: trocar `createSignedUrl(path, 3600)` para `createSignedUrl(path, 86400)` (24h)
- Adicionar texto no botão indicando validade: "📄 Baixar PDF (24h)"

**Passo 4 — Atualizar card de teste (`gchat-send-test`)**
- Melhorar layout: centralizar elementos, usar cores consistentes
- Mostrar claramente qual método foi usado (API vs Webhook)
- Incluir diagnóstico: se API falhou, mostrar o motivo no card

**Passo 5 — Redeploy e teste**
- Deploy das 3 edge functions atualizadas
- Testar via botão no Admin

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Secret `GCHAT_SPACE_NAME` | Recadastrar com valor correto |
| `supabase/functions/gchat-daily-digest/index.ts` | Saudação dinâmica por horário |
| `supabase/functions/gchat-notify-oc/index.ts` | Signed URL 24h |
| `supabase/functions/gchat-send-test/index.ts` | Layout melhorado + diagnóstico |

