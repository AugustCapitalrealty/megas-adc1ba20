## Diagnóstico UX/UI atual (o que li no código)

O módulo hoje tem 3 abas principais (Painel / Operação Mensal / Cadastros Base) com sub-abas, e telas muito densas: `MemoriaCalculoTab` (1.648 linhas), `FaturasTab` (1.233), `FaturaCopelTab` (997). Problemas concretos:

1. **Navegação em dois níveis** (Tabs dentro de Tabs) — o usuário perde o senso de "onde estou" e de progresso do fechamento. O passo atual só aparece no Painel.
2. **Competência**: seletor existe no Painel e repetido em cada aba; o contexto compartilhado já existe (`CompetenciaContext`), mas não há uma barra fixa mostrando "Competência 06/2026 • Rascunho" em todas as telas.
3. **Preenchimento da Fatura Copel**: lista de itens longa, sem agrupamento visual (Consumo / Demanda / Bandeiras / Encargos / Créditos), sem foco automático no próximo campo, sem colar de PDF/planilha, e o badge de diferença aparece só no fim.
4. **Lançamentos por módulo**: tabela editável com 6 sub-abas de colunas ("Demanda", "Consumo", "Tributos", "Completa"…). Não há indicação de quais módulos faltam, nem navegação por teclado tipo planilha (Tab/Enter/colar bloco), nem destaque de linhas incompletas ou fora do esperado.
5. **Faturas por Cliente**: blocos de auditoria (memória de cálculo, impostos, diferenças, multas) empilhados; muita informação simultânea, sem hierarquia entre "resultado" e "prova do resultado".
6. **Feedback de erro/validação**: diferenças e inconsistências aparecem como badges soltos, sem uma lista única de pendências acionáveis.
7. **Emojis nos títulos** (📄, 👥, ☀️) e cores/estilos ad hoc, fora do design system Mega (PageHeader, KpiCard, StatusPill, DataTable, FilterToolbar, StandardModal).

## Proposta de redesign

### A. Estrutura e navegação
- Substituir Tabs aninhadas por um **stepper horizontal persistente** no topo: `1 Fatura Copel → 2 Lançamentos → 3 Conferência → 4 Faturas`, com estado por passo (pendente / com alerta / ok) e navegação por clique.
- **Barra de competência fixa (sticky)** abaixo do PageHeader em todas as sub-telas: competência selecionada, status (Rascunho/Fechada), total Copel, botão "Fechar competência". Cadastros Base sai do fluxo mensal e vira uma entrada secundária (botão "Cadastros" no header), reduzindo o nível de abas para um só.
- Painel vira a **home do fechamento**: KPIs (Total Copel, Total faturado, Diferença, Multas), checklist de pendências clicáveis e histórico das últimas competências.

### B. Preenchimento (data entry)
- **Fatura Copel**: agrupar itens em seções colapsáveis (Consumo, Demanda, Bandeiras, Perdas/Encargos, Créditos/Débitos, Impostos) com subtotal por seção; barra de conferência **sticky no rodapé** com "Soma dos itens × Total a pagar × Diferença" sempre visível; campos monetários com máscara pt-BR, seleção do conteúdo ao focar, Enter avança para o próximo campo; ação "Colar da fatura" que aceita texto colado e pré-preenche itens reconhecidos, para revisão antes de aplicar.
- **Lançamentos**: comportamento de planilha — navegação por setas/Tab/Enter, colar bloco de células do Excel direto na tabela, coluna congelada com nome do módulo, linhas incompletas destacadas, chip "faltam N módulos" com filtro "somente pendentes", e indicador de autosave ("salvo às hh:mm") em vez de salvamento silencioso.
- Substituir as 6 sub-abas de colunas por um **seletor de visão** (Essencial / Completa) + menu de colunas, com preferência lembrada por usuário.

### C. Visualizações
- **Nova aba "Conferência"** (entre Lançamentos e Faturas), reunindo o que hoje está espalhado: Copel × Soma dos módulos (kWh ponta/fora, demanda, R$), perdas técnicas com % e memória, multas de ultrapassagem, créditos fotovoltaicos e a diferença residual — cada divergência com link direto ao campo de origem.
- **Faturas por Cliente**: cartão de resultado por cliente (total, variação vs. mês anterior, status) com "ver memória de cálculo" em drawer lateral, em vez de blocos empilhados na página. Mantém a tabela de diferenças e multas em abas internas do drawer.
- Gráficos leves e úteis: composição do valor faturado (consumo / demanda / perdas / bandeira / impostos) e evolução mensal por cliente.
- Estados vazios e de carregamento consistentes (skeletons em vez de spinner central).

### D. Design system
- Migrar títulos com emoji para ícones lucide + tokens semânticos; usar PageHeader, KpiCard, StatusPill, DataTable, FilterToolbar e StandardModal em todo o módulo; remover cores hardcoded.

## Validação PM/PO

- **Objetivo**: reduzir o tempo de fechamento mensal e eliminar retrabalho por divergência não detectada.
- **Critérios de aceite**: (1) qualquer divergência > R$1,00 aparece na aba Conferência com link para a origem; (2) é possível fechar a competência sem trocar de aba mais de 4 vezes; (3) colar dados do Excel preenche os lançamentos sem digitação campo a campo; (4) competência selecionada é única e visível em 100% das telas; (5) nenhum número muda de valor — só a apresentação.
- **Riscos**: mudança de navegação exige reaprendizado; a colagem de PDF/Excel depende de formato — entra como assistida, com revisão obrigatória antes de aplicar.
- **Fora de escopo**: nenhuma alteração nas fórmulas de cálculo, no schema do banco ou nas regras de rateio já validadas contra a planilha 06/2026.

## Sequência de execução
1. Barra de competência sticky + stepper (RateioEnergiaTab, CompetenciaContext).
2. Redesign do Painel com KPIs e checklist acionável.
3. Fatura Copel: seções, rodapé de conferência, máscaras e navegação por teclado.
4. Lançamentos: modo planilha, colagem em bloco, filtro de pendentes, autosave visível.
5. Nova aba Conferência (realoca blocos hoje em FaturasTab).
6. Faturas por Cliente: cartões + drawer de memória de cálculo.
7. Passe final de design system e estados vazios/skeleton.
