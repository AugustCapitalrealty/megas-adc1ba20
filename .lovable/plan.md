

# Estratégia: Sistema de Rateio entre Condomínios

## Visão Geral

O sistema precisa de 3 partes:
1. **Tabela de configuração** — áreas (m²) dos empreendimentos, editável pelo admin
2. **Campos na solicitação** — tipo de rateio (por unidade ou por %) e valores calculados
3. **Visualização no backoffice** — demonstrativo do rateio com exportação PDF

---

## Detalhes Técnicos

### 1. Nova tabela `rateio_configuracao`

Armazena a área de cada empreendimento (configurável pelo admin):

```text
rateio_configuracao
├── id (uuid, PK)
├── empreendimento (enum: mega_curitiba, mega_itajai, mega_esteio)
├── area_m2 (numeric) — ex: 120577.91
├── updated_at (timestamptz)
└── updated_by (uuid)
```

Valores iniciais:
- Mega Esteio: 24.294,66 m²
- Mega Itajaí: 108.165,91 m²
- Mega Curitiba: 120.577,91 m²

RLS: admin pode CRUD, demais leem.

### 2. Novos campos em `solicitacoes`

Quando `empreendimento = 'todos'`:

```text
tipo_rateio (text) — 'por_unidade' | 'por_area'
rateio_valores (jsonb) — snapshot calculado, ex:
  [
    { "empreendimento": "mega_esteio", "area_m2": 24294.66, "percentual": 9.60, "valor": 96.00 },
    { "empreendimento": "mega_itajai", "area_m2": 108165.91, "percentual": 42.75, "valor": 427.50 },
    { "empreendimento": "mega_curitiba", "area_m2": 120577.91, "percentual": 47.65, "valor": 476.50 }
  ]
```

### 3. Tela Admin — aba "Configurações de Rateio"

Nova aba no `/admin/usuarios` (ou nova seção):
- Tabela editável com empreendimento, área m², percentual calculado
- Botão salvar que atualiza a tabela `rateio_configuracao`

### 4. Formulário NovaSolicitação

Quando o solicitante seleciona `empreendimento = 'todos'`:
- Exibir seletor de tipo de rateio: "Por Unidade (igual)" ou "Por Área (proporcional)"
- Calcular automaticamente os valores por empreendimento
- Exibir preview da tabela de rateio antes de enviar
- Salvar o snapshot em `rateio_valores` no submit

### 5. Backoffice — seção de rateio no detalhe

Quando a solicitação tem `empreendimento = 'todos'`:
- Mostrar card "Demonstrativo de Rateio" com tabela:
  - Condomínio | Área (m²) | % | Valor (R$)
  - Linha de total
  - Indicação do tipo de rateio usado
- Botão "Baixar PDF" que gera o demonstrativo via jsPDF ou html2canvas

### 6. RPC `get_solicitacao_detalhes`

Adicionar `tipo_rateio` e `rateio_valores` ao retorno — já vêm automaticamente com `s.*`.

---

## Ordem de Implementação

1. Migração: criar tabela `rateio_configuracao` + adicionar colunas `tipo_rateio` e `rateio_valores` em `solicitacoes`
2. Seed dos dados iniciais de área
3. Tela Admin: aba de configuração de áreas
4. NovaSolicitação: seletor de tipo de rateio + preview quando `empreendimento = 'todos'`
5. Componente `RateioCard` para o backoffice com tabela + botão PDF
6. Integrar `RateioCard` no modal de detalhes do Backoffice

