# App novo: SLA de Contratos

Quarto app do Hub (ao lado de Financeiro, Energia e Administração), em `/contratos`, com acesso controlado por `user_app_access` (nova chave `contratos`: leitor / editor / gestor).

## O que a planilha tem (12 abas = 12 categorias)

GERADOR · MOTOBOMBA A DIESEL · COBERTURA · ELÉTRICA · PPCI · CONTROLE DE PRAGAS · CONSULTORIA AMBIENTAL · ROÇADA · LIMPEZA E CONSERVAÇÃO · PORTARIA · SEGURANÇA E VIGILÂNCIA · LAUREANE

Cada aba tem o mesmo formato:

```text
                       | MEGA CURITIBA | MEGA ITAJAÍ | MEGA ESTEIO   <- 1 contrato por coluna
FORNECEDOR             | LCW           | MG GERADORES| LR GERADORES
Nº CONTRATO            | 2486.2024     | 2066.2023   |
DATA INÍCIO / PRAZO(m) | 10/04/2024 12 | 01/01/2026  | 01/12/2025
FIM                    | 10/04/2025    | 01/01/2027  | INDETERMINADO
QUANTIDADE (equip/m²)  | 4             | 3           | 3
VALOR CONTRATO / p/ equip.
ÍNDICE E MÊS DE REAJUSTE (IPCA / DEZEMBRO)
STATUS                 | Vencido       | Vigente     | Vigente
-----------------------------------------------------------------
ESCOPO | ITEM | TIPO | FREQUÊNCIA | CONTEMPLA (TRUE/FALSE por coluna)
```

Cada linha de escopo é uma obrigação: texto, item (GERADOR, MOTOR, TANQUE…), tipo (MANUTENÇÃO / VERIFICAÇÃO / INSPEÇÃO / DOCUMENTAÇÃO) e frequência (MENSAL, BIMESTRAL, TRIMESTRAL, QUADRIMESTRAL, SEMESTRAL, ANUAL, QUINZENAL, SOB DEMANDA). Só entram no contrato as linhas com CONTEMPLA = TRUE. Há também observações em coluna extra (ex.: definição de "sob demanda") e um item especial de SLA de emergência ("atendimento em até 2 horas").

## Modelo de dados

- `contrato_categorias` — as 12 categorias (nome, ícone, ordem, ativo).
- `contratos` — categoria, empreendimento, fornecedor (texto + link opcional a `fornecedores`), nº do contrato, data início, prazo em meses, data fim (ou indeterminado), quantidade + unidade (equipamentos ou m²), valor do contrato, valor por unidade, índice e mês de reajuste, status calculado (vigente / a vencer / vencido / indeterminado), observações.
- `contrato_escopos` — **lista própria de cada contrato** (escopo, item, tipo, frequência, observação, sla_horas quando for item de emergência, ativo). A importação só grava as linhas marcadas TRUE.
- `contrato_execucoes` — agenda gerada por frequência: escopo, competência/data prevista, status (pendente / executado / atrasado / não se aplica), data de execução, responsável, observação.
- `contrato_evidencias` — arquivos (relatório, ART, checklist, foto) anexados a uma execução, em bucket privado `contratos-evidencias`.
- `contrato_importacoes` — histórico de importações (arquivo, quem, quando, resumo de criados/atualizados).

RLS: leitura para quem tem o app `contratos`; escrita para editor/gestor; exclusão só gestor. GRANTs explícitos em todas as tabelas.

## Telas

1. **Início do app (`/contratos`)** — KPIs: contratos vigentes, a vencer em 90 dias, vencidos, execuções pendentes no mês, % de cumprimento do SLA. Grid por categoria mostrando o status dos 3 empreendimentos.
2. **Contratos (`/contratos/lista`)** — tabela filtrável (categoria, empreendimento, fornecedor, status) com valor, vigência, badge de vencimento e reajuste próximo.
3. **Detalhe do contrato** — cabeçalho com dados comerciais, aba **Escopo** (itens editáveis com tipo/frequência), aba **Agenda** (execuções previstas e realizadas), aba **Evidências**, aba **Histórico**.
4. **Agenda geral (`/contratos/agenda`)** — calendário/lista das obrigações do mês em todos os contratos, com marcar-como-executado e anexar evidência.
5. **Indicadores (`/contratos/indicadores`)** — cumprimento por fornecedor, por empreendimento e por categoria; atrasos e itens sem evidência.
6. **Importação (`/contratos/importar`)** — upload do `.xlsx`, leitura das 12 abas, preview por aba mostrando o que será criado/atualizado, e confirmação. Chave de deduplicação: categoria + empreendimento + nº do contrato (ou fornecedor quando não houver número).

## Importação

- Carga inicial: importo já os dados desta planilha no banco (categorias, contratos e escopos com CONTEMPLA = TRUE).
- Depois disso, a tela de importação faz a mesma leitura para atualizações futuras, sempre com preview antes de gravar e registro em `contrato_importacoes`.
- Regras de parsing: FIM = "INDETERMINADO"/"Indeterminado" vira contrato sem data fim; status é recalculado pela data (não confio no texto da planilha); valores monetários e datas normalizados; colunas de empreendimento vazias são ignoradas; abas sem escopo (ex.: MOTOBOMBA) criam só o contrato.

## Detalhes técnicos

- Parsing do `.xlsx` no browser com `xlsx` (SheetJS), sem backend.
- Geração da agenda: função utilitária `src/lib/contratos-agenda.ts` que expande frequência × vigência em datas previstas; "SOB DEMANDA" não gera agenda, só entra no checklist.
- Novo `AppKey` `contratos` em `src/lib/app-access.ts`, entrada em `src/lib/hub-apps.ts`, nav em `src/lib/hub-nav.ts`, rotas com `RequireApp` em `src/App.tsx`, e o app aparece no `AppAccessDialog` da Administração.
- Design segue os componentes canônicos (PageHeader, KpiCard, StatusPill, DataTable, FilterToolbar, StandardModal), Montserrat/laranja Mega, datas via `formatBR`.

## Entrega em duas etapas

1. Banco + importação + lista/detalhe de contratos com escopos (dados da planilha já dentro).
2. Agenda de execuções, evidências e indicadores de SLA.
