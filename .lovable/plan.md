# SLA de Contratos: categorias + detalhamento do contrato

Hoje a tela `/contratos` tem duas abas: "Todos os contratos" (tabela) e "Gerador" (painel de escopo). O objetivo é generalizar: **toda categoria** ganha a visão do Gerador, e a lista vira o ponto de entrada para o **detalhamento de cada contrato**.

## 1. Estrutura da tela

```text
/contratos
  [ Visão geral ]   [ Por categoria ]
```

**Visão geral** — o que hoje é "Todos os contratos": KPIs, filtros e a tabela dos 29 contratos. Cada linha passa a ser clicável e leva ao detalhamento do contrato.

**Por categoria** — o painel do Gerador, agora com um seletor de categoria no topo (GERADOR, MOTOBOMBA A DIESEL, COBERTURA, ELÉTRICA, PPCI, CONTROLE DE PRAGAS, CONSULTORIA AMBIENTAL, ROÇADA, LIMPEZA E CONSERVAÇÃO, PORTARIA, SEGURANÇA E VIGILÂNCIA). Para a categoria escolhida:
- Cards dos contratos por Mega (fornecedor, nº, vigência, quantidade/unidade, valor total e por unidade, reajuste, situação, nº de itens de escopo).
- Tabela de escopo do contrato selecionado, com busca e filtros de Tipo e Frequência.
- Modo "Comparar Megas" (matriz de cobertura escopo × Mega).
- Categorias sem escopo cadastrado (Limpeza, Portaria, Segurança, Motobomba) mostram estado vazio explicando que só os dados contratuais existem por enquanto.

A categoria e o contrato ativos ficam na URL (`?aba=categoria&cat=...&contrato=...`) para poder compartilhar o link.

## 2. Detalhamento do contrato (nova rota `/contratos/:id`)

Página completa de um contrato, alcançada pela tabela ou pelos cards da categoria:
- **Cabeçalho**: categoria, Mega, fornecedor, nº do contrato, pill de situação e dias para vencer.
- **Blocos de dados**: vigência (início, prazo em meses, fim/indeterminado), comercial (quantidade × unidade, valor do contrato, valor por unidade, índice e mês de reajuste) e observações.
- **Escopo e SLA**: tabela dos itens do contrato (Escopo, Item, Tipo, Frequência, SLA, Observação) com busca e filtros, e KPIs de "itens com SLA definido" vs. total.
- **Cobertura entre Megas**: comparação com os contratos irmãos da mesma categoria, destacando itens que os outros Megas contemplam e este não.

## 3. Preenchimento futuro do SLA

Nesta etapa a base já fica pronta para edição: quem tiver papel **Editor/Gestor** em Contratos vê, em cada linha de escopo do detalhamento, um campo de SLA editável (horas) que grava em `contrato_escopos.sla_horas`, com confirmação e atualização da lista. Leitores veem apenas o valor. Hoje só 15 dos 327 itens têm SLA, então o indicador de preenchimento por contrato ajuda a acompanhar a evolução.

## Detalhes técnicos

- `GeradorPanel.tsx` vira `CategoriaPanel.tsx`, recebendo `categoriaId` por prop e consultando `contratos` + `contrato_escopos` da categoria; a aba passa o valor do seletor.
- Nova rota `/contratos/:id` em `App.tsx` com o mesmo guard de app (`contratos`) usado hoje, e breadcrumb em `AppBreadcrumbs`.
- Edição de SLA: `update` em `contrato_escopos` com invalidação de query via React Query; visibilidade controlada pelo papel do app já exposto no `useAuth`.
- Reuso dos componentes canônicos (PageHeader, KpiCard, StatusPill, DataTable, FilterToolbar) e de `contratos-utils.ts`; datas via `formatBR`.
- Sem migração de banco — a planilha enviada não é importada nesta etapa. Se quiser atualizar a base com essa versão do arquivo, faço em seguida.