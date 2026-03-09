

## Análise PM — Oportunidades de Melhoria

Após revisar o codebase completo, identifiquei as seguintes oportunidades organizadas por impacto e esforço:

---

### 1. Visibilidade do tempo em cada etapa (alto impacto)

**Problema**: O backoffice e o solicitante não têm visibilidade clara de quanto tempo a solicitação ficou em cada status. Existe SLA badge mas não há um resumo consolidado.

**Solução**: Adicionar um mini-timeline de duração por etapa no modal de detalhes — ex: "Recebido → Aprovado: 2 dias | Aprovado → OC Emitida: 1 dia | Total: 5 dias".

---

### 2. Reabertura de solicitação concluída (médio impacto)

**Problema**: Uma vez concluída, não há como reabrir uma solicitação se houver problema pós-conclusão (ex: NF com erro, fornecedor não entregou).

**Solução**: Adicionar botão "Reabrir" em solicitações concluídas, com motivo obrigatório, voltando para status `liberado_fornecedor`.

---

### 3. Comentários internos do backoffice (alto impacto)

**Problema**: As mensagens na timeline são visíveis para o solicitante. O backoffice não tem um canal interno para anotar observações que só a equipe veja.

**Solução**: Adicionar flag `interno: boolean` nas mensagens. Mensagens internas aparecem só para backoffice/admin com visual diferenciado (fundo amarelo, ícone de cadeado).

---

### 4. Dashboard de produtividade individual (médio impacto)

**Problema**: O contador "processadas hoje" é volátil (reseta ao recarregar). Não há histórico de produtividade por analista.

**Solução**: Card no Dashboard mostrando "Suas ações esta semana" com contagem por tipo (assumidas, OCs emitidas, concluídas), usando dados do `historico_solicitacoes`.

---

### 5. Notificação de SLA prestes a estourar (alto impacto)

**Problema**: O SLA badge mostra quando já estourou, mas não alerta proativamente o backoffice antes de estourar.

**Solução**: Notificação push/toast automática quando uma solicitação atinge 80% do tempo de SLA (ex: 4 de 5 dias úteis), aparecendo no sino de notificações.

---

### Recomendação de priorização

| # | Melhoria | Impacto | Esforço |
|---|----------|---------|---------|
| 3 | Comentários internos | Alto | Médio |
| 5 | Alerta SLA proativo | Alto | Médio |
| 1 | Tempo por etapa | Alto | Baixo |
| 4 | Produtividade individual | Médio | Baixo |
| 2 | Reabertura de concluída | Médio | Baixo |

Qual dessas melhorias você gostaria de implementar primeiro? Ou prefere atacar mais de uma?

