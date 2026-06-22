## Objetivo

Eliminar a duplicação Cadastro ↔ Contratos: o **contrato vigente é a fonte única** de cliente e demanda contratada de cada módulo. O Cadastro de Módulos passa a tratar apenas atributos físicos.

## Mudanças

### 1. Cadastro de Módulos (`EnergiaCadastrosTab.tsx`)

A tabela "Módulos do Mega Curitiba" deixa de editar Cliente e Demanda. Passa a ter as colunas:

| Ordem | Identificador | Área (m²) | Cliente (vigente) | Demanda (vigente) | Contrato | Ativo | Ações |

- **Cliente (vigente)** e **Demanda (vigente)** são **read-only**, derivados do contrato vigente hoje (resolução igual à da Memória de Cálculo).
- **Contrato**: badge com `numero_contrato` + botão "Abrir contrato" que muda para a aba *Contratos* já filtrada por aquele contrato (via state local em `RateioEnergiaTab`).
- Quando não há contrato vigente: exibir badge cinza "Sem contrato" + link "Criar contrato".
- Remover os inputs/dropdowns de cliente e demanda da linha do módulo. O combobox `ClienteCombobox` deixa de ser usado para módulos (mantém para outras telas se houver).
- Form de "Novo módulo" pede só: ordem, identificador, área, ativo.

### 2. Contratos (`ContratosTab.tsx`)

- Aceitar prop opcional `initialFocusContratoId` para abrir já com aquele contrato selecionado/expandido (vindo do botão "Abrir contrato" do cadastro).
- Sem mudança funcional adicional.

### 3. Container (`RateioEnergiaTab.tsx` ou equivalente que monta as abas)

- Passa a controlar `activeTab` e `focusContratoId` por state. O botão "Abrir contrato" no Cadastro chama um callback que muda a aba para "Contratos" e seta o foco.

### 4. Banco de dados

- **Não remover** `energia_modulos.cliente_id` e `energia_modulos.demanda_contratada_kw` agora — ficam como legacy, ignorados pela UI. Evita migração arriscada e mantém rollback fácil.
- Marcar visualmente no código (comentário no tipo) que esses campos são legados.
- Em uma segunda fase (fora deste plano), depois de confirmar 1–2 meses sem regressão, dropar as colunas.

### 5. Lugares que ainda leem `modulo.cliente_id` / `modulo.demanda_contratada_kw`

Auditar e trocar pela resolução do contrato vigente (ou pelo mapa já existente `contratoPorModulo`):
- `MemoriaCalculoTab.tsx` — `saveConsumoCli` já usa contrato vigente; trocar o fallback `m.demanda_contratada_kw` por `0`.
- Card "Consumo por Cliente" — já usa `contratosVigentes` (feito no passo anterior).
- Qualquer outra ocorrência: ripgrep antes do build.

## UX resultante

- **Cadastro de Módulos**: tela enxuta sobre "o que existe fisicamente no terreno". Para saber quem ocupa cada módulo, o usuário olha — em leitura — a coluna "Cliente (vigente)" ou clica para abrir o contrato.
- **Contratos**: única tela onde se decide quem ocupa o quê, com qual demanda e por qual vigência. Editar contrato altera automaticamente o que aparece no Cadastro e na Memória.
- **Memória de Cálculo**: já consome contratos. Sem duplicidade.

## Fora de escopo

- Não dropar colunas legacy do banco neste passo.
- Não alterar telas de Cliente/Empreendimento.
- Sem mudança no Faturamento por Cliente.
