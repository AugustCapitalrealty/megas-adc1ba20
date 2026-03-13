

## Correção do banner "Aguardando Execução" + Lembrete NF para Backoffice

### 1. Banner condicional no card do solicitante

No `SolicitanteSolicitacaoCard.tsx` (linhas 122-130), alterar a lógica do banner `aguardando_execucao`:

| Condição | Banner | Cor | Subtexto |
|----------|--------|-----|----------|
| `data_execucao_servico < hoje` (estritamente menor) | SERVIÇO EXECUTADO | Verde/teal | "Aguardando validação do backoffice" |
| `data_execucao_servico >= hoje` (hoje ou futuro) | AGUARDANDO EXECUÇÃO | Amber | "Serviço agendado para DD/MM/AAAA" |

Importar `formatBR` de `@/lib/date-utils` para formatar a data.

---

### 2. Lembrete automático para backoffice solicitar NF (data futura)

Quando a data de execução do serviço chegar (ou passar), o backoffice precisa ser lembrado de cobrar a NF. Criar uma nova edge function `check-service-execution` que:

- Busca solicitações com `status = 'aguardando_execucao'` e `data_execucao_servico <= hoje`
- Verifica se já existe notificação recente (últimas 24h) para evitar duplicatas
- Cria notificação de alta prioridade para os usuários backoffice: "O serviço da solicitação #PROTOCOLO foi executado em DD/MM. Solicite a NF ao solicitante."

| Arquivo | Mudança |
|---------|---------|
| `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` | Banner condicional: `< hoje` → verde "SERVIÇO EXECUTADO"; `>= hoje` → amber "AGUARDANDO EXECUÇÃO" |
| `supabase/functions/check-service-execution/index.ts` | Nova edge function — busca OCs com serviço executado (data <= hoje) e notifica backoffice para cobrar NF |

### Lógica da edge function

```text
1. Buscar solicitações: status='aguardando_execucao', data_execucao_servico <= hoje
2. Para cada uma:
   a. Checar se já tem notificação "Solicitar NF" nas últimas 24h → skip
   b. Buscar user_ids de backoffice/admin
   c. Inserir notificação: tipo='action_required', prioridade='high'
      título: "📋 Solicitar NF — #PROTOCOLO"
      mensagem: "O serviço foi executado em DD/MM. Solicite a NF e boleto ao solicitante."
```

A function segue o mesmo padrão da `check-sla-alerts` existente (rate limit, CORS, service role key).

