

# Plano: Integracoes In-Context — Ver e Agir sem Sair da Tela

## Problema

Ao clicar numa solicitacao no Monitoramento, o modal `OCDetalhesModal` mostra timeline e documentos, mas e read-only. Se o usuario precisa enviar mensagem, justificar, aceitar OC ou enviar NF, precisa navegar para outra tela. Isso quebra o fluxo de trabalho.

## Solucao

Transformar o `OCDetalhesModal` num hub completo com acoes contextuais, e adicionar mensagens inline. O usuario ve tudo e age ali mesmo.

### 1. OCDetalhesModal — adicionar aba "Mensagens" e acoes contextuais

**Aba "Mensagens" (nova):**
- Adicionar 4a tab ao modal: "Mensagens"
- Reutilizar `SolicitacaoMessages` dentro da tab
- Timeline passa a usar `showMessages={false}` (ja faz isso), mensagens ficam na aba propria

**Acoes contextuais no header do modal:**
Baseado no status da solicitacao, exibir botoes de acao relevantes diretamente no modal:

| Status | Acao disponivel no modal |
|--------|--------------------------|
| `pendente_correcao` | Botao "Corrigir e Reenviar" → abre modal de edicao inline |
| `aguardando_aceite` | Botao "Aceitar OC" |
| `aguardando_nf_boleto` | Botao "Enviar NF/Boleto" |
| `oc_ac_emitida` (sem NF + dia >23) | Botao "Justificar" → abre JustificativaModal |
| `cancelamento_pendente` | Badge informativo |

A logica verifica `user_id === auth.uid()` para mostrar acoes apenas ao dono da solicitacao.

**Arquivos:** `src/components/monitoramento/OCDetalhesModal.tsx`

### 2. Monitoramento — clicar na row abre modal completo (ja funciona)

Ja existe: `onClick={() => setDetailRow(row)}`. O modal so precisa ser enriquecido (item 1 acima).

### 3. SolicitacaoTimeline — habilitar mensagens inline

Atualmente o modal passa `showMessages={false}`. Na nova aba "Mensagens" usamos `SolicitacaoMessages` diretamente, que ja tem input + envio.

### 4. Backoffice modal — mesmo padrao

O Backoffice ja tem detalhes expandidos. Adicionar `SolicitacaoMessages` na area de detalhes para que backoffice tambem possa trocar mensagens sem sair.

**Arquivo:** `src/pages/Backoffice.tsx` — na secao de detalhes expandidos, incluir componente de mensagens.

---

## Resumo

| Item | Arquivo | Mudanca |
|------|---------|---------|
| Modal enriquecido | OCDetalhesModal.tsx | +tab Mensagens, +botoes acao por status |
| Mensagens no Backoffice | Backoffice.tsx | +SolicitacaoMessages nos detalhes |
| Acoes inline | OCDetalhesModal.tsx | Aceitar OC, Enviar NF, Justificar — sem navegar |

**0 migrations.** ~3 arquivos editados. O usuario nunca mais precisa sair da tela para agir.

