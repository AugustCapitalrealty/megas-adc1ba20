# Aba "Gerador" dentro do SLA de Contratos

Na própria página `/contratos`, adicionar abas no topo do conteúdo:

```text
[ Todos os contratos ]  [ Gerador ]
```

Sem nova rota no menu do app — é uma aba interna da tela de contratos (a URL guarda a aba ativa em `?aba=gerador` para poder compartilhar o link).

## Aba "Todos os contratos"

Exatamente o que existe hoje: KPIs, filtros e a tabela dos 29 contratos.

## Aba "Gerador"

Mostra somente a categoria GERADOR (3 contratos: Mega Curitiba, Itajaí e Esteio) e seus 86 itens de escopo.

1. **Cards dos contratos** — um por Mega: fornecedor, nº do contrato, vigência (início → fim ou indeterminado), quantidade de geradores, valor do contrato e por equipamento, índice/mês de reajuste e pill de situação (vigente / a vencer em 90 dias / vencido / indeterminado).
2. **Escopo do contrato selecionado** — ao clicar num card, a tabela abaixo lista os itens daquele contrato: Escopo, Item, Tipo, Frequência, SLA (horas, quando houver) e Observação, com busca por texto e filtros de Tipo e Frequência.
3. **Comparar Megas** — alternador que troca a tabela por uma visão única de escopos com uma coluna por Mega marcando quem contempla cada item, para enxergar lacunas de cobertura.
4. Estados de carregamento, erro e vazio no padrão do app.

## Detalhes técnicos

- `src/pages/contratos/ContratosLista.tsx` passa a renderizar `Tabs` (shadcn) com o conteúdo atual em uma aba e o novo componente `src/components/contratos/GeradorPanel.tsx` na outra.
- Consulta do painel: `contratos` da categoria GERADOR + `contrato_escopos` (`ativo = true`) ordenados por `ordem`.
- Helpers de situação e formatação de moeda extraídos para `src/lib/contratos-utils.ts` e reaproveitados nas duas abas.
- Componentes canônicos: KpiCard, StatusPill, FilterToolbar, DataTable; datas via `formatBR`.
- Somente leitura nesta etapa (sem edição de escopo).

## Sobre o arquivo enviado

A planilha nova (`...MEGAS-2.xlsx`) não será importada aqui — a aba usa os dados já no banco. Se quiser atualizar a base com essa versão, faço em seguida.
