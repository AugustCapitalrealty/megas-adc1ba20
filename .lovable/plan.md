

## Análise PO — Oportunidades de Melhoria

Após revisar extensivamente o codebase (Dashboard, MinhasSolicitacoes, Backoffice, NovaSolicitacao, MonitoramentoOC, Notificacoes, DashboardSLA, DashboardEficiencia, GarantiasVigentes), identifiquei as seguintes oportunidades:

---

### 1. Favoritar / fixar solicitações (alto impacto, baixo esforço)

**Problema**: Solicitantes e backoffice não têm como marcar solicitações importantes para acesso rápido. Quem acompanha 50+ itens perde tempo buscando os mesmos processos repetidamente.

**Solução**: Estrela/pin em cada card de solicitação. Favoritos aparecem no topo da lista e opcionalmente no Dashboard como seção "Fixadas". Persistido em tabela `user_favorites(user_id, solicitacao_id)`.

---

### 2. Exportação consolidada com filtros aplicados (médio impacto, baixo esforço)

**Problema**: O Backoffice já tem export Excel, mas MinhasSolicitacoes não. Além disso, nenhuma tela exporta com os filtros ativos — sempre exporta tudo.

**Solução**: Botão "Exportar" nas telas MinhasSolicitacoes e MonitoramentoOC que respeite busca, aba e filtros ativos. Reutilizar `exportToExcel` já existente.

---

### 3. Resumo automático de atividade recente por solicitação (alto impacto, médio esforço)

**Problema**: Ao abrir uma solicitação no Backoffice, o analista precisa ler toda a timeline para entender o contexto. Não há um resumo rápido do que aconteceu recentemente.

**Solução**: Card "Últimas atividades" no topo do modal de detalhes, mostrando as 3 últimas ações (status change, mensagem, documento) em formato compacto com timestamp relativo. Dados já existem em `historico_solicitacoes` e `solicitacao_mensagens`.

---

### 4. Agrupamento por fornecedor no Backoffice (médio impacto, baixo esforço)

**Problema**: Analistas frequentemente processam várias solicitações do mesmo fornecedor em sequência (ex: gerar OCs em lote). Não há como agrupar ou filtrar por fornecedor.

**Solução**: Adicionar filtro por fornecedor (select com busca) na barra de filtros do Backoffice. Os dados de `fornecedor_razao_social` já são carregados.

---

### 5. Indicador de "tempo parado" visível na listagem (alto impacto, baixo esforço)

**Problema**: Na lista de solicitações (tanto solicitante quanto backoffice), não é visível há quanto tempo o item está no status atual. O `TimeInStatusBadge` existe mas aparece só em detalhes expandidos.

**Solução**: Mostrar um badge discreto com "há X dias" no card compacto (não expandido), com cor progressiva (cinza < 2d, amarelo 2-4d, vermelho > 4d). O campo `data_ultimo_status` já existe.

---

### 6. Notificações com ações inline (alto impacto, médio esforço)

**Problema**: As notificações no sino são somente informativas — o usuário precisa navegar até a solicitação para tomar ação. Cliques extras reduzem a taxa de resposta.

**Solução**: Para notificações do tipo `action_required`, exibir botão de ação direta no dropdown (ex: "Ver correção", "Aceitar OC") que leva direto à solicitação com o modal/ação aberta.

---

### Recomendação de priorização

| # | Melhoria | Impacto | Esforço | ROI |
|---|----------|---------|---------|-----|
| 5 | Tempo parado na listagem | Alto | Baixo | Muito alto |
| 1 | Favoritar solicitações | Alto | Baixo | Alto |
| 3 | Resumo de atividade recente | Alto | Médio | Alto |
| 6 | Notificações com ações inline | Alto | Médio | Alto |
| 2 | Exportação com filtros | Médio | Baixo | Médio |
| 4 | Filtro por fornecedor | Médio | Baixo | Médio |

Qual dessas melhorias você gostaria de implementar? Pode escolher uma, várias ou todas.

