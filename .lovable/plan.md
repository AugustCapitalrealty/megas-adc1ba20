## O que está acontecendo (verificado no código e no banco)

**1. O status "Ativo" não olha a vigência.** Na lista de contratos (`ContratosTab.tsx`, linha 220) o badge vem só do campo `ativo` (interruptor "Contrato ativo" do formulário). O VALIDAR02 tem `vigencia_fim = 2026-06-25` e `ativo = true`, então aparece "Ativo" mesmo já encerrado.

**2. O módulo não aparece no novo contrato porque a tela esconde qualquer módulo já vinculado a outro contrato — sem olhar as datas.** Em `ContratosTab.tsx` (linhas 320-323) a lista de módulos remove todos os módulos que aparecem em vínculos de outros contratos. Como os módulos 1 e 2 estão no VALIDAR02 (até 25/06), eles somem do contrato da Tornado, mesmo com início em 26/06 — que é um período livre.

Confirmei no banco que a regra do servidor está correta: o gatilho de sobreposição usa intervalo de datas, então 01/01→25/06 e 26/06→… **não** conflitam. O bloqueio é só da tela.

## O que será feito

### 1. Status derivado da vigência
Substituir o badge único por status calculado:
- **Ativo** — `ativo = true` e hoje dentro da vigência
- **Encerrado** — `ativo = true` mas `vigencia_fim` já passou (com o texto "encerrado em 25/06/2026")
- **Futuro** — vigência ainda não começou
- **Inativo** — interruptor desligado

O filtro do topo ganha as opções correspondentes (Vigentes / Encerrados / Futuros / Inativos), e a coluna Vigência passa a exibir datas em dd/mm/aaaa.

### 2. Liberar módulos com vigência encerrada
A lista de módulos do formulário passa a considerar as datas: um módulo só é bloqueado se o vínculo do outro contrato **se sobrepõe** ao período que está sendo cadastrado (vigência padrão início/fim do formulário). Casos:
- Módulo livre no período → selecionável normalmente.
- Módulo ocupado no período → aparece desabilitado com a explicação "ocupado por VALIDAR02 até 25/06/2026", em vez de simplesmente sumir.
- Módulo com contrato anterior que já terminou → selecionável, com uma nota "livre a partir de 26/06/2026".

A lista se recalcula quando o usuário muda a vigência do contrato no formulário.

### 3. Aviso ao criar um contrato colado no anterior
Ao salvar, se o início escolhido invadir o fim de outro contrato do mesmo módulo, a mensagem de erro passa a dizer qual módulo e qual contrato conflita e até que data ele vai, em vez do genérico "vínculo sobreposto".

## Detalhes técnicos

- `src/components/admin/energia/ContratosTab.tsx`:
  - novo helper de status (`vigenciaStatus(contrato, hoje)`) usado no badge e no filtro;
  - `filteredModulos` troca o `Set` de "usados por outros" por um cálculo de sobreposição de `daterange` contra `vigInicio`/`vigFim` do formulário, guardando o conflito (contrato + data fim) para exibir no item;
  - checkbox desabilitado + tooltip quando há conflito real;
  - validação local antes do save, espelhando o gatilho do banco, com mensagem nomeando módulo e contrato.
- Sem mudança de schema e sem migração: o gatilho `check_energia_contrato_modulos_overlap` já trata datas corretamente.
