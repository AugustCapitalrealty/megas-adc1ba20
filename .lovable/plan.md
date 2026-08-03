# Aba "Gerador" no SLA de Contratos

Nova aba dedicada à categoria GERADOR, com os 3 contratos (Mega Curitiba, Itajaí, Esteio) e os 86 itens de escopo já carregados no banco.

## Navegação

- Novo item **Gerador** na barra do app SLA de Contratos (`Início` · `Gerador`), rota `/contratos/gerador`, protegida por `RequireApp app="contratos"`.
- Breadcrumb "Gerador".

## Tela `/contratos/gerador`

1. **Cabeçalho** — título "Gerador", descrição curta e KPIs: contratos vigentes / a vencer / vencidos, total de equipamentos e total de itens de escopo.
2. **Cards dos contratos** — um card por Mega: fornecedor, nº do contrato, vigência (início → fim ou indeterminado), quantidade de geradores, valor do contrato e por equipamento, índice/mês de reajuste e pill de situação (mesma regra da lista: vencido, a vencer em 90 dias, vigente, indeterminado).
3. **Escopo** — abaixo dos cards, tabela dos itens do contrato selecionado (seleção pelo card ou por um seletor de Mega), com colunas Escopo, Item, Tipo, Frequência, SLA (horas, quando houver) e Observação. Busca por texto e filtros de Tipo e Frequência.
4. **Comparativo entre Megas** (opcional na mesma tela, via alternador "Por contrato" / "Comparar") — lista única de escopos com uma coluna por Mega marcando quem contempla o item, útil para ver lacunas de cobertura.
5. Estados de carregamento, erro e vazio no padrão do app.

## Detalhes técnicos

- Nova página `src/pages/contratos/GeradorContratos.tsx` usando PageContainer, PageHeader, KpiCard, StatusPill, FilterToolbar e DataTable.
- Consulta: `contratos` filtrados pela categoria com slug/nome GERADOR + `contrato_escopos` (`ativo = true`) ordenados por `ordem`.
- Reaproveito a função de situação/formatação de moeda da lista extraindo-a para `src/lib/contratos-utils.ts` para evitar duplicação.
- Rota em `src/App.tsx`, item em `src/lib/hub-nav.ts`, rótulo em `AppBreadcrumbs`.
- Somente leitura nesta etapa (sem edição de escopo).

## Sobre o arquivo enviado

A planilha nova (`...MEGAS-2.xlsx`) não será importada nesta etapa — a tela usa os dados já no banco. Se quiser atualizar a base com essa versão, faço em seguida.
