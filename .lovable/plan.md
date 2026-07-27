## Objetivo

No modal de contrato (Módulos vinculados), a lista deve refletir a realidade das vigências:

1. Módulos cujo contrato anterior já tem data de fim (ex.: 1 e 2, ocupados pela VALIDAR02 até 25/06/2026) devem aparecer **selecionáveis**, com a indicação "livre a partir de 26/06/2026".
2. Módulos ocupados por contrato **sem data de fim** (ocupação indefinida) **não aparecem na lista** — não há como liberá-los.

## O que muda

**Arquivo:** `src/components/admin/energia/ContratosTab.tsx`

### 1. Filtro da lista
- Um módulo é ocultado quando existe vínculo de outro contrato **sem `vigencia_fim`** e que já esteja vigente ou futuro (bloqueio permanente).
- Exceção: se o módulo já estiver marcado no contrato atual, ele continua aparecendo (para permitir desmarcar).

### 2. Módulos com fim definido = liberados
- Deixam de ser tratados como conflito bloqueante. O checkbox fica habilitado e a linha mostra "livre a partir de dd/mm/aaaa" em vez de "ocupado por X até dd/mm/aaaa".
- Ao marcar um desses módulos, a linha recebe automaticamente `vigencia_inicio` = dia seguinte ao fim da ocupação anterior (26/06/2026 no exemplo), em vez da vigência padrão do topo — evitando sobreposição.
- Se a vigência padrão já for posterior à liberação, mantém-se a padrão.

### 3. Validação ao salvar
- A checagem de sobreposição continua ativa: se o usuário editar manualmente a data de uma linha e criar conflito, o save bloqueia nomeando módulo, contrato e datas exatas.

### 4. Selecionar todos / contadores
- "Selecionar todos" passa a incluir os módulos liberados (usando a data de liberação por linha).
- Contador "N selecionado" inalterado.

## Detalhes técnicos

- `ocupacaoPorModulo` ganha dois derivados: `bloqueioIndefinido(moduloId)` (algum vínculo sem `vigencia_fim`) e `livreApartirDe(moduloId)` (já existe).
- `conflitoDoModulo` deixa de ser usada para desabilitar o checkbox; passa a ser usada apenas na validação de save e no aviso por linha.
- `filteredModulos` aplica o filtro de bloqueio indefinido antes da ordenação; a ordenação passa a ser: selecionados → livres imediatamente → livres a partir de data futura.
- `toggleModulo` recebe a data inicial calculada (`max(vigInicio, livreApartirDe)`).
